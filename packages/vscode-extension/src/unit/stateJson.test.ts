import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { parseStateJsonText, readStateJsonFile } from '../core/stateJson';

function fixturePath(...parts: string[]): string {
  return path.join(__dirname, '../../src/unit/fixtures', ...parts);
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('stateJson', () => {
  test('parses state.json and normalizes status', () => {
    const text = fs.readFileSync(fixturePath('state', 'running.json'), 'utf8');
    const result = parseStateJsonText(text);
    assert.deepStrictEqual(result.issues, []);
    assert.strictEqual(result.status, 'running');
    assert.strictEqual(result.state?.runId, 'run-20260105-010206');
    assert.strictEqual(result.state?.status, 'running');
  });

  test('returns issues (no throw) when JSON is invalid', () => {
    const text = fs.readFileSync(fixturePath('state', 'invalid.json'), 'utf8');
    const result = parseStateJsonText(text);
    assert.strictEqual(result.status, 'unknown');
    assert.ok(result.issues.some((i) => i.code === 'STATE_INVALID_JSON'));
  });

  test('returns issues when JSON is not an object', () => {
    const text = fs.readFileSync(fixturePath('state', 'array.json'), 'utf8');
    const result = parseStateJsonText(text);
    assert.strictEqual(result.status, 'unknown');
    assert.ok(result.issues.some((i) => i.code === 'STATE_INVALID_SHAPE'));
  });

  test('readStateJsonFile returns STATE_NOT_FOUND for missing file', () => {
    const tempDir = makeTempDir('babysitter-stateJson-');
    try {
      const missing = path.join(tempDir, 'state.json');
      const result = readStateJsonFile(missing);
      assert.strictEqual(result.status, 'unknown');
      assert.ok(result.issues.some((i) => i.code === 'STATE_NOT_FOUND'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
