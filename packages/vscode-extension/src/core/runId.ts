import * as path from 'path';

export function isRunId(dirName: string): boolean {
  const trimmed = dirName.trim();
  if (!trimmed) return false;

  // Run directories are any directory directly under the runs root.
  // Avoid path traversal and path separators; callers assume this is a single path segment.
  if (trimmed === '.' || trimmed === '..') return false;
  return !/[\\/]/.test(trimmed);
}

/**
 * Extracts the run id (`run-20260105-010206-anything` or `20260105-010206-anything`)
 * from an absolute path that is expected to be inside the runs root.
 *
 * Examples:
 * - runsRoot=/x/.a5c/runs, fsPath=/x/.a5c/runs/run-20260105-010206-anything/state.json -> run-20260105-010206-anything
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
