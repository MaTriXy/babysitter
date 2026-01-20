/**
 * run:iterate command - Execute one orchestration iteration
 *
 * This command:
 * 1. Calls on-iteration-start hooks to get orchestration decisions
 * 2. Returns effects to stdout as JSON
 * 3. External orchestrator (skill) performs the effects
 * 4. Calls on-iteration-end hooks for finalization
 *
 * The command does NOT loop - it handles exactly one iteration.
 */

import * as path from "path";
import { readRunMetadata } from "../../storage/runFiles";
import { callRuntimeHook } from "../../runtime/hooks/runtime";
import { orchestrateIteration } from "../../runtime/orchestrateIteration";
import type { EffectAction } from "../../runtime/types";

export interface RunIterateOptions {
  runDir: string;
  iteration?: number;
  verbose?: boolean;
  json?: boolean;
}

export interface RunIterateResult {
  iteration: number;
  status: "executed" | "waiting" | "completed" | "failed" | "none";
  action?: string;
  reason?: string;
  count?: number;
  until?: number;
  nextActions?: EffectAction[];
  metadata?: {
    runId: string;
    processId: string;
    hookStatus?: string;
  };
}

export async function runIterate(options: RunIterateOptions): Promise<RunIterateResult> {
  const { runDir, verbose } = options;

  // Read run metadata
  const metadata = await readRunMetadata(runDir);
  const runId = metadata.runId;

  // Determine iteration number
  // TODO: Read from state.json or journal
  const iteration = options.iteration ?? 1;

  const projectRoot = path.dirname(path.dirname(path.dirname(runDir)));

  if (verbose) {
    console.error(`[run:iterate] Starting iteration ${iteration} for run ${runId}`);
  }

  // === Call on-iteration-start hook ===
  // Hook analyzes state and returns orchestration decisions
  const iterationStartPayload = {
    runId,
    iteration,
    timestamp: new Date().toISOString(),
  };

  const hookResult = await callRuntimeHook(
    "on-iteration-start",
    iterationStartPayload,
    {
      cwd: projectRoot,
      logger: verbose ? ((msg: string) => console.error(msg)) : undefined,
    }
  );

  // If no hooks executed, fall back to running one real orchestration step (runtime iteration).
  // This ensures `run:iterate` works even without a plugin install / hooks configuration.
  if (!hookResult.executedHooks?.length) {
    const iterationResult = await orchestrateIteration({ runDir });
    const status: RunIterateResult["status"] =
      iterationResult.status === "waiting"
        ? "waiting"
        : iterationResult.status === "completed"
          ? "completed"
          : "failed";

    // Still call on-iteration-end (will be a no-op if no hooks are installed).
    await callRuntimeHook(
      "on-iteration-end",
      {
        runId,
        iteration,
        action: status === "waiting" ? "waiting" : "none",
        status,
        reason: "no-hooks-fallback",
        count: iterationResult.status === "waiting" ? iterationResult.nextActions.length : undefined,
        timestamp: new Date().toISOString(),
      },
      {
        cwd: projectRoot,
        logger: verbose ? ((msg: string) => console.error(msg)) : undefined,
      }
    );

    return {
      iteration,
      status,
      action: status === "waiting" ? "waiting" : "none",
      reason: "no-hooks-fallback",
      count: iterationResult.status === "waiting" ? iterationResult.nextActions.length : undefined,
      nextActions: iterationResult.status === "waiting" ? iterationResult.nextActions : undefined,
      metadata: {
        runId,
        processId: metadata.processId,
        hookStatus: "none",
      },
    };
  }

  // Parse hook output
  let hookDecision: any = {};
  if (hookResult.output) {
    try {
      hookDecision = typeof hookResult.output === "string"
        ? JSON.parse(hookResult.output)
        : hookResult.output;
    } catch (e) {
      if (verbose) {
        console.error(`[run:iterate] Warning: Could not parse hook output:`, hookResult.output);
      }
    }
  }

  const action = hookDecision.action || "none";
  const reason = hookDecision.reason || "unknown";
  const count = hookDecision.count;
  const until = hookDecision.until;

  if (verbose) {
    console.error(`[run:iterate] Hook action: ${action}, reason: ${reason}${count ? `, count: ${count}` : ""}`);
  }

  // Determine result status based on hook action
  let status: RunIterateResult["status"];

  // Check for terminal state first
  if (reason === "terminal-state") {
    status = hookDecision.status === "failed" ? "failed" : "completed";
  } else if (action === "executed-tasks") {
    status = "executed";
  } else if (action === "waiting") {
    status = "waiting";
  } else if (action === "none") {
    status = "none";
  } else {
    // Default to none for unknown actions
    status = "none";
  }

  // === Call on-iteration-end hook ===
  const iterationEndPayload = {
    runId,
    iteration,
    action,
    status,
    reason,
    count,
    timestamp: new Date().toISOString(),
  };

  await callRuntimeHook(
    "on-iteration-end",
    iterationEndPayload,
    {
      cwd: projectRoot,
      logger: verbose ? ((msg: string) => console.error(msg)) : undefined,
    }
  );

  // Return result
  const result: RunIterateResult = {
    iteration,
    status,
    action,
    reason,
    count,
    until,
    metadata: {
      runId,
      processId: metadata.processId,
      hookStatus: hookResult.executedHooks?.length > 0 ? "executed" : "none",
    },
  };

  return result;
}
