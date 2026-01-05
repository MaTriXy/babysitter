import * as path from 'path';

export const RUN_ID_DIR_REGEX = /^run-\d{8}-\d{6}$/;

export function isRunId(dirName: string): boolean {
  return RUN_ID_DIR_REGEX.test(dirName);
}

/**
 * Extracts the run id (`run-YYYYMMDD-HHMMSS`) from an absolute path that is
 * expected to be inside the runs root.
 *
 * Examples:
 * - runsRoot=/x/.a5c/runs, fsPath=/x/.a5c/runs/run-20260105-010206/state.json -> run-20260105-010206
 * - runsRoot=/x/.a5c/runs, fsPath=/x/.a5c/runs -> undefined
 * - runsRoot=/x/.a5c/runs, fsPath=/x/other -> undefined
 */
export function extractRunIdFromPath(runsRootPath: string, fsPath: string): string | undefined {
  const relative = path.relative(runsRootPath, fsPath);
  if (relative === '' || relative === '.') return undefined;
  if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  const firstSegment = relative.split(path.sep)[0];
  if (!firstSegment || firstSegment === '.' || firstSegment === '..') return undefined;
  return isRunId(firstSegment) ? firstSegment : undefined;
}
