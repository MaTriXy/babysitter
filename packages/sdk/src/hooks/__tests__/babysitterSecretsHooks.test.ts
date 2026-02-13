import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const secretsGuardScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "on-run-complete",
  "secrets-guard.sh"
);
const stopHookScript = path.join(
  repoRoot,
  "plugins",
  "babysitter",
  "hooks",
  "babysitter-stop-hook.sh"
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

function runBash(
  scriptPath: string,
  cwd: string,
  stdin: string,
  env?: Record<string, string>
) {
  return spawnSync("bash", [scriptPath], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    input: stdin,
    encoding: "utf8",
  });
}

describe("babysitter secrets hooks", () => {
  test("on-run-complete secrets guard writes warning artifacts when a secret is detected", async () => {
    const tempRoot = await mkTempDir("babysitter-secrets-guard-");
    const runId = "run-secret-found";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const taskDir = path.join(runDir, "tasks", "t1");
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(
      path.join(taskDir, "result.json"),
      JSON.stringify({ token: "ghp_abcdefghijklmnopqrstuvwxyz123456" }),
      "utf8"
    );

    const payload = JSON.stringify({ runId, status: "completed" });
    const result = runBash(secretsGuardScript, tempRoot, payload);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("WARNING:");

    const reportJsonPath = path.join(
      runDir,
      "artifacts",
      "security",
      "secrets-detected.json"
    );
    const reportMdPath = path.join(
      runDir,
      "artifacts",
      "security",
      "secrets-warning.md"
    );

    const reportJsonRaw = await fs.readFile(reportJsonPath, "utf8");
    const reportJson = JSON.parse(reportJsonRaw) as {
      runId: string;
      findings: number;
      items: Array<{ file: string; pattern: string; lines: string }>;
    };
    const reportMd = await fs.readFile(reportMdPath, "utf8");

    expect(reportJson.runId).toBe(runId);
    expect(reportJson.findings).toBeGreaterThan(0);
    expect(reportJson.items[0]?.file).toContain("result.json");
    expect(reportMd).toContain("Potential Secrets Detected");
  });

  test("on-run-complete secrets guard removes stale warning artifacts when no secret is present", async () => {
    const tempRoot = await mkTempDir("babysitter-secrets-clean-");
    const runId = "run-no-secret";
    const runDir = path.join(tempRoot, ".a5c", "runs", runId);
    const taskDir = path.join(runDir, "tasks", "t1");
    const reportDir = path.join(runDir, "artifacts", "security");
    const reportJsonPath = path.join(reportDir, "secrets-detected.json");
    const reportMdPath = path.join(reportDir, "secrets-warning.md");

    await fs.mkdir(taskDir, { recursive: true });
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(
      path.join(taskDir, "result.json"),
      JSON.stringify({ ok: true }),
      "utf8"
    );
    await fs.writeFile(reportJsonPath, JSON.stringify({ stale: true }), "utf8");
    await fs.writeFile(reportMdPath, "stale report", "utf8");

    const payload = JSON.stringify({ runId, status: "completed" });
    const result = runBash(secretsGuardScript, tempRoot, payload);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("No potential secrets found");

    await expect(fs.stat(reportJsonPath)).rejects.toThrow();
    await expect(fs.stat(reportMdPath)).rejects.toThrow();
  });

  test("stop hook injects a user warning when secrets report exists on completed run", async () => {
    const tempRoot = await mkTempDir("babysitter-stop-hook-");
    const runId = "run-completed-with-secrets";
    const sessionId = "session-test";
    const completionSecret = "secret-token-123";

    const runSecurityDir = path.join(
      tempRoot,
      ".a5c",
      "runs",
      runId,
      "artifacts",
      "security"
    );
    await fs.mkdir(runSecurityDir, { recursive: true });
    await fs.writeFile(
      path.join(runSecurityDir, "secrets-detected.json"),
      JSON.stringify({
        runId,
        findings: 2,
        items: [{ file: "src/unsafe.ts", pattern: "GitHub token", lines: "4" }],
      }),
      "utf8"
    );

    const pluginRoot = path.join(tempRoot, "plugin-root");
    const stateDir = path.join(pluginRoot, "skills", "babysit", "state");
    const hooksDir = path.join(pluginRoot, "hooks");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.mkdir(hooksDir, { recursive: true });

    await fs.writeFile(
      path.join(stateDir, `${sessionId}.md`),
      [
        "---",
        "iteration: 1",
        "max_iterations: 10",
        `run_id: "${runId}"`,
        "started_at: 2026-02-13T00:00:00Z",
        "last_iteration_at: 2026-02-13T00:05:00Z",
        "iteration_times: 16,17,18",
        "---",
        "continue the run",
      ].join("\n"),
      "utf8"
    );

    const transcriptPath = path.join(tempRoot, "transcript.jsonl");
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "text", text: "final summary without promise tag" }] },
      }) + "\n",
      "utf8"
    );

    const fakeBinDir = path.join(tempRoot, "bin");
    await fs.mkdir(fakeBinDir, { recursive: true });
    const fakeNpxPath = path.join(fakeBinDir, "npx");
    await fs.writeFile(
      fakeNpxPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "cat <<'JSON'",
        JSON.stringify({ state: "completed", completionSecret, pendingByKind: {} }),
        "JSON",
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeNpxPath, 0o755);

    const hookInput = JSON.stringify({
      session_id: sessionId,
      transcript_path: transcriptPath,
    });

    const result = runBash(stopHookScript, tempRoot, hookInput, {
      CLAUDE_PLUGIN_ROOT: pluginRoot,
      PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
    });

    expect(result.status).toBe(0);
    const outputJson = JSON.parse(result.stdout.trim()) as {
      decision: string;
      systemMessage: string;
    };
    expect(outputJson.decision).toBe("block");
    expect(outputJson.systemMessage).toContain("Secret scan found 2 potential secret exposure");
    expect(outputJson.systemMessage).toContain("not to commit");
  });
});
