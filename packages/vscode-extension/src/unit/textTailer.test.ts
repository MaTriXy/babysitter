import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TextFileTailer } from '../core/textTailer';

function fixturePath(...parts: string[]): string {
  return path.join(__dirname, '../../src/unit/fixtures', ...parts);
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('TextFileTailer', () => {
  test('tails log files incrementally', () => {
    const sample = fs.readFileSync(fixturePath('logs', 'sample.log'), 'utf8');

    const tempDir = makeTempDir('babysitter-textTailer-');
    try {
      const logPath = path.join(tempDir, 'stdout.log');
      fs.writeFileSync(logPath, sample, 'utf8');

      const tailer = new TextFileTailer();
      const first = tailer.tail(logPath);
      assert.strictEqual(first.lines.length, 4); // includes empty line at end

      const second = tailer.tail(logPath);
      assert.deepStrictEqual(second.lines, []);
      assert.strictEqual(second.truncated, false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('buffers partial final lines until complete', () => {
    const prefix = fs.readFileSync(fixturePath('logs', 'partial.prefix.txt'), 'utf8');
    const suffix = fs.readFileSync(fixturePath('logs', 'partial.suffix.txt'), 'utf8');

    const tempDir = makeTempDir('babysitter-textTailer-');
    try {
      const logPath = path.join(tempDir, 'stdout.log');
      const marker = 'partial-line-';
      const markerIndex = prefix.indexOf(marker);
      assert.ok(markerIndex >= 0, 'fixture missing marker');
      const partialPrefix = prefix.slice(0, markerIndex + marker.length);
      fs.writeFileSync(logPath, partialPrefix, 'utf8');

      const tailer = new TextFileTailer();
      const first = tailer.tail(logPath);
      assert.deepStrictEqual(first.lines, ['line 1', 'line 2']);

      fs.appendFileSync(logPath, suffix, 'utf8');
      const second = tailer.tail(logPath);
      assert.deepStrictEqual(second.lines, ['partial-line-rest', 'line 3', '']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('resets on truncation and continues tailing', () => {
    const tempDir = makeTempDir('babysitter-textTailer-');
    try {
      const logPath = path.join(tempDir, 'stdout.log');
      fs.writeFileSync(logPath, 'a\nb\n', 'utf8');

      const tailer = new TextFileTailer();
      const first = tailer.tail(logPath);
      assert.deepStrictEqual(first.lines, ['a', 'b']);
      assert.strictEqual(first.truncated, false);

      fs.writeFileSync(logPath, 'x\n', 'utf8');
      const second = tailer.tail(logPath);
      assert.strictEqual(second.truncated, true);
      assert.deepStrictEqual(second.lines, ['x']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
