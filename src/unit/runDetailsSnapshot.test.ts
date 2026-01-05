import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { appendRollingWindow, isFsPathInsideRoot, listFilesRecursive, listFilesSortedByMtimeDesc } from '../core/runDetailsSnapshot';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('runDetailsSnapshot', () => {
  test('isFsPathInsideRoot accepts paths within root and rejects outside', () => {
    const tempDir = makeTempDir('babysitter-runDetails-');
    try {
      const root = path.join(tempDir, 'run-20260105-010206');
      const inside = path.join(root, 'artifacts', 'x.txt');
      const outside = path.join(tempDir, 'other', 'x.txt');

      assert.strictEqual(isFsPathInsideRoot(root, inside), true);
      assert.strictEqual(isFsPathInsideRoot(root, root), true);
      assert.strictEqual(isFsPathInsideRoot(root, outside), false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('appendRollingWindow keeps only the last N items', () => {
    assert.deepStrictEqual(appendRollingWindow([1, 2, 3], [4], 3), [2, 3, 4]);
    assert.deepStrictEqual(appendRollingWindow([], [1, 2, 3, 4], 2), [3, 4]);
    assert.deepStrictEqual(appendRollingWindow([1, 2], [], 5), [1, 2]);
    assert.deepStrictEqual(appendRollingWindow([1, 2], [3, 4], 0), []);
  });

  test('listFilesRecursive returns relative paths under rootForRel', () => {
    const tempDir = makeTempDir('babysitter-runDetails-');
    try {
      const dir = path.join(tempDir, 'artifacts');
      fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'a.txt'), 'hello', 'utf8');
      fs.writeFileSync(path.join(dir, 'nested', 'b.txt'), 'world', 'utf8');

      const items = listFilesRecursive({ dir, rootForRel: dir, maxFiles: 50 });
      const rels = items.map((i) => i.relPath);
      assert.ok(rels.includes('a.txt'));
      assert.ok(rels.includes('nested'));
      assert.ok(rels.includes(path.join('nested', 'b.txt')));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('listFilesSortedByMtimeDesc sorts by newest mtime', async () => {
    const tempDir = makeTempDir('babysitter-runDetails-');
    try {
      const dir = path.join(tempDir, 'work_summaries');
      fs.mkdirSync(dir, { recursive: true });
      const a = path.join(dir, 'a.md');
      const b = path.join(dir, 'b.md');
      fs.writeFileSync(a, 'A', 'utf8');
      await new Promise((r) => setTimeout(r, 15));
      fs.writeFileSync(b, 'B', 'utf8');

      const items = listFilesSortedByMtimeDesc({ dir, rootForRel: dir, maxFiles: 10 });
      assert.strictEqual(items[0]?.relPath, 'b.md');
      assert.strictEqual(items[1]?.relPath, 'a.md');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
