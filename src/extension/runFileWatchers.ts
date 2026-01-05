import * as path from 'path';
import * as vscode from 'vscode';

import { DebouncedBatcher } from '../core/debouncedBatcher';
import {
  classifyRunFileChange,
  toRunChangeBatch,
  type RunChangeBatch,
  type RunFileChange,
  type RunFileEventType,
} from '../core/runFileChanges';

function toPosixGlobPath(p: string): string {
  return p.split(path.sep).join('/');
}

function createGlobPatterns(params: {
  runsRootPath: string;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
}): { base: vscode.Uri; prefix: string } {
  if (!params.workspaceFolder) {
    return { base: vscode.Uri.file(params.runsRootPath), prefix: '' };
  }

  const workspaceRoot = params.workspaceFolder.uri.fsPath;
  const relative = path.relative(workspaceRoot, params.runsRootPath);
  const isInsideWorkspace = relative !== '' && relative !== '.' && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (isInsideWorkspace) {
    const prefix = `${toPosixGlobPath(relative)}/`;
    return { base: params.workspaceFolder.uri, prefix };
  }

  return { base: vscode.Uri.file(params.runsRootPath), prefix: '' };
}

export function createRunFileWatchers(params: {
  runsRootPath: string;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  debounceMs: number;
  onBatch: (batch: RunChangeBatch) => void;
}): vscode.Disposable {
  const globs = createGlobPatterns({ runsRootPath: params.runsRootPath, workspaceFolder: params.workspaceFolder });

  const batcher = new DebouncedBatcher<RunFileChange>(params.debounceMs, (changes) => {
    params.onBatch(toRunChangeBatch(changes));
  });

  const handle = (uri: vscode.Uri, type: RunFileEventType): void => {
    const classified = classifyRunFileChange({
      runsRootPath: params.runsRootPath,
      fsPath: uri.fsPath,
      type,
    });
    if (!classified) return;
    batcher.push(classified);
  };

  const stateWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(globs.base, `${globs.prefix}run-*/state.json`),
  );
  const journalWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(globs.base, `${globs.prefix}run-*/journal.jsonl`),
  );
  const artifactsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(globs.base, `${globs.prefix}run-*/artifacts/**`),
  );

  const disposables: vscode.Disposable[] = [
    stateWatcher,
    journalWatcher,
    artifactsWatcher,
    stateWatcher.onDidCreate((u) => handle(u, 'create')),
    stateWatcher.onDidChange((u) => handle(u, 'change')),
    stateWatcher.onDidDelete((u) => handle(u, 'delete')),
    journalWatcher.onDidCreate((u) => handle(u, 'create')),
    journalWatcher.onDidChange((u) => handle(u, 'change')),
    journalWatcher.onDidDelete((u) => handle(u, 'delete')),
    artifactsWatcher.onDidCreate((u) => handle(u, 'create')),
    artifactsWatcher.onDidChange((u) => handle(u, 'change')),
    artifactsWatcher.onDidDelete((u) => handle(u, 'delete')),
  ];

  return new vscode.Disposable(() => {
    for (const d of disposables) d.dispose();
    batcher.dispose();
  });
}
