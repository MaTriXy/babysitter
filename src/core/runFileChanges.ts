import * as path from 'path';

import { extractRunIdFromPath } from './runId';

export type RunFileArea = 'state' | 'journal' | 'artifacts' | 'workSummaries';
export type RunFileEventType = 'create' | 'change' | 'delete';

export type RunFileChange = {
  runId: string;
  area: RunFileArea;
  type: RunFileEventType;
  fsPath: string;
};

export type RunChangeBatch = {
  runIds: string[];
  areasByRunId: Map<string, Set<RunFileArea>>;
  changes: RunFileChange[];
};

export function classifyRunFileChange(params: {
  runsRootPath: string;
  fsPath: string;
  type: RunFileEventType;
}): RunFileChange | undefined {
  const runId = extractRunIdFromPath(params.runsRootPath, params.fsPath);
  if (!runId) return undefined;

  const runRoot = path.join(params.runsRootPath, runId);
  const relativeToRun = path.relative(runRoot, params.fsPath);
  if (relativeToRun === '' || relativeToRun === '.') return undefined;
  if (relativeToRun.startsWith('..') || path.isAbsolute(relativeToRun)) return undefined;

  const parts = relativeToRun.split(path.sep);
  const first = parts[0];
  if (!first) return undefined;

  if (first === 'state.json' && parts.length === 1) {
    return { runId, area: 'state', type: params.type, fsPath: params.fsPath };
  }
  if (first === 'journal.jsonl' && parts.length === 1) {
    return { runId, area: 'journal', type: params.type, fsPath: params.fsPath };
  }
  if (first === 'artifacts') {
    return { runId, area: 'artifacts', type: params.type, fsPath: params.fsPath };
  }
  if (first === 'work_summaries') {
    return { runId, area: 'workSummaries', type: params.type, fsPath: params.fsPath };
  }

  return undefined;
}

export function toRunChangeBatch(changes: RunFileChange[]): RunChangeBatch {
  const areasByRunId = new Map<string, Set<RunFileArea>>();
  const runIds = new Set<string>();

  for (const change of changes) {
    runIds.add(change.runId);
    const areas = areasByRunId.get(change.runId) ?? new Set<RunFileArea>();
    areas.add(change.area);
    areasByRunId.set(change.runId, areas);
  }

  return {
    runIds: Array.from(runIds).sort((a, b) => b.localeCompare(a)),
    areasByRunId,
    changes,
  };
}
