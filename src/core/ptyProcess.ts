import * as path from 'path';

import * as pty from 'node-pty';

export type PtyExitEvent = { exitCode: number; signal: number };

export type PtyProcess = {
  pid: number;
  write: (data: string) => void;
  onData: (handler: (data: string) => void) => () => void;
  onExit: (handler: (event: PtyExitEvent) => void) => () => void;
  kill: () => void;
  /**
   * Removes listeners but does not terminate the underlying process.
   * Useful when the extension is deactivating and should not implicitly kill `o`.
   */
  detach: () => void;
  dispose: () => void;
};

export type SpawnPtyOptions = {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
  name?: string;
};

function isWindowsCmdScript(filePath: string, platform: NodeJS.Platform): boolean {
  if (platform !== 'win32') return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.cmd' || ext === '.bat';
}

function quoteCmdArg(arg: string): string {
  if (!arg) return '""';
  if (!/[ \t"]/g.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

function toCmdExeInvocation(filePath: string, args: string[]): { file: string; args: string[] } {
  // Always quote the command path so the /c string starts with a quote.
  const quotedCommand = `"${filePath.replace(/"/g, '""')}"`;
  const cmdLine = [quotedCommand, ...args.map(quoteCmdArg)].join(' ');
  // Pass the command line as a single argument after /c; it already contains the required quoting.
  return { file: 'cmd.exe', args: ['/d', '/s', '/c', cmdLine] };
}

export function spawnPtyProcess(filePath: string, args: string[], options: SpawnPtyOptions): PtyProcess {
  const invocation = isWindowsCmdScript(filePath, process.platform) ? toCmdExeInvocation(filePath, args) : undefined;
  const ptyProcess = pty.spawn(invocation?.file ?? filePath, invocation?.args ?? args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    cols: options.cols ?? 120,
    rows: options.rows ?? 30,
    name: options.name ?? 'xterm-256color',
  });

  const dataHandlers = new Set<(data: string) => void>();
  const exitHandlers = new Set<(event: PtyExitEvent) => void>();

  const dataDisposable = ptyProcess.onData((data) => {
    for (const handler of dataHandlers) handler(data);
  });
  const exitDisposable = ptyProcess.onExit((event) => {
    for (const handler of exitHandlers) handler({ exitCode: event.exitCode, signal: event.signal ?? 0 });
  });

  let disposed = false;
  const detach = (): void => {
    if (disposed) return;
    disposed = true;
    dataHandlers.clear();
    exitHandlers.clear();
    dataDisposable.dispose();
    exitDisposable.dispose();
  };

  return {
    pid: ptyProcess.pid,
    write: (data: string) => {
      if (disposed) return;
      ptyProcess.write(data);
    },
    onData: (handler) => {
      if (disposed) return () => undefined;
      dataHandlers.add(handler);
      return () => dataHandlers.delete(handler);
    },
    onExit: (handler) => {
      if (disposed) return () => undefined;
      exitHandlers.add(handler);
      return () => exitHandlers.delete(handler);
    },
    kill: () => {
      if (disposed) return;
      ptyProcess.kill();
    },
    detach,
    dispose: () => {
      detach();
      try {
        ptyProcess.kill();
      } catch {
        // ignore
      }
    },
  };
}
