import * as fs from 'fs';
import * as path from 'path';

import type { Run, RunPaths, RunStatus } from './run';
import { isRunId } from './runId';
import { readStateJsonFile } from './stateJson';

function isExistingDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readRunStatusFromStateJson(stateJsonPath: string): RunStatus {
  return readStateJsonFile(stateJsonPath).status;
}

function statMtimeMs(filePath: string): number | undefined {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return undefined;
  }
}

function buildRunPaths(runRoot: string): RunPaths {
  return {
    runRoot,
    stateJson: path.join(runRoot, 'state.json'),
    journalJsonl: path.join(runRoot, 'journal.jsonl'),
    artifactsDir: path.join(runRoot, 'artifacts'),
    promptsDir: path.join(runRoot, 'prompts'),
    workSummariesDir: path.join(runRoot, 'work_summaries'),
  };
}

/**
 * Discover `o` runs by scanning the runs root directory for run id subdirectories.
 */
export function discoverRuns(runsRootPath: string): Run[] {
  if (!isExistingDirectory(runsRootPath)) return [];

  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(runsRootPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const runIds = dirents
    .filter((d) => d.isDirectory() && isRunId(d.name))
    .map((d) => d.name)
    .sort((a, b) => b.localeCompare(a));

  const runs: Run[] = [];

  for (const id of runIds) {
    const runRoot = path.join(runsRootPath, id);
    let runDirStat: fs.Stats;
    try {
      runDirStat = fs.statSync(runRoot);
      if (!runDirStat.isDirectory()) continue;
    } catch {
      continue;
    }

    const paths = buildRunPaths(runRoot);
    const status = readRunStatusFromStateJson(paths.stateJson);

    const updatedAtCandidates: number[] = [runDirStat.mtimeMs];
    const stateMtime = statMtimeMs(paths.stateJson);
    if (stateMtime !== undefined) updatedAtCandidates.push(stateMtime);
    const journalMtime = statMtimeMs(paths.journalJsonl);
    if (journalMtime !== undefined) updatedAtCandidates.push(journalMtime);

    const updatedAtMs = Math.max(...updatedAtCandidates);
    const createdAtMs = runDirStat.birthtimeMs > 0 ? runDirStat.birthtimeMs : runDirStat.ctimeMs;

    runs.push({
      id,
      status,
      timestamps: {
        createdAt: new Date(createdAtMs),
        updatedAt: new Date(updatedAtMs),
      },
      paths,
    });
  }

  return runs;
}
