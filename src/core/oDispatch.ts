import * as fs from 'fs';
import * as path from 'path';

import type { PtyProcess } from './ptyProcess';
import { spawnPtyProcess } from './ptyProcess';

export type DispatchNewRunOptions = {
  oBinaryPath: string;
  workspaceRoot: string;
  runsRootPath: string;
  prompt: string;
  env?: NodeJS.ProcessEnv;
  /**
   * Called immediately after spawning the interactive `o` process.
   * The returned handle can be used to send ESC/ENTER via stdin (PTY).
   */
  onProcess?: (process: PtyProcess) => void;
  /**
   * Time to wait for the `o` process to print the run id/path.
   */
  runInfoTimeoutMs?: number;
};

export type DispatchNewRunResult = {
  runId: string;
  runRootPath: string;
  stdout: string;
  stderr: string;
  pid?: number;
};

export type ResumeExistingRunOptions = {
  oBinaryPath: string;
  workspaceRoot: string;
  runsRootPath: string;
  runId: string;
  prompt: string;
  env?: NodeJS.ProcessEnv;
  /**
   * Called immediately after spawning the interactive `o` process.
   * The returned handle can be used to send ESC/ENTER via stdin (PTY).
   */
  onProcess?: (process: PtyProcess) => void;
  /**
   * Time to wait for the `o` process to print initial output (or for the process to exit).
   */
  runInfoTimeoutMs?: number;
};

export type ResumeExistingRunResult = {
  runId: string;
  runRootPath: string;
  stdout: string;
  stderr: string;
  pid?: number;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function extractRunIdFromText(text: string): string | undefined {
  // Current `o` run ids are typically `run-YYYYMMDD-HHMMSS` (optionally with an extra suffix).
  // Keep the older `YYYYMMDD-HHMMSS-...` matcher for backwards compatibility.
  const match =
    text.match(/\brun-\d{8}-\d{6}(?:-[A-Za-z0-9_]+)?\b/) ??
    text.match(/\b\d{8}-\d{6}-\w+\b/);
  return match?.[0];
}

function isLikelyPathToken(token: string): boolean {
  if (token.includes(path.sep)) return true;
  if (process.platform === 'win32' && token.includes('/')) return true;
  return token.startsWith('.') || token.startsWith('/') || /^[A-Za-z]:[\\/]/.test(token);
}
function trimToken(token: string): string {
  return token.replace(/^['"(\[]+/, '').replace(/[\])'",.]+$/, '');
}
function extractRunRootPathFromText(text: string, runId: string, cwd: string): string | undefined {
  const tokens = text
    .split(/\s+/)
    .map(trimToken)
    .filter((t) => t.length > 0);
  const candidates: string[] = [];
  for (const token of tokens) {
    if (!token.includes(runId)) continue;
    if (!isLikelyPathToken(token)) continue;
    candidates.push(token);
  }

  for (const raw of candidates) {
    const resolved = path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);
    try {
      if (fs.statSync(resolved).isDirectory()) return resolved;
    } catch {
      // ignore
    }
  }

  return undefined;
}

function parseDispatchedRunInfo(
  stdout: string,
  stderr: string,
  workspaceRoot: string,
  runsRootPath: string,
): { runId: string; runRootPath: string } | undefined {
  const combined = `${stdout}\n${stderr}`;
  const runId = extractRunIdFromText(combined);
  if (!runId) return undefined;

  const runRootFromOutput =
    extractRunRootPathFromText(stdout, runId, workspaceRoot) ??
    extractRunRootPathFromText(stderr, runId, workspaceRoot);
  const fallback = path.join(runsRootPath, runId);
  return { runId, runRootPath: runRootFromOutput ?? fallback };
}

function parseResumedRunInfo(params: {
  stdout: string;
  stderr: string;
  runId: string;
  workspaceRoot: string;
  runsRootPath: string;
}): { runId: string; runRootPath: string } {
  const runRootFromOutput =
    extractRunRootPathFromText(params.stdout, params.runId, params.workspaceRoot) ??
    extractRunRootPathFromText(params.stderr, params.runId, params.workspaceRoot);
  const fallback = path.join(params.runsRootPath, params.runId);
  return { runId: params.runId, runRootPath: runRootFromOutput ?? fallback };
}

export async function dispatchNewRunViaO(
  options: DispatchNewRunOptions,
): Promise<DispatchNewRunResult> {
  const timeoutMs = options.runInfoTimeoutMs ?? 30_000;
  const deferred = createDeferred<DispatchNewRunResult>();

  const child = spawnPtyProcess(options.oBinaryPath, [options.prompt], {
    cwd: options.workspaceRoot,
    ...(options.env ? { env: options.env } : {}),
  });
  options.onProcess?.(child);

  let stdout = '';
  const stderr = '';
  let settled = false;
  let pendingTimer: NodeJS.Timeout | undefined;
  let pendingInfo: { runId: string; runRootPath: string } | undefined;

  const trySettle = (): void => {
    if (settled) return;
    const info = parseDispatchedRunInfo(
      stdout,
      stderr,
      options.workspaceRoot,
      options.runsRootPath,
    );
    if (!info) return;
    pendingInfo = info;
    if (pendingTimer) return;

    // Small grace period to allow both stdout/stderr to flush initial lines.
    pendingTimer = setTimeout(() => {
      pendingTimer = undefined;
      if (settled || !pendingInfo) return;
      settled = true;
      const result: DispatchNewRunResult = { ...pendingInfo, stdout, stderr };
      if (child.pid !== undefined) result.pid = child.pid;
      deferred.resolve(result);
    }, 25);
  };

  // PTYs expose a single data stream; capture everything as stdout.
  const disposeData = child.onData((chunk: string) => {
    stdout += chunk;
    trySettle();
  });

  const disposeExit = child.onExit(({ exitCode, signal }) => {
    if (settled) return;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    const info =
      parseDispatchedRunInfo(stdout, stderr, options.workspaceRoot, options.runsRootPath) ??
      pendingInfo;
    if (info) {
      settled = true;
      const result: DispatchNewRunResult = { ...info, stdout, stderr };
      if (child.pid !== undefined) result.pid = child.pid;
      deferred.resolve(result);
      return;
    }

    const details = [
      `code=${exitCode}`,
      `signal=${signal}`,
      `stdout=${stdout.trim() ? '(captured)' : '(empty)'}`,
      `stderr=${stderr.trim() ? '(captured)' : '(empty)'}`,
    ].join(', ');
    const err = new Error(`\`o\` exited before a run id/path could be parsed (${details}).`);
    (err as { stdout?: string; stderr?: string }).stdout = stdout;
    (err as { stdout?: string; stderr?: string }).stderr = stderr;
    settled = true;
    deferred.reject(err);
  });

  const timer = setTimeout(() => {
    if (settled) return;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    settled = true;
    const err = new Error(
      `Timed out waiting for \`o\` to report a run id/path after ${timeoutMs}ms.`,
    );
    (err as { stdout?: string; stderr?: string }).stdout = stdout;
    (err as { stdout?: string; stderr?: string }).stderr = stderr;
    deferred.reject(err);
  }, timeoutMs);

  try {
    return await deferred.promise;
  } finally {
    clearTimeout(timer);
    disposeData();
    disposeExit();
  }
}

export async function resumeExistingRunViaO(
  options: ResumeExistingRunOptions,
): Promise<ResumeExistingRunResult> {
  const timeoutMs = options.runInfoTimeoutMs ?? 30_000;
  const deferred = createDeferred<ResumeExistingRunResult>();

  const child = spawnPtyProcess(options.oBinaryPath, [options.runId, options.prompt], {
    cwd: options.workspaceRoot,
    ...(options.env ? { env: options.env } : {}),
  });
  options.onProcess?.(child);

  let stdout = '';
  const stderr = '';
  let settled = false;
  let pendingTimer: NodeJS.Timeout | undefined;
  let spawnFallbackTimer: NodeJS.Timeout | undefined;

  const settle = (): void => {
    if (settled) return;
    settled = true;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    if (spawnFallbackTimer) {
      clearTimeout(spawnFallbackTimer);
      spawnFallbackTimer = undefined;
    }

    const info = parseResumedRunInfo({
      stdout,
      stderr,
      runId: options.runId,
      workspaceRoot: options.workspaceRoot,
      runsRootPath: options.runsRootPath,
    });
    const result: ResumeExistingRunResult = { ...info, stdout, stderr };
    if (child.pid !== undefined) result.pid = child.pid;
    deferred.resolve(result);
  };

  const trySettleSoon = (): void => {
    if (settled) return;
    if (pendingTimer) return;
    pendingTimer = setTimeout(() => {
      pendingTimer = undefined;
      settle();
    }, 25);
  };

  // In resume mode we already know the run id, and `o` may not print it quickly.
  // Resolve after a short delay even if we can't parse a run root from output yet.
  spawnFallbackTimer = setTimeout(() => {
    settle();
  }, 1000);

  const disposeData = child.onData((chunk: string) => {
    stdout += chunk;
    trySettleSoon();
  });

  const disposeExit = child.onExit(({ exitCode, signal }) => {
    if (settled) return;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    if (spawnFallbackTimer) {
      clearTimeout(spawnFallbackTimer);
      spawnFallbackTimer = undefined;
    }

    // If `o` exits quickly, treat non-zero exit as failure.
    if (exitCode !== 0) {
      const details = [
        `code=${exitCode}`,
        `signal=${signal}`,
        `stdout=${stdout.trim() ? '(captured)' : '(empty)'}`,
        `stderr=${stderr.trim() ? '(captured)' : '(empty)'}`,
      ].join(', ');
      const err = new Error(`\`o\` exited while resuming ${options.runId} (${details}).`);
      (err as { stdout?: string; stderr?: string }).stdout = stdout;
      (err as { stdout?: string; stderr?: string }).stderr = stderr;
      settled = true;
      deferred.reject(err);
      return;
    }

    settle();
  });

  const timer = setTimeout(() => {
    if (settled) return;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    if (spawnFallbackTimer) {
      clearTimeout(spawnFallbackTimer);
      spawnFallbackTimer = undefined;
    }
    settled = true;
    const err = new Error(
      `Timed out waiting for \`o\` to start resuming ${options.runId} after ${timeoutMs}ms.`,
    );
    (err as { stdout?: string; stderr?: string }).stdout = stdout;
    (err as { stdout?: string; stderr?: string }).stderr = stderr;
    deferred.reject(err);
  }, timeoutMs);

  try {
    return await deferred.promise;
  } finally {
    clearTimeout(timer);
    disposeData();
    disposeExit();
  }
}
