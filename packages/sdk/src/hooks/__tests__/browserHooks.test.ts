import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const browserRuntimeScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "lib",
  "browser-runtime.sh"
);
const browserExecutorScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "lib",
  "browser-executor.sh"
);
const nativeFinalizationScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "on-iteration-end",
  "native-finalization.sh"
);
const nativeOrchestratorScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "on-iteration-start",
  "native-orchestrator.sh"
);
const cleanupCompleteScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "on-run-complete",
  "browser-cleanup.sh"
);
const cleanupFailScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "on-run-fail",
  "browser-cleanup.sh"
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    })
  );
  tempDirs.length = 0;
});

async function mkTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runBashScript(scriptPath: string, cwd: string, stdin: string, env?: Record<string, string>, args: string[] = []) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd,
    input: stdin,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

function runBashCommand(command: string, cwd: string, env?: Record<string, string>) {
  return spawnSync("bash", ["-c", command], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

async function writeExecutable(filePath: string, contents: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
  await fs.chmod(filePath, 0o755);
}

async function createBrowserTask(runDir: string, effectId: string, browser: Record<string, unknown>) {
  const taskDir = path.join(runDir, "tasks", effectId);
  await fs.mkdir(taskDir, { recursive: true });
  await fs.writeFile(
    path.join(taskDir, "task.json"),
    JSON.stringify({ kind: "browser", browser }, null, 2),
    "utf8"
  );
}

describe("browser hook runtime + orchestration", () => {
  test("runtime selection auto mode falls back to host on unsupported platforms", async () => {
    const tempRoot = await mkTempDir("browser-runtime-auto-host-");
    const fakeBin = path.join(tempRoot, "bin");
    await fs.mkdir(fakeBin, { recursive: true });

    await writeExecutable(
      path.join(fakeBin, "uname"),
      [
        "#!/usr/bin/env bash",
        'if [[ "${1:-}" == "-s" ]]; then echo "Linux"; elif [[ "${1:-}" == "-m" ]]; then echo "x86_64"; else echo "Linux"; fi',
      ].join("\n")
    );
    await writeExecutable(path.join(fakeBin, "agent-browser"), "#!/usr/bin/env bash\nexit 0\n");

    const result = runBashCommand(
      `source "${browserRuntimeScript}" && brt_select_backend auto`,
      tempRoot,
      { PATH: `${fakeBin}:${process.env.PATH ?? ""}` }
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout.trim()) as {
      backend: string | null;
      reason: string;
      checks: { supportedMacArm64: boolean; hostReady: boolean; containerReady: boolean };
    };
    expect(payload.backend).toBe("host");
    expect(payload.reason).toBe("auto-host-fallback");
    expect(payload.checks.supportedMacArm64).toBe(false);
    expect(payload.checks.hostReady).toBe(true);
    expect(payload.checks.containerReady).toBe(false);
  });

  test("runtime selection container mode fails when container runtime is unavailable", async () => {
    const tempRoot = await mkTempDir("browser-runtime-container-fail-");
    const fakeBin = path.join(tempRoot, "bin");
    await fs.mkdir(fakeBin, { recursive: true });
    await writeExecutable(path.join(fakeBin, "agent-browser"), "#!/usr/bin/env bash\nexit 0\n");

    const result = runBashCommand(
      `source "${browserRuntimeScript}" && brt_select_backend container`,
      tempRoot,
      { PATH: `${fakeBin}:${process.env.PATH ?? ""}` }
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout.trim()) as { backend: string | null; error: string | null; reason: string };
    expect(payload.backend).toBeNull();
    expect(payload.reason).toBe("container-unavailable");
    expect(payload.error).toContain("Apple Container runtime is unavailable");
  });

  test("browser executor reuses run-scoped session ids across effects", async () => {
    const tempRoot = await mkTempDir("browser-executor-session-");
    const runId = "run-browser-session";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const fakeBin = path.join(tempRoot, "bin");
    const sessionLog = path.join(tempRoot, "agent-browser-sessions.log");

    await fs.mkdir(fakeBin, { recursive: true });
    await writeExecutable(
      path.join(fakeBin, "agent-browser"),
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'session=""',
        "while [[ $# -gt 0 ]]; do",
        '  if [[ "$1" == "--session" ]]; then',
        '    session="$2"',
        "    shift 2",
        "    continue",
        "  fi",
        "  shift",
        "done",
        'echo "$session" >> "$AGENT_BROWSER_SESSION_LOG"',
        "echo '{\"ok\":true}'",
      ].join("\n")
    );

    await createBrowserTask(runDir, "effect-browser-1", {
      prompt: "Open first page and summarize",
      runtime: "host",
      sessionMode: "run",
      output: "json",
    });
    await createBrowserTask(runDir, "effect-browser-2", {
      prompt: "Open second page and summarize",
      runtime: "host",
      sessionMode: "run",
      output: "json",
    });

    const env = {
      PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
      AGENT_BROWSER_SESSION_LOG: sessionLog,
    };

    const first = runBashScript(
      browserExecutorScript,
      tempRoot,
      "",
      env,
      ["--run-id", runId, "--effect-id", "effect-browser-1", "--run-dir", runDir]
    );
    const second = runBashScript(
      browserExecutorScript,
      tempRoot,
      "",
      env,
      ["--run-id", runId, "--effect-id", "effect-browser-2", "--run-dir", runDir]
    );

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);

    const sessions = (await fs.readFile(sessionLog, "utf8")).trim().split("\n");
    expect(sessions.length).toBe(2);
    expect(sessions[0]).toBe(sessions[1]);

    const state = JSON.parse(
      await fs.readFile(path.join(runDir, "state", "browser-runtime.json"), "utf8")
    ) as { sessionId: string; backend: string };
    expect(state.sessionId).toBe(sessions[0]);
    expect(state.backend).toBe("host");
  });

  test("browser executor falls back from container to host in auto mode when container execution fails", async () => {
    const tempRoot = await mkTempDir("browser-executor-fallback-");
    const runId = "run-browser-fallback";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const fakeBin = path.join(tempRoot, "bin");

    await fs.mkdir(fakeBin, { recursive: true });
    await writeExecutable(
      path.join(fakeBin, "uname"),
      [
        "#!/usr/bin/env bash",
        'if [[ "${1:-}" == "-s" ]]; then echo "Darwin"; elif [[ "${1:-}" == "-m" ]]; then echo "arm64"; else echo "Darwin"; fi',
      ].join("\n")
    );
    await writeExecutable(
      path.join(fakeBin, "sw_vers"),
      [
        "#!/usr/bin/env bash",
        'if [[ "${1:-}" == "-productVersion" ]]; then echo "15.0.0"; else echo "ProductVersion:\\t15.0.0"; fi',
      ].join("\n")
    );
    await writeExecutable(
      path.join(fakeBin, "container"),
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'if [[ "${1:-}" == "system" && "${2:-}" == "start" ]]; then exit 0; fi',
        'if [[ "${1:-}" == "exec" ]]; then echo "container exec failed" >&2; exit 9; fi',
        "exit 0",
      ].join("\n")
    );
    await writeExecutable(path.join(fakeBin, "agent-browser"), "#!/usr/bin/env bash\necho '{\"ok\":true}'\n");

    await createBrowserTask(runDir, "effect-browser-fallback", {
      prompt: "Open page using auto runtime",
      runtime: "auto",
      sessionMode: "run",
      output: "json",
    });

    const result = runBashScript(
      browserExecutorScript,
      tempRoot,
      "",
      { PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
      ["--run-id", runId, "--effect-id", "effect-browser-fallback", "--run-dir", runDir]
    );

    expect(result.status).toBe(0);
    const metadata = JSON.parse(
      await fs.readFile(path.join(runDir, "tasks", "effect-browser-fallback", "browser-metadata.json"), "utf8")
    ) as {
      selectedBackend: string | null;
      effectiveBackend: string | null;
      fallback: { used: boolean; reason: string | null };
    };
    expect(metadata.selectedBackend).toBe("container");
    expect(metadata.effectiveBackend).toBe("host");
    expect(metadata.fallback.used).toBe(true);
    expect(metadata.fallback.reason).toBe("container-runtime-failed-fallback-host");
  });

  test("browser executor fails in strict container mode when container runtime is unavailable", async () => {
    const tempRoot = await mkTempDir("browser-executor-container-strict-");
    const runId = "run-browser-container-strict";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const fakeBin = path.join(tempRoot, "bin");

    await fs.mkdir(fakeBin, { recursive: true });
    await writeExecutable(path.join(fakeBin, "agent-browser"), "#!/usr/bin/env bash\necho '{\"ok\":true}'\n");

    await createBrowserTask(runDir, "effect-browser-strict", {
      prompt: "Open page in strict container mode",
      runtime: "container",
      sessionMode: "run",
    });

    const result = runBashScript(
      browserExecutorScript,
      tempRoot,
      "",
      { PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
      ["--run-id", runId, "--effect-id", "effect-browser-strict", "--run-dir", runDir]
    );

    expect(result.status).not.toBe(0);
    const errorPayload = JSON.parse(
      await fs.readFile(path.join(runDir, "tasks", "effect-browser-strict", "browser-error.json"), "utf8")
    ) as { message: string };
    expect(errorPayload.message).toContain("Apple Container runtime is unavailable");
  });

  test("native finalization considers pending browser tasks auto-runnable", async () => {
    const tempRoot = await mkTempDir("browser-finalization-");
    const fakeBin = path.join(tempRoot, "bin");
    await fs.mkdir(fakeBin, { recursive: true });

    await writeExecutable(
      path.join(fakeBin, "npx"),
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'cmd="${3:-}"',
        'if [[ "$cmd" == "run:status" ]]; then',
        "  cat <<'JSON'",
        '{"state":"waiting","metadata":{"pendingEffectsByKind":{"browser":1}}}',
        "JSON",
        "  exit 0",
        "fi",
        'if [[ "$cmd" == "task:list" ]]; then',
        "  cat <<'JSON'",
        '{"tasks":[{"effectId":"effect-browser","kind":"browser"}]}',
        "JSON",
        "  exit 0",
        "fi",
        "echo '{}' ",
      ].join("\n")
    );

    const payload = JSON.stringify({
      runId: "run-browser-finalization",
      iteration: 1,
      status: "executed",
      timestamp: "2026-02-13T00:00:00Z",
    });
    const result = runBashScript(
      nativeFinalizationScript,
      tempRoot,
      payload,
      { PATH: `${fakeBin}:${process.env.PATH ?? ""}` }
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as { needsMoreIterations: boolean; pendingEffects: number };
    expect(output.pendingEffects).toBe(1);
    expect(output.needsMoreIterations).toBe(true);
  });

  test("native orchestrator executes mixed node + browser effects and posts results", async () => {
    const tempRoot = await mkTempDir("browser-orchestrator-mixed-");
    const runId = "run-browser-mixed";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const fakeBin = path.join(tempRoot, "bin");
    const postsLog = path.join(tempRoot, "task-posts.log");

    await fs.mkdir(path.join(runDir, "scripts"), { recursive: true });
    await fs.mkdir(fakeBin, { recursive: true });

    await fs.writeFile(
      path.join(runDir, "scripts", "node-task.js"),
      [
        "if (!process.env.BABYSITTER_OUTPUT_JSON) {",
        "  throw new Error('BABYSITTER_OUTPUT_JSON is required');",
        "}",
        "console.log('node-task-ok');",
      ].join("\n"),
      "utf8"
    );

    await fs.mkdir(path.join(runDir, "tasks", "effect-node"), { recursive: true });
    await fs.writeFile(
      path.join(runDir, "tasks", "effect-node", "task.json"),
      JSON.stringify(
        {
          kind: "node",
          node: {
            entry: path.join(runDir, "scripts", "node-task.js"),
          },
          io: {
            outputJsonPath: "tasks/effect-node/output.json",
            stdoutPath: "tasks/effect-node/stdout.log",
            stderrPath: "tasks/effect-node/stderr.log",
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await createBrowserTask(runDir, "effect-browser", {
      prompt: "Open page and summarize",
      runtime: "host",
      sessionMode: "run",
      output: "json",
    });

    await writeExecutable(path.join(fakeBin, "agent-browser"), "#!/usr/bin/env bash\necho '{\"ok\":true,\"source\":\"browser\"}'\n");
    await writeExecutable(
      path.join(fakeBin, "npx"),
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'cmd="${3:-}"',
        'if [[ "$cmd" == "run:status" ]]; then',
        "  cat <<'JSON'",
        '{"state":"waiting"}',
        "JSON",
        "  exit 0",
        "fi",
        'if [[ "$cmd" == "task:list" ]]; then',
        "  cat <<'JSON'",
        '{"tasks":[{"effectId":"effect-node","kind":"node","label":"node-task"},{"effectId":"effect-browser","kind":"browser","label":"browser-task"}]}',
        "JSON",
        "  exit 0",
        "fi",
        'if [[ "$cmd" == "task:post" ]]; then',
        '  effect_id="${5:-unknown}"',
        '  status_value="unknown"',
        '  read_error_stdin="false"',
        "  for ((i=1; i<=$#; i++)); do",
        '    if [[ "${!i}" == "--status" ]]; then',
        "      j=$((i+1))",
        '      status_value="${!j}"',
        "    fi",
        '    if [[ "${!i}" == "--error" ]]; then',
        "      j=$((i+1))",
        '      if [[ "${!j}" == "-" ]]; then',
        '        read_error_stdin="true"',
        "      fi",
        "    fi",
        "  done",
        '  echo "${effect_id}:${status_value}" >> "${NPX_POSTS_LOG}"',
        '  if [[ "$read_error_stdin" == "true" ]]; then',
        "    cat >/dev/null || true",
        "  fi",
        "  exit 0",
        "fi",
        "echo '{}'",
      ].join("\n")
    );

    const payload = JSON.stringify({
      runId,
      iteration: 1,
      status: "waiting",
      timestamp: "2026-02-13T00:00:00Z",
    });
    const result = runBashScript(
      nativeOrchestratorScript,
      tempRoot,
      payload,
      {
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        NPX_POSTS_LOG: postsLog,
      }
    );

    expect(result.status).toBe(0);
    const trimmed = result.stdout.trim();
    const start = trimmed.lastIndexOf("\n{");
    const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
    const output = JSON.parse(jsonText) as { action: string; count: number; reason: string };
    expect(output.action).toBe("executed-tasks");
    expect(output.count).toBe(2);
    expect(output.reason).toBe("auto-runnable-tasks");

    const posts = (await fs.readFile(postsLog, "utf8")).trim().split("\n").sort();
    expect(posts).toEqual(["effect-browser:ok", "effect-node:ok"]);
  });

  test("browser cleanup removes runtime state by default and preserves it when configured", async () => {
    const tempRoot = await mkTempDir("browser-cleanup-");
    const runId = "run-browser-cleanup";
    const runStateDir = path.join(tempRoot, ".a5c", "runs", runId, "state");
    const stateFile = path.join(runStateDir, "browser-runtime.json");
    await fs.mkdir(runStateDir, { recursive: true });
    await fs.writeFile(
      stateFile,
      JSON.stringify({ backend: "host", sessionId: "run-session" }),
      "utf8"
    );

    const removeResult = runBashScript(
      cleanupCompleteScript,
      tempRoot,
      JSON.stringify({ runId, status: "completed" })
    );
    expect(removeResult.status).toBe(0);
    await expect(fs.stat(stateFile)).rejects.toThrow();

    await fs.mkdir(runStateDir, { recursive: true });
    await fs.writeFile(
      stateFile,
      JSON.stringify({ backend: "host", sessionId: "run-session" }),
      "utf8"
    );

    const preserveResult = runBashScript(
      cleanupFailScript,
      tempRoot,
      JSON.stringify({ runId, status: "failed" }),
      { BABYSITTER_BROWSER_PRESERVE_RUNTIME: "true" }
    );
    expect(preserveResult.status).toBe(0);
    const preserved = JSON.parse(await fs.readFile(stateFile, "utf8")) as { sessionId: string };
    expect(preserved.sessionId).toBe("run-session");
  });
});
