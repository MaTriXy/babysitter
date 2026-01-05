import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  classifyRunFileChange,
  toRunChangeBatch,
  type RunFileChange,
} from '../core/runFileChanges';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('runFileChanges', () => {
  test('classifies state.json changes', () => {
    const tempDir = makeTempDir('babysitter-runFileChanges-');
    try {
      const runsRoot = path.join(tempDir, 'runs');
      const runId = 'run-20260105-010206+';
      const statePath = path.join(runsRoot, runId, 'state.json');
      const change = classifyRunFileChange({
        runsRootPath: runsRoot,
        fsPath: statePath,
        type: 'change',
      });
      assert.deepStrictEqual(change, { runId, area: 'state', type: 'change', fsPath: statePath });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('classifies journal.jsonl changes', () => {
    const tempDir = makeTempDir('babysitter-runFileChanges-');
    try {
      const runsRoot = path.join(tempDir, 'runs');
      const runId = 'run-20260105-010206';
      const journalPath = path.join(runsRoot, runId, 'journal.jsonl');
      const change = classifyRunFileChange({
        runsRootPath: runsRoot,
        fsPath: journalPath,
        type: 'create',
      });
      assert.deepStrictEqual(change, {
        runId,
        area: 'journal',
        type: 'create',
        fsPath: journalPath,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('classifies artifacts changes', () => {
    const tempDir = makeTempDir('babysitter-runFileChanges-');
    try {
      const runsRoot = path.join(tempDir, 'runs');
      const runId = 'run-20260105-010206';
      const artifactPath = path.join(runsRoot, runId, 'artifacts', 'result.txt');
      const change = classifyRunFileChange({
        runsRootPath: runsRoot,
        fsPath: artifactPath,
        type: 'delete',
      });
      assert.deepStrictEqual(change, {
        runId,
        area: 'artifacts',
        type: 'delete',
        fsPath: artifactPath,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('classifies work summary changes', () => {
    const tempDir = makeTempDir('babysitter-runFileChanges-');
    try {
      const runsRoot = path.join(tempDir, 'runs');
      const runId = 'run-20260105-010206';
      const workPath = path.join(runsRoot, runId, 'work_summaries', 'work.md');
      const change = classifyRunFileChange({
        runsRootPath: runsRoot,
        fsPath: workPath,
        type: 'change',
      });
      assert.deepStrictEqual(change, {
        runId,
        area: 'workSummaries',
        type: 'change',
        fsPath: workPath,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('ignores paths outside runs root and unrelated files', () => {
    const tempDir = makeTempDir('babysitter-runFileChanges-');
    try {
      const runsRoot = path.join(tempDir, 'runs');
      const runId = 'run-20260105-010206';
      const outside = path.join(tempDir, 'other', runId, 'state.json');
      const rootFile = path.join(runsRoot, 'state.json');
      const unrelated = path.join(runsRoot, runId, 'other.json');

      assert.strictEqual(
        classifyRunFileChange({ runsRootPath: runsRoot, fsPath: outside, type: 'change' }),
        undefined,
      );
      assert.strictEqual(
        classifyRunFileChange({ runsRootPath: runsRoot, fsPath: rootFile, type: 'change' }),
        undefined,
      );
      assert.strictEqual(
        classifyRunFileChange({ runsRootPath: runsRoot, fsPath: unrelated, type: 'change' }),
        undefined,
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('batches changes by run id and area', () => {
    const changes: RunFileChange[] = [
      { runId: 'run-20260105-010207', area: 'state', type: 'change', fsPath: '/x/a' },
      { runId: 'run-20260105-010206', area: 'journal', type: 'change', fsPath: '/x/b' },
      { runId: 'run-20260105-010206', area: 'artifacts', type: 'create', fsPath: '/x/c' },
      { runId: 'run-20260105-010206', area: 'workSummaries', type: 'change', fsPath: '/x/d' },
    ];

    const batch = toRunChangeBatch(changes);
    assert.deepStrictEqual(batch.runIds, ['run-20260105-010207', 'run-20260105-010206']);

    assert.deepStrictEqual(Array.from(batch.areasByRunId.get('run-20260105-010207') ?? []), [
      'state',
    ]);
    assert.deepStrictEqual(Array.from(batch.areasByRunId.get('run-20260105-010206') ?? []).sort(), [
      'artifacts',
      'journal',
      'workSummaries',
    ]);
  });
});
