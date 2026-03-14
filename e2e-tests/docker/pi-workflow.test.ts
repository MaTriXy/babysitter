/**
 * Pi harness full workflow E2E tests.
 *
 * Exercises the complete babysitter orchestration lifecycle the way
 * oh-my-pi actually uses it: through the Pi extension modules
 * (session-binder, sdk-bridge, loop-driver, effect-executor, guards).
 *
 * Since the Docker image runs Node.js 20 (no --experimental-strip-types),
 * we can't import the extension TypeScript source directly. Instead, each
 * test calls the EXACT SDK functions Pi calls, in the EXACT order Pi calls
 * them, with inline implementations of Pi's higher-level logic (guard
 * checks, continuation prompts, promise-tag extraction) so we're verifying
 * the real Pi flow end-to-end.
 *
 * No LLM / API key required -- effects are manually resolved.
 *
 * Module mapping (test -> Pi extension source):
 *   createRun          -> session-binder.ts:bindRun
 *   orchestrateIteration -> sdk-bridge.ts:iterate
 *   commitEffectResult -> sdk-bridge.ts:postResult / effect-executor.ts:postEffectResult
 *   deriveRunStatus    -> sdk-bridge.ts:getRunStatus
 *   checkGuards        -> guards.ts:checkGuards
 *   buildPrompt        -> loop-driver.ts:buildContinuationPrompt
 *   extractPromiseTag  -> loop-driver.ts:extractPromiseTag
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  buildImage,
  dockerExec,
  startContainer,
  stopContainer,
} from "./helpers";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

// Ensure NODE_PATH includes the global npm root so process files and
// inline scripts can resolve '@a5c-ai/babysitter-sdk'.
const NP = "export NODE_PATH=$(npm root -g) &&";

/** Counter to create unique script filenames inside the container. */
let scriptCounter = 0;

/**
 * Run an inline Node.js script inside the Docker container that uses
 * the babysitter SDK directly (the way Pi does it via sdk-bridge.ts).
 *
 * Writes the script to a temp file and executes it via `node`, avoiding
 * shell quoting issues with `node -e` and multiline scripts.
 * Returns parsed JSON from stdout.
 */
function runSdkScript<T = unknown>(script: string, timeout = 30_000): T {
  const scriptFile = `/tmp/_pi_test_${++scriptCounter}.js`;

  // Write script to a temp file inside the container using heredoc
  dockerExec(
    `cat > ${scriptFile} << 'SDKSCRIPTEOF'\n${script}\nSDKSCRIPTEOF`,
  );

  // Execute the script with NODE_PATH set
  const out = dockerExec(
    `${NP} node ${scriptFile}`,
    { timeout },
  ).trim();

  // Find and parse the last JSON object in the output
  const lastBrace = out.lastIndexOf("}");
  if (lastBrace === -1) throw new SyntaxError(`No JSON in output: ${out}`);
  let depth = 0;
  for (let i = lastBrace; i >= 0; i--) {
    if (out[i] === "}") depth++;
    if (out[i] === "{") depth--;
    if (depth === 0) return JSON.parse(out.slice(i, lastBrace + 1)) as T;
  }
  throw new SyntaxError(`Unmatched braces in output: ${out}`);
}

beforeAll(() => {
  buildImage(ROOT);
  startContainer();
}, 300_000);

afterAll(() => {
  stopContainer();
});

// ============================================================================
// /babysitter:call full flow simulation
// ============================================================================
// Simulates: index.ts registerCommand('babysitter:call') handler
//   -> session-binder.ts:bindRun()
//   -> sdk-bridge.ts:iterate()
//   -> loop-driver.ts:buildContinuationPrompt()
//   -> [agent executes effects]
//   -> loop-driver.ts:onAgentEnd() (repeat)
//   -> completion

describe("Pi /babysitter:call full orchestration flow", () => {
  const tag = `pi-call-${Date.now()}`;
  let runDir: string;
  let effectId: string;

  test("session-binder.bindRun: create run via SDK and persist state", () => {
    const procDir = `/tmp/${tag}`;
    dockerExec(`mkdir -p ${procDir}`);

    // A process with one node task
    dockerExec(
      `cat > ${procDir}/proc.js << 'PROCEOF'
const { defineTask } = require('@a5c-ai/babysitter-sdk');

const echoTask = defineTask('echo', (args, taskCtx) => ({
  kind: 'node',
  title: 'Echo task',
  node: { script: 'echo-script.js', args: [args.message] },
  io: {
    inputJsonPath: 'tasks/' + taskCtx.effectId + '/input.json',
    outputJsonPath: 'tasks/' + taskCtx.effectId + '/output.json',
  },
}));

exports.process = async function process(inputs, ctx) {
  const result = await ctx.task(echoTask, { message: inputs.message });
  return { status: 'success', echo: result.echo };
};
PROCEOF`,
    );

    // session-binder.bindRun() calls createRun() then persists RunState
    const result = runSdkScript<{
      runId: string;
      runDir: string;
      hasRunJson: boolean;
      hasJournal: boolean;
    }>(`
      const { createRun } = require('@a5c-ai/babysitter-sdk');
      const fs = require('fs');
      const path = require('path');

      (async () => {
        // createRun -- same as session-binder.bindRun() line 179
        const result = await createRun({
          runsDir: '/tmp/${tag}/runs',
          process: {
            processId: 'pi-echo',
            importPath: '/tmp/${tag}/proc.js',
            exportName: 'process',
          },
          inputs: { message: 'hello-pi' },
          prompt: 'pi lifecycle test',
        });

        // session-binder.bindRun() then creates RunState and persists to disk
        // (we verify the SDK-level outputs that the binder depends on)
        const runState = {
          sessionId: 'test-session-1',
          runId: result.runId,
          runDir: result.runDir,
          iteration: 0,
          maxIterations: 256,
          iterationTimes: [],
          startedAt: new Date().toISOString(),
          processId: 'pi-echo',
          status: 'idle',
        };

        // Persist state to disk (simulating session-binder.persistState)
        const stateDir = '/tmp/${tag}/state';
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(
          path.join(stateDir, 'test-session-1.json'),
          JSON.stringify(runState, null, 2),
        );

        console.log(JSON.stringify({
          runId: result.runId,
          runDir: result.runDir,
          hasRunJson: fs.existsSync(path.join(result.runDir, 'run.json')),
          hasJournal: fs.existsSync(path.join(result.runDir, 'journal')),
        }));
      })();
    `);

    expect(result.runId).toBeTruthy();
    expect(result.runDir).toBeTruthy();
    expect(result.hasRunJson).toBe(true);
    expect(result.hasJournal).toBe(true);
    runDir = result.runDir;
  });

  test("sdk-bridge.iterate: first iteration produces pending effect", () => {
    // sdk-bridge.iterate() calls orchestrateIteration({ runDir })
    const result = runSdkScript<{
      status: string;
      nextActions: Array<{ effectId: string; kind: string; title: string }>;
    }>(`
      const { orchestrateIteration } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const result = await orchestrateIteration({
          runDir: '${runDir}',
        });
        console.log(JSON.stringify({
          status: result.status,
          nextActions: (result.nextActions || []).map(a => ({
            effectId: a.effectId,
            kind: a.kind,
            title: a.taskDef?.title || a.label || '',
          })),
        }));
      })();
    `);

    expect(result.status).toBe("waiting");
    expect(result.nextActions.length).toBe(1);
    expect(result.nextActions[0].kind).toBe("node");
    effectId = result.nextActions[0].effectId;
  });

  test("loop-driver.buildContinuationPrompt: produces correct prompt format", () => {
    // Verify the continuation prompt Pi would inject via sendUserMessage
    // This mirrors loop-driver.ts:buildContinuationPrompt()
    const result = runSdkScript<{
      hasRunId: boolean;
      hasIteration: boolean;
      hasPendingCount: boolean;
      hasEffectId: boolean;
      hasKindInstruction: boolean;
    }>(`
      const { orchestrateIteration } = require('@a5c-ai/babysitter-sdk');

      // Inline buildContinuationPrompt from loop-driver.ts
      function buildContinuationPrompt(iterResult, runState) {
        const actions = iterResult.nextActions;
        const header =
          '[babysitter] Iteration ' + runState.iteration + ' | Run ' + runState.runId + ' | Continue orchestration';

        if (actions.length === 0) {
          return header + '\\n\\nNo pending effects. Waiting for external resolution.';
        }

        const effectLines = actions.map((action, idx) => {
          const title = (action.taskDef && action.taskDef.title) || action.label || '(effect ' + action.effectId + ')';
          return '  ' + (idx + 1) + '. [' + action.kind + '] ' + title + '  (effectId: ' + action.effectId + ')';
        });

        const instructionsByKind = {
          node: 'Execute the Node.js task and capture its output.',
          shell: 'Run the shell command and capture stdout/stderr.',
          agent: 'Delegate to a sub-agent and collect its response.',
          breakpoint: 'This is a human approval gate. Approve or reject to continue.',
          sleep: 'Wait for the specified duration, then post an OK result.',
        };

        const uniqueKinds = [...new Set(actions.map(a => a.kind))];
        const instructions = uniqueKinds
          .map(kind => '  - ' + kind + ': ' + (instructionsByKind[kind] || 'Handle the "' + kind + '" effect.'))
          .join('\\n');

        return [header, '', 'Pending effects (' + actions.length + '):', ...effectLines, '', 'Instructions by effect kind:', instructions, '', 'Execute the effects, post results, then stop.'].join('\\n');
      }

      (async () => {
        const iter = await orchestrateIteration({ runDir: '${runDir}' });
        const prompt = buildContinuationPrompt(iter, { runId: 'test-run', iteration: 1 });

        console.log(JSON.stringify({
          hasRunId: prompt.includes('test-run'),
          hasIteration: prompt.includes('Iteration 1'),
          hasPendingCount: prompt.includes('Pending effects (1)'),
          hasEffectId: prompt.includes('${effectId}'),
          hasKindInstruction: prompt.includes('Execute the Node.js task'),
        }));
      })();
    `);

    expect(result.hasRunId).toBe(true);
    expect(result.hasIteration).toBe(true);
    expect(result.hasPendingCount).toBe(true);
    expect(result.hasEffectId).toBe(true);
    expect(result.hasKindInstruction).toBe(true);
  });

  test("effect-executor.postEffectResult: resolve effect via commitEffectResult", () => {
    // effect-executor.postEffectResult calls commitEffectResult
    const result = runSdkScript<{ resolved: boolean }>(`
      const { commitEffectResult } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        await commitEffectResult({
          runDir: '${runDir}',
          effectId: '${effectId}',
          result: {
            status: 'ok',
            value: { echo: 'hello-pi' },
          },
        });
        console.log(JSON.stringify({ resolved: true }));
      })();
    `);

    expect(result.resolved).toBe(true);
  });

  test("loop-driver.onAgentEnd: next iteration completes the run", () => {
    // onAgentEnd calls iterate(), checks result status
    const result = runSdkScript<{
      status: string;
      hasOutput: boolean;
    }>(`
      const { orchestrateIteration } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const result = await orchestrateIteration({ runDir: '${runDir}' });
        console.log(JSON.stringify({
          status: result.status,
          hasOutput: result.output !== undefined,
        }));
      })();
    `);

    expect(result.status).toBe("completed");
    expect(result.hasOutput).toBe(true);
  });

  test("sdk-bridge.getRunStatus: derives correct status from journal", () => {
    // sdk-bridge.getRunStatus reads journal and computes status/pending effects
    const result = runSdkScript<{
      status: string;
      pendingCount: number;
      eventTypes: string[];
    }>(`
      const { loadJournal } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const journal = await loadJournal('${runDir}');

        // Derive status exactly as sdk-bridge.getRunStatus() does
        let status = 'running';
        for (const entry of journal) {
          if (entry.type === 'RUN_COMPLETED') status = 'completed';
          else if (entry.type === 'RUN_FAILED') status = 'failed';
        }

        const resolved = new Set();
        const requested = new Set();
        for (const entry of journal) {
          const data = entry.data || {};
          if (entry.type === 'EFFECT_RESOLVED') resolved.add(data.effectId);
          if (entry.type === 'EFFECT_REQUESTED') requested.add(data.effectId);
        }
        const pendingCount = [...requested].filter(id => !resolved.has(id)).length;

        console.log(JSON.stringify({
          status,
          pendingCount,
          eventTypes: journal.map(e => e.type),
        }));
      })();
    `);

    expect(result.status).toBe("completed");
    expect(result.pendingCount).toBe(0);
    expect(result.eventTypes[0]).toBe("RUN_CREATED");
    expect(result.eventTypes).toContain("EFFECT_REQUESTED");
    expect(result.eventTypes).toContain("EFFECT_RESOLVED");
    expect(result.eventTypes).toContain("RUN_COMPLETED");
  });

  test("session-binder: persisted state can be recovered", () => {
    // session-binder.initSession() loads persisted state from disk
    const result = runSdkScript<{
      recovered: boolean;
      sessionId: string;
      processId: string;
    }>(`
      const fs = require('fs');
      const path = require('path');

      // initSession reads from state dir
      const stateDir = '/tmp/${tag}/state';
      const stateFile = path.join(stateDir, 'test-session-1.json');
      let recovered = false;
      let sessionId = '';
      let processId = '';

      try {
        const raw = fs.readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(raw);
        if (state.sessionId && state.runId && state.runDir) {
          recovered = true;
          sessionId = state.sessionId;
          processId = state.processId;
        }
      } catch {}

      console.log(JSON.stringify({ recovered, sessionId, processId }));
    `);

    expect(result.recovered).toBe(true);
    expect(result.sessionId).toBe("test-session-1");
    expect(result.processId).toBe("pi-echo");
  });
});

// ============================================================================
// loop-driver.extractPromiseTag: completion proof extraction
// ============================================================================

describe("Pi loop-driver: promise tag extraction", () => {
  test("extracts promise tag from agent output", () => {
    const result = runSdkScript<{
      withTag: string | null;
      withoutTag: string | null;
      empty: string | null;
      multiTag: string | null;
    }>(`
      // Inline extractPromiseTag from loop-driver.ts
      function extractPromiseTag(text) {
        const match = /<promise>([^<]+)<\\/promise>/.exec(text);
        return match ? match[1] : null;
      }

      console.log(JSON.stringify({
        withTag: extractPromiseTag('Some output <promise>abc123secret</promise> more text'),
        withoutTag: extractPromiseTag('Just regular output with no special tags'),
        empty: extractPromiseTag('<promise></promise>'),
        multiTag: extractPromiseTag('<promise>first</promise> <promise>second</promise>'),
      }));
    `);

    expect(result.withTag).toBe("abc123secret");
    expect(result.withoutTag).toBeNull();
    expect(result.empty).toBeNull(); // regex requires [^<]+
    expect(result.multiTag).toBe("first"); // returns first match
  });
});

// ============================================================================
// guards.checkGuards: iteration safety checks
// ============================================================================

describe("Pi guards: iteration safety", () => {
  test("passes for fresh state, trips on max iterations", () => {
    const result = runSdkScript<{
      freshPassed: boolean;
      maxIterPassed: boolean;
      maxIterReason: string;
    }>(`
      // Inline guard check logic from guards.ts
      const MAX_ITERATIONS_DEFAULT = 256;
      const DOOM_LOOP_THRESHOLD = 3;
      const DOOM_LOOP_MIN_DURATION_MS = 2000;

      function checkGuards(runState) {
        const maxIter = runState.maxIterations || MAX_ITERATIONS_DEFAULT;
        if (runState.iteration >= maxIter) {
          return { passed: false, reason: 'Maximum iterations reached (' + runState.iteration + ' >= ' + maxIter + ')' };
        }
        return { passed: true };
      }

      const freshState = {
        iteration: 0,
        maxIterations: 256,
        iterationTimes: [],
        startedAt: new Date().toISOString(),
      };
      const freshResult = checkGuards(freshState);

      const maxState = {
        iteration: 256,
        maxIterations: 256,
        iterationTimes: [],
        startedAt: new Date().toISOString(),
      };
      const maxResult = checkGuards(maxState);

      console.log(JSON.stringify({
        freshPassed: freshResult.passed,
        maxIterPassed: maxResult.passed,
        maxIterReason: maxResult.reason || '',
      }));
    `);

    expect(result.freshPassed).toBe(true);
    expect(result.maxIterPassed).toBe(false);
    expect(result.maxIterReason).toContain("Maximum iterations");
  });

  test("detects doom loop from fast iterations", () => {
    const result = runSdkScript<{
      slowLoop: boolean;
      fastLoop: boolean;
      tooFew: boolean;
    }>(`
      const DOOM_LOOP_THRESHOLD = 3;
      const DOOM_LOOP_MIN_DURATION_MS = 2000;

      function isDoomLoop(iterationTimes) {
        if (iterationTimes.length < DOOM_LOOP_THRESHOLD) return false;
        const recent = iterationTimes.slice(-DOOM_LOOP_THRESHOLD);
        return recent.every(t => t < DOOM_LOOP_MIN_DURATION_MS);
      }

      console.log(JSON.stringify({
        slowLoop: isDoomLoop([5000, 5000, 5000]),     // slow -- not a doom loop
        fastLoop: isDoomLoop([100, 100, 100]),         // fast -- doom loop
        tooFew: isDoomLoop([100, 100]),                // too few iterations
      }));
    `);

    expect(result.slowLoop).toBe(false);
    expect(result.fastLoop).toBe(true);
    expect(result.tooFew).toBe(false);
  });
});

// ============================================================================
// Multi-task sequential: full onAgentEnd loop
// ============================================================================
// Simulates multiple iterations of the onAgentEnd loop with two sequential
// tasks, as if the Pi extension were driving the orchestration.

describe("Pi onAgentEnd loop: multi-task sequential", () => {
  const tag = `pi-loop-${Date.now()}`;
  let runDir: string;

  test("full onAgentEnd loop resolves two tasks and completes", () => {
    const procDir = `/tmp/${tag}`;
    dockerExec(`mkdir -p ${procDir}`);

    dockerExec(
      `cat > ${procDir}/proc.js << 'PROCEOF'
const { defineTask } = require('@a5c-ai/babysitter-sdk');

const stepA = defineTask('step-a', (args, taskCtx) => ({
  kind: 'node',
  title: 'Step A',
  node: { script: 'a.js' },
  io: {
    inputJsonPath: 'tasks/' + taskCtx.effectId + '/input.json',
    outputJsonPath: 'tasks/' + taskCtx.effectId + '/output.json',
  },
}));

const stepB = defineTask('step-b', (args, taskCtx) => ({
  kind: 'node',
  title: 'Step B',
  node: { script: 'b.js' },
  io: {
    inputJsonPath: 'tasks/' + taskCtx.effectId + '/input.json',
    outputJsonPath: 'tasks/' + taskCtx.effectId + '/output.json',
  },
}));

exports.process = async function process(inputs, ctx) {
  const a = await ctx.task(stepA, { n: 1 });
  const b = await ctx.task(stepB, { n: 2 });
  return { total: a.value + b.value };
};
PROCEOF`,
    );

    // Full onAgentEnd loop simulation:
    // 1. bindRun (createRun)
    // 2. First iterate in /babysitter:call handler
    // 3. Loop: onAgentEnd -> checkGuards -> iterate -> resolve effects -> repeat
    const result = runSdkScript<{
      finalStatus: string;
      iterations: number;
      resolvedEffects: string[];
      guardsPassed: boolean[];
      continuationPrompts: number;
      runDir: string;
    }>(`
      const {
        createRun,
        orchestrateIteration,
        commitEffectResult,
      } = require('@a5c-ai/babysitter-sdk');

      // Inline guard check (guards.ts:checkGuards)
      function checkGuards(state) {
        if (state.iteration >= state.maxIterations) {
          return { passed: false, reason: 'Max iterations' };
        }
        return { passed: true };
      }

      (async () => {
        // === /babysitter:call handler (index.ts line 162) ===
        // Step 1: bindRun (session-binder.ts)
        const run = await createRun({
          runsDir: '/tmp/${tag}/runs',
          process: {
            processId: 'pi-loop',
            importPath: '/tmp/${tag}/proc.js',
            exportName: 'process',
          },
          inputs: {},
          prompt: 'multi-task loop test',
        });

        // RunState (session-binder.ts:RunState)
        const runState = {
          sessionId: 'loop-session',
          runId: run.runId,
          runDir: run.runDir,
          iteration: 0,
          maxIterations: 256,
          iterationTimes: [],
          startedAt: new Date().toISOString(),
          processId: 'pi-loop',
          status: 'idle',
        };

        const resolvedEffects = [];
        const guardsPassed = [];
        let continuationPrompts = 0;
        let finalStatus = 'unknown';

        // Step 2: First iterate (index.ts line 176)
        let iter = await orchestrateIteration({ runDir: run.runDir });
        runState.iteration += 1;
        runState.iterationTimes.push(0);

        // === onAgentEnd loop (loop-driver.ts:onAgentEnd) ===
        for (let loop = 0; loop < 20; loop++) {
          if (iter.status === 'completed') {
            finalStatus = 'completed';
            break;
          }
          if (iter.status === 'failed') {
            finalStatus = 'failed';
            break;
          }

          // Step 3: Build continuation prompt (loop-driver.ts:buildContinuationPrompt)
          if (iter.status === 'waiting' && iter.nextActions && iter.nextActions.length > 0) {
            continuationPrompts++;

            // Step 4: Resolve effects (effect-executor.ts:postEffectResult)
            for (const action of iter.nextActions) {
              await commitEffectResult({
                runDir: run.runDir,
                effectId: action.effectId,
                result: { status: 'ok', value: { value: 10 } },
              });
              resolvedEffects.push(action.effectId);
            }
          }

          // Step 5: Guard check (guards.ts:checkGuards)
          const guard = checkGuards(runState);
          guardsPassed.push(guard.passed);
          if (!guard.passed) {
            finalStatus = 'guard-tripped';
            break;
          }

          // Step 6: Next iteration (loop-driver.ts:onAgentEnd -> iterate)
          iter = await orchestrateIteration({ runDir: run.runDir });
          runState.iteration += 1;
          runState.iterationTimes.push(0);
        }

        console.log(JSON.stringify({
          finalStatus,
          iterations: runState.iteration,
          resolvedEffects,
          guardsPassed,
          continuationPrompts,
          runDir: run.runDir,
        }));
      })();
    `, 60_000);

    expect(result.finalStatus).toBe("completed");
    expect(result.resolvedEffects.length).toBe(2);
    expect(result.iterations).toBeGreaterThanOrEqual(3);
    expect(result.guardsPassed.every((g: boolean) => g === true)).toBe(true);
    expect(result.continuationPrompts).toBe(2); // one per task
    runDir = result.runDir;
  });

  test("journal records complete lifecycle", () => {
    const result = runSdkScript<{
      requested: number;
      resolved: number;
      hasCreated: boolean;
      hasCompleted: boolean;
    }>(`
      const { loadJournal } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const journal = await loadJournal('${runDir}');
        const types = journal.map(e => e.type);
        console.log(JSON.stringify({
          requested: types.filter(t => t === 'EFFECT_REQUESTED').length,
          resolved: types.filter(t => t === 'EFFECT_RESOLVED').length,
          hasCreated: types.includes('RUN_CREATED'),
          hasCompleted: types.includes('RUN_COMPLETED'),
        }));
      })();
    `);

    expect(result.requested).toBe(2);
    expect(result.resolved).toBe(2);
    expect(result.hasCreated).toBe(true);
    expect(result.hasCompleted).toBe(true);
  });
});

// ============================================================================
// Immediate completion (process with no tasks)
// ============================================================================

describe("Pi immediate completion: no-task process", () => {
  test("completes on first iteration from /babysitter:call", () => {
    const tag = `pi-notask-${Date.now()}`;
    const procDir = `/tmp/${tag}`;
    dockerExec(`mkdir -p ${procDir}`);

    dockerExec(
      `printf '%s' 'exports.process = async function(inputs, ctx) { return { ok: true }; };' > ${procDir}/proc.js`,
    );

    // Simulates: /babysitter:call -> bindRun -> iterate -> completed immediately
    // (index.ts line 187: iterResult.status === 'completed')
    const result = runSdkScript<{
      status: string;
      hasOutput: boolean;
    }>(`
      const { createRun, orchestrateIteration } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const run = await createRun({
          runsDir: '/tmp/${tag}/runs',
          process: {
            processId: 'pi-notask',
            importPath: '/tmp/${tag}/proc.js',
            exportName: 'process',
          },
          inputs: {},
          prompt: 'immediate completion test',
        });

        const iter = await orchestrateIteration({ runDir: run.runDir });
        console.log(JSON.stringify({
          status: iter.status,
          hasOutput: iter.output !== undefined,
        }));
      })();
    `);

    expect(result.status).toBe("completed");
    expect(result.hasOutput).toBe(true);
  });
});

// ============================================================================
// Completion proof via run metadata
// ============================================================================

describe("Pi completion proof from run metadata", () => {
  test("proof stored at creation time is retrievable after completion", () => {
    const tag = `pi-proof-${Date.now()}`;
    const procDir = `/tmp/${tag}`;
    dockerExec(`mkdir -p ${procDir}`);

    dockerExec(
      `printf '%s' 'exports.process = async function(inputs, ctx) { return { ok: true }; };' > ${procDir}/proc.js`,
    );

    // completionProof is stored in run.json at creation and resolved via
    // resolveCompletionProof(metadata) in the CLI layer
    const result = runSdkScript<{
      status: string;
      metadataProof: string;
      journalHasCompleted: boolean;
    }>(`
      const {
        createRun,
        orchestrateIteration,
        readRunMetadata,
        loadJournal,
      } = require('@a5c-ai/babysitter-sdk');

      (async () => {
        const run = await createRun({
          runsDir: '/tmp/${tag}/runs',
          process: {
            processId: 'pi-proof',
            importPath: '/tmp/${tag}/proc.js',
            exportName: 'process',
          },
          inputs: {},
          prompt: 'proof test',
        });

        await orchestrateIteration({ runDir: run.runDir });
        const metadata = await readRunMetadata(run.runDir);
        const journal = await loadJournal(run.runDir);

        console.log(JSON.stringify({
          status: 'completed',
          metadataProof: metadata.completionProof || '',
          journalHasCompleted: journal.some(e => e.type === 'RUN_COMPLETED'),
        }));
      })();
    `);

    expect(result.journalHasCompleted).toBe(true);
    expect(result.metadataProof).toBeTruthy();
    expect(result.metadataProof.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Status transitions through the Pi lifecycle
// ============================================================================

describe("Pi status transitions: created -> waiting -> completed", () => {
  test("getRunStatus returns correct state at each phase", () => {
    const tag = `pi-trans-${Date.now()}`;
    const procDir = `/tmp/${tag}`;
    dockerExec(`mkdir -p ${procDir}`);

    dockerExec(
      `cat > ${procDir}/proc.js << 'PROCEOF'
const { defineTask } = require('@a5c-ai/babysitter-sdk');
const t = defineTask('work', (args, taskCtx) => ({
  kind: 'node',
  title: 'Work',
  node: { script: 'w.js' },
  io: {
    inputJsonPath: 'tasks/' + taskCtx.effectId + '/input.json',
    outputJsonPath: 'tasks/' + taskCtx.effectId + '/output.json',
  },
}));
exports.process = async function(inputs, ctx) {
  const r = await ctx.task(t, {});
  return { done: true };
};
PROCEOF`,
    );

    // sdk-bridge.getRunStatus derives status from journal events
    const result = runSdkScript<{
      afterCreate: string;
      afterIterate: string;
      pendingAfterIterate: number;
      afterComplete: string;
      pendingAfterComplete: number;
    }>(`
      const {
        createRun,
        orchestrateIteration,
        commitEffectResult,
        loadJournal,
      } = require('@a5c-ai/babysitter-sdk');

      // Inline getRunStatus logic from sdk-bridge.ts
      function deriveStatus(journal) {
        let status = 'running';
        for (const entry of journal) {
          if (entry.type === 'RUN_COMPLETED') status = 'completed';
          else if (entry.type === 'RUN_FAILED') status = 'failed';
        }
        return status;
      }

      function countPending(journal) {
        const resolved = new Set();
        const requested = new Set();
        for (const entry of journal) {
          const data = entry.data || {};
          if (entry.type === 'EFFECT_RESOLVED') resolved.add(data.effectId);
          if (entry.type === 'EFFECT_REQUESTED') requested.add(data.effectId);
        }
        return [...requested].filter(id => !resolved.has(id)).length;
      }

      (async () => {
        // Phase 1: After createRun (bindRun)
        const run = await createRun({
          runsDir: '/tmp/${tag}/runs',
          process: {
            processId: 'pi-trans',
            importPath: '/tmp/${tag}/proc.js',
            exportName: 'process',
          },
          inputs: {},
          prompt: 'transition test',
        });

        const j1 = await loadJournal(run.runDir);
        const afterCreate = deriveStatus(j1);

        // Phase 2: After first iterate (has pending effects)
        const iter1 = await orchestrateIteration({ runDir: run.runDir });
        const j2 = await loadJournal(run.runDir);
        const afterIterate = deriveStatus(j2);
        const pendingAfterIterate = countPending(j2);

        // Phase 3: Resolve effect and iterate -> completed
        const effectId = iter1.nextActions[0].effectId;
        await commitEffectResult({
          runDir: run.runDir,
          effectId,
          result: { status: 'ok', value: { ok: true } },
        });
        await orchestrateIteration({ runDir: run.runDir });
        const j3 = await loadJournal(run.runDir);
        const afterComplete = deriveStatus(j3);
        const pendingAfterComplete = countPending(j3);

        console.log(JSON.stringify({
          afterCreate,
          afterIterate,
          pendingAfterIterate,
          afterComplete,
          pendingAfterComplete,
        }));
      })();
    `, 60_000);

    expect(result.afterCreate).toBe("running"); // only RUN_CREATED
    expect(result.afterIterate).toBe("running"); // has pending, no terminal event
    expect(result.pendingAfterIterate).toBe(1);
    expect(result.afterComplete).toBe("completed");
    expect(result.pendingAfterComplete).toBe(0);
  });
});
