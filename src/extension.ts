import * as vscode from 'vscode';

import { resolveBabysitterConfig, type BabysitterRawSettings, type ConfigIssue } from './core/config';
import { dispatchNewRunViaO, resumeExistingRunViaO } from './core/oDispatch';
import type { PtyProcess } from './core/ptyProcess';
import { isRunId } from './core/runId';
import type { Run } from './core/run';
import { sendEnter, sendEsc } from './core/stdinControls';
import { createRunFileWatchers } from './extension/runFileWatchers';
import { createRunDetailsViewManager } from './extension/runDetailsView';
import { registerRunsTreeView } from './extension/runTreeView';

export const OUTPUT_CHANNEL_NAME = 'Babysitter';

type BabysitterApi = {
  outputChannelName: string;
};

function readRawSettings(): BabysitterRawSettings {
  const cfg = vscode.workspace.getConfiguration('babysitter');
  return {
    oBinaryPath: cfg.get<string>('o.binaryPath') ?? '',
    oPath: cfg.get<string>('oPath') ?? '',
    runsRoot: cfg.get<string>('runsRoot') ?? '',
    globalConfigPath: cfg.get<string>('globalConfigPath') ?? '',
  };
}

function formatIssues(issues: ConfigIssue[]): string[] {
  return issues.map((issue) => {
    const detail = issue.detail ? ` (${issue.detail})` : '';
    return `- [${issue.code}] ${issue.message}${detail}`;
  });
}

function toRunFromCommandArg(value: unknown): Run | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && value !== null && 'run' in value) {
    const candidate = (value as { run?: unknown }).run;
    if (candidate && typeof candidate === 'object' && 'id' in candidate && 'paths' in candidate) return candidate as Run;
  }
  if (typeof value === 'object' && value !== null && 'id' in value && 'paths' in value) return value as Run;
  return undefined;
}

export function activate(context: vscode.ExtensionContext): BabysitterApi {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  output.appendLine('Babysitter extension activated.');

  const runDetailsView = createRunDetailsViewManager(context);
  const runsTreeView = registerRunsTreeView(context);
  runsTreeView.setOpenRunDetailsHandler((run) => runDetailsView.open(run));

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'babysitter.showConfigurationErrors';
  status.text = 'Babysitter: Config…';
  status.tooltip = 'Babysitter configuration status';
  status.show();

  let latestIssues: ConfigIssue[] = [];
  let lastNotifiedFingerprint = '';
  let runWatchersDisposable: vscode.Disposable | undefined;

  const oProcessesByPid = new Map<number, { process: PtyProcess; label: string }>();
  let activeOPid: number | undefined;
  const registerOProcess = (process: PtyProcess, label: string): void => {
    oProcessesByPid.set(process.pid, { process, label });
    activeOPid = process.pid;
    process.onExit(() => {
      process.detach();
      oProcessesByPid.delete(process.pid);
      if (activeOPid === process.pid) activeOPid = undefined;
    });
  };

  context.subscriptions.push(
    new vscode.Disposable(() => {
      // Do not kill running `o` processes on deactivation; just detach listeners.
      for (const entry of oProcessesByPid.values()) entry.process.detach();
      oProcessesByPid.clear();
      activeOPid = undefined;
    }),
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      runWatchersDisposable?.dispose();
      runWatchersDisposable = undefined;
    }),
  );

  const refreshConfig = async (notifyOnError: boolean): Promise<void> => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const settings = readRawSettings();

    const resolveOptions: Parameters<typeof resolveBabysitterConfig>[0] = { settings, platform: process.platform };
    if (workspaceRoot !== undefined) resolveOptions.workspaceRoot = workspaceRoot;
    if (process.env.PATH !== undefined) resolveOptions.envPath = process.env.PATH;
    const result = resolveBabysitterConfig(resolveOptions);

    latestIssues = result.issues;

    if (result.issues.length > 0) {
      status.text = `Babysitter: Config error (${result.issues.length})`;
      status.tooltip = result.issues.map((i) => `${i.code}: ${i.message}`).join('\n');
      runWatchersDisposable?.dispose();
      runWatchersDisposable = undefined;
      runsTreeView.setRunsRootPath(undefined);

      const fingerprint = JSON.stringify(
        result.issues.map((i) => ({ code: i.code, message: i.message, detail: i.detail })),
      );
      if (notifyOnError && fingerprint !== lastNotifiedFingerprint) {
        lastNotifiedFingerprint = fingerprint;
        const action = 'Open Settings';
        const choice = await vscode.window.showErrorMessage(
          'Babysitter: configuration error. Run "Babysitter: Show Configuration Errors" for details.',
          action,
        );
        if (choice === action) {
          await vscode.commands.executeCommand('workbench.action.openSettings', 'babysitter');
        }
      }

      return;
    }

    status.text = 'Babysitter: Ready';
    status.tooltip = `Runs root: ${result.config.runsRoot?.path ?? '(unknown)'}`;

    const runsRootPath = result.config.runsRoot?.path;
    if (!runsRootPath) {
      runWatchersDisposable?.dispose();
      runWatchersDisposable = undefined;
      runsTreeView.setRunsRootPath(undefined);
      return;
    }

    runsTreeView.setRunsRootPath(runsRootPath);

    runWatchersDisposable?.dispose();
      runWatchersDisposable = createRunFileWatchers({
        runsRootPath,
        workspaceFolder,
        debounceMs: 250,
        onBatch: (batch) => {
        const summary = batch.runIds
          .map((runId) => {
            const areas = batch.areasByRunId.get(runId);
            const areaList = areas ? Array.from(areas).sort().join(',') : '';
            return `${runId}${areaList ? ` [${areaList}]` : ''}`;
          })
          .join(', ');
          output.appendLine(`Run files changed (${batch.runIds.length}): ${summary}`);
          runsTreeView.refresh();
          runDetailsView.onRunChangeBatch(batch);
        },
      });
  };

  const disposable = vscode.commands.registerCommand('babysitter.activate', () => {
    output.appendLine('Babysitter command executed.');
    output.show(true);
  });

  const dispatchRunDisposable = vscode.commands.registerCommand(
    'babysitter.dispatchRun',
    async (arg?: unknown): Promise<unknown> => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        await vscode.window.showErrorMessage('Babysitter: open a workspace folder to dispatch runs.');
        throw new Error('No workspace folder open.');
      }

      const settings = readRawSettings();
      const resolveOptions: Parameters<typeof resolveBabysitterConfig>[0] = { settings, platform: process.platform };
      resolveOptions.workspaceRoot = workspaceRoot;
      if (process.env.PATH !== undefined) resolveOptions.envPath = process.env.PATH;
      const result = resolveBabysitterConfig(resolveOptions);

      if (result.issues.length > 0 || !result.config.oBinary || !result.config.runsRoot) {
        output.show(true);
        output.appendLine('Babysitter: cannot dispatch run due to configuration issues:');
        for (const line of formatIssues(result.issues)) output.appendLine(line);
        await vscode.window.showErrorMessage(
          'Babysitter: configuration error. Run "Babysitter: Show Configuration Errors" for details.',
        );
        throw new Error('Configuration invalid for dispatch.');
      }

      const promptFromArg =
        typeof arg === 'string'
          ? arg
          : typeof arg === 'object' && arg !== null && 'prompt' in arg
            ? (arg as { prompt?: unknown }).prompt
            : undefined;
      const prompt =
        typeof promptFromArg === 'string' && promptFromArg.trim()
          ? promptFromArg.trim()
          : (await vscode.window.showInputBox({
              title: 'Dispatch new run',
              prompt: 'Enter a request to dispatch via `o`.',
              placeHolder: 'Describe what you want `o` to do…',
            }))?.trim();
      if (!prompt) return undefined;

      output.show(true);
      output.appendLine(`Dispatching via \`o\`: ${result.config.oBinary.path}`);

      try {
        const dispatched = await dispatchNewRunViaO({
          oBinaryPath: result.config.oBinary.path,
          workspaceRoot,
          runsRootPath: result.config.runsRoot.path,
          prompt,
          onProcess: (process) => {
            registerOProcess(process, 'o (dispatch)');
            output.appendLine(`Started interactive o process (pid ${process.pid}).`);
          },
        });

        if (dispatched.pid !== undefined) {
          const entry = oProcessesByPid.get(dispatched.pid);
          if (entry) entry.label = `o (dispatch ${dispatched.runId})`;
        }
        output.appendLine(`Dispatched run: ${dispatched.runId}`);
        output.appendLine(`Run root: ${dispatched.runRootPath}`);
        if (dispatched.stdout.trim()) output.appendLine(`o stdout:\n${dispatched.stdout.trimEnd()}`);
        if (dispatched.stderr.trim()) output.appendLine(`o stderr:\n${dispatched.stderr.trimEnd()}`);

        runsTreeView.refresh();
        return dispatched;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output.appendLine(`Dispatch failed: ${message}`);
        await vscode.window.showErrorMessage('Babysitter: dispatch failed. See output for details.');
        throw err;
      }
    },
  );

  const resumeRunDisposable = vscode.commands.registerCommand(
    'babysitter.resumeRun',
    async (arg?: unknown): Promise<unknown> => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        await vscode.window.showErrorMessage('Babysitter: open a workspace folder to resume runs.');
        throw new Error('No workspace folder open.');
      }

      const settings = readRawSettings();
      const resolveOptions: Parameters<typeof resolveBabysitterConfig>[0] = { settings, platform: process.platform };
      resolveOptions.workspaceRoot = workspaceRoot;
      if (process.env.PATH !== undefined) resolveOptions.envPath = process.env.PATH;
      const result = resolveBabysitterConfig(resolveOptions);

      if (result.issues.length > 0 || !result.config.oBinary || !result.config.runsRoot) {
        output.show(true);
        output.appendLine('Babysitter: cannot resume run due to configuration issues:');
        for (const line of formatIssues(result.issues)) output.appendLine(line);
        await vscode.window.showErrorMessage(
          'Babysitter: configuration error. Run "Babysitter: Show Configuration Errors" for details.',
        );
        throw new Error('Configuration invalid for resume.');
      }

      const fromRun = toRunFromCommandArg(arg);
      const runIdFromArg =
        typeof arg === 'string'
          ? arg
          : typeof arg === 'object' && arg !== null && 'runId' in arg
            ? (arg as { runId?: unknown }).runId
            : undefined;
      const promptFromArg =
        typeof arg === 'object' && arg !== null && 'prompt' in arg ? (arg as { prompt?: unknown }).prompt : undefined;

      const runId =
        fromRun?.id ??
        (typeof runIdFromArg === 'string' && runIdFromArg.trim() ? runIdFromArg.trim() : undefined) ??
        (await (async () => {
          const runs = runsTreeView.getRunsSnapshot();
          if (runs.length === 0) {
            await vscode.window.showInformationMessage('Babysitter: no runs found to resume.');
            return undefined;
          }
          const picked = await vscode.window.showQuickPick(
            runs.map((r) => ({
              label: r.id,
              description: r.status,
              runId: r.id,
            })),
            { title: 'Select a run to resume' },
          );
          return picked?.runId;
        })());
      if (!runId) return undefined;
      if (!isRunId(runId)) {
        await vscode.window.showErrorMessage(`Babysitter: invalid run id: ${runId}`);
        throw new Error(`Invalid run id: ${runId}`);
      }

      const prompt =
        typeof promptFromArg === 'string' && promptFromArg.trim()
          ? promptFromArg.trim()
          : (await vscode.window.showInputBox({
              title: `Resume ${runId}`,
              prompt: 'Enter an updated request/prompt to resume this run via `o`.',
              placeHolder: 'Describe what you want `o` to do next…',
            }))?.trim();
      if (!prompt) return undefined;

      output.show(true);
      output.appendLine(`Resuming ${runId} via \`o\`: ${result.config.oBinary.path}`);

      try {
        const resumed = await resumeExistingRunViaO({
          oBinaryPath: result.config.oBinary.path,
          workspaceRoot,
          runsRootPath: result.config.runsRoot.path,
          runId,
          prompt,
          onProcess: (process) => {
            registerOProcess(process, `o (resume ${runId})`);
            output.appendLine(`Started interactive o process (pid ${process.pid}).`);
          },
        });

        if (resumed.pid !== undefined) {
          const entry = oProcessesByPid.get(resumed.pid);
          if (entry) entry.label = `o (resume ${resumed.runId})`;
        }
        output.appendLine(`Resumed run: ${resumed.runId}`);
        output.appendLine(`Run root: ${resumed.runRootPath}`);
        if (resumed.stdout.trim()) output.appendLine(`o stdout:\n${resumed.stdout.trimEnd()}`);
        if (resumed.stderr.trim()) output.appendLine(`o stderr:\n${resumed.stderr.trimEnd()}`);

        runsTreeView.refresh();
        return resumed;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output.appendLine(`Resume failed: ${message}`);
        await vscode.window.showErrorMessage('Babysitter: resume failed. See output for details.');
        throw err;
      }
    },
  );

  const sendEscDisposable = vscode.commands.registerCommand('babysitter.sendEsc', async () => {
    const pid = activeOPid;
    if (pid === undefined) {
      await vscode.window.showWarningMessage('Babysitter: no active `o` process to send ESC to.');
      return;
    }
    const entry = oProcessesByPid.get(pid);
    if (!entry) {
      await vscode.window.showWarningMessage('Babysitter: active `o` process is no longer available.');
      activeOPid = undefined;
      return;
    }
    try {
      sendEsc(entry.process);
      output.appendLine(`Sent ESC to ${entry.label} (pid ${pid}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      output.appendLine(`Failed to send ESC to pid ${pid}: ${message}`);
      await vscode.window.showErrorMessage('Babysitter: failed to send ESC. See output for details.');
    }
  });

  const sendEnterDisposable = vscode.commands.registerCommand('babysitter.sendEnter', async () => {
    const pid = activeOPid;
    if (pid === undefined) {
      await vscode.window.showWarningMessage('Babysitter: no active `o` process to send Enter to.');
      return;
    }
    const entry = oProcessesByPid.get(pid);
    if (!entry) {
      await vscode.window.showWarningMessage('Babysitter: active `o` process is no longer available.');
      activeOPid = undefined;
      return;
    }
    try {
      sendEnter(entry.process);
      output.appendLine(`Sent Enter to ${entry.label} (pid ${pid}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      output.appendLine(`Failed to send Enter to pid ${pid}: ${message}`);
      await vscode.window.showErrorMessage('Babysitter: failed to send Enter. See output for details.');
    }
  });

  const showConfigErrorsDisposable = vscode.commands.registerCommand(
    'babysitter.showConfigurationErrors',
    async () => {
      output.show(true);
      output.appendLine('Babysitter configuration:');

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const settings = readRawSettings();
      const resolveOptions: Parameters<typeof resolveBabysitterConfig>[0] = { settings, platform: process.platform };
      if (workspaceRoot !== undefined) resolveOptions.workspaceRoot = workspaceRoot;
      if (process.env.PATH !== undefined) resolveOptions.envPath = process.env.PATH;
      const result = resolveBabysitterConfig(resolveOptions);

      output.appendLine(`- Workspace root: ${workspaceRoot ?? '(no workspace open)'}`);
      output.appendLine(
        `- Setting (babysitter.o.binaryPath): ${settings.oBinaryPath?.trim() ? settings.oBinaryPath : '(not set)'}`,
      );
      output.appendLine(
        `- Setting (babysitter.oPath, legacy): ${settings.oPath?.trim() ? settings.oPath : '(not set)'}`,
      );
      output.appendLine(
        `- Setting (babysitter.runsRoot): ${settings.runsRoot?.trim() ? settings.runsRoot : '(default)'}`,
      );
      output.appendLine(
        `- Setting (babysitter.globalConfigPath): ${settings.globalConfigPath?.trim() ? settings.globalConfigPath : '(not set)'}`,
      );

      if (result.issues.length === 0) {
        output.appendLine('Result: OK');
        const resolvedOBinary = result.config.oBinary;
        const resolvedRunsRoot = result.config.runsRoot;
        if (resolvedOBinary) {
          output.appendLine(`- Resolved o: ${resolvedOBinary.path} (${resolvedOBinary.source})`);
        }
        if (resolvedRunsRoot) {
          output.appendLine(`- Resolved runs root: ${resolvedRunsRoot.path} (${resolvedRunsRoot.source})`);
        }
        await vscode.window.showInformationMessage('Babysitter: configuration looks good.');
        return;
      }

      output.appendLine('Result: ERRORS');
      for (const line of formatIssues(result.issues)) output.appendLine(line);

      const action = 'Open Settings';
      const choice = await vscode.window.showErrorMessage(
        `Babysitter: found ${result.issues.length} configuration issue(s). See Babysitter output for details.`,
        action,
      );
      if (choice === action) {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'babysitter');
      }
    },
  );

  const locateOBinaryDisposable = vscode.commands.registerCommand(
    'babysitter.locateOBinary',
    async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const settings = readRawSettings();
      const resolveOptions: Parameters<typeof resolveBabysitterConfig>[0] = { settings, platform: process.platform };
      if (workspaceRoot !== undefined) resolveOptions.workspaceRoot = workspaceRoot;
      if (process.env.PATH !== undefined) resolveOptions.envPath = process.env.PATH;
      const result = resolveBabysitterConfig(resolveOptions);

      output.show(true);
      output.appendLine('Locating `o` binary...');
      output.appendLine(
        `- Setting (babysitter.o.binaryPath): ${settings.oBinaryPath ? settings.oBinaryPath : '(not set)'}`,
      );
      output.appendLine(
        `- Setting (babysitter.oPath, legacy): ${settings.oPath ? settings.oPath : '(not set)'}`,
      );
      output.appendLine(`- Workspace root: ${workspaceRoot ?? '(no workspace open)'}`);

      if (!result.config?.oBinary) {
        output.appendLine('Result: NOT FOUND');
        for (const line of formatIssues(result.issues)) output.appendLine(line);
        await vscode.window.showWarningMessage(
          'Babysitter: could not find the `o` binary. Set `babysitter.o.binaryPath` (or legacy `babysitter.oPath`), place `o` in the workspace root, or add it to PATH.',
        );
        return;
      }

      output.appendLine(
        `Result: FOUND (${result.config.oBinary.source}) -> ${result.config.oBinary.path}`,
      );
      await vscode.window.showInformationMessage(
        `Babysitter: found \`o\` (${result.config.oBinary.source}): ${result.config.oBinary.path}`,
      );
    },
  );

  void refreshConfig(true);

  context.subscriptions.push(
    output,
    status,
    disposable,
    dispatchRunDisposable,
    resumeRunDisposable,
    sendEscDisposable,
    sendEnterDisposable,
    showConfigErrorsDisposable,
    locateOBinaryDisposable,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('babysitter')) void refreshConfig(false);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void refreshConfig(false);
    }),
  );
  return { outputChannelName: OUTPUT_CHANNEL_NAME };
}

export function deactivate(): void {
  // no-op
}
