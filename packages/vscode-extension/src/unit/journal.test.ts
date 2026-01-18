import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { JournalTailer } from '../core/journal';

function fixturePath(...parts: string[]): string {
  return path.join(__dirname, '../../src/unit/fixtures', ...parts);
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('JournalTailer', () => {
  test('tails and parses journal.jsonl incrementally', () => {
    const sample = fs.readFileSync(fixturePath('journal', 'sample.jsonl'), 'utf8');

    const tempDir = makeTempDir('babysitter-journalTailer-');
    try {
      const journalPath = path.join(tempDir, 'journal.jsonl');
      fs.writeFileSync(journalPath, sample, 'utf8');

      const tailer = new JournalTailer();
      const first = tailer.tail(journalPath);
      assert.strictEqual(first.entries.length, 3);
      assert.deepStrictEqual(first.errors, []);

      const second = tailer.tail(journalPath);
      assert.deepStrictEqual(second.entries, []);
      assert.deepStrictEqual(second.errors, []);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('buffers partial final lines until complete', () => {
    const prefix = fs.readFileSync(fixturePath('journal', 'partial.prefix.txt'), 'utf8');
    const suffix = fs.readFileSync(fixturePath('journal', 'partial.suffix.txt'), 'utf8');

    const tempDir = makeTempDir('babysitter-journalTailer-');
    try {
      const journalPath = path.join(tempDir, 'journal.jsonl');
      const marker = '{"b":';
      const markerIndex = prefix.indexOf(marker);
      assert.ok(markerIndex >= 0, 'fixture missing marker line');
      const partialPrefix = prefix.slice(0, markerIndex + marker.length);
      fs.writeFileSync(journalPath, partialPrefix, 'utf8');

      const tailer = new JournalTailer();
      const first = tailer.tail(journalPath);
      assert.strictEqual(first.entries.length, 1);
      assert.deepStrictEqual(first.errors, []);

      fs.appendFileSync(journalPath, suffix, 'utf8');
      const second = tailer.tail(journalPath);
      assert.strictEqual(second.entries.length, 2);
      assert.deepStrictEqual(second.errors, []);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('continues after invalid JSON lines (captures errors)', () => {
    const sample = fs.readFileSync(fixturePath('journal', 'invalidLine.jsonl'), 'utf8');

    const tempDir = makeTempDir('babysitter-journalTailer-');
    try {
      const journalPath = path.join(tempDir, 'journal.jsonl');
      fs.writeFileSync(journalPath, sample, 'utf8');

      const tailer = new JournalTailer();
      const result = tailer.tail(journalPath);
      assert.strictEqual(result.entries.length, 2);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0]?.line, 2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('resets on truncation and continues tailing', () => {
    const tempDir = makeTempDir('babysitter-journalTailer-');
    try {
      const journalPath = path.join(tempDir, 'journal.jsonl');
      fs.writeFileSync(journalPath, '{"a":1}\n{"b":2}\n', 'utf8');

      const tailer = new JournalTailer();
      const first = tailer.tail(journalPath);
      assert.strictEqual(first.entries.length, 2);
      assert.strictEqual(first.truncated, false);

      fs.writeFileSync(journalPath, '{"x":9}\n', 'utf8');
      const second = tailer.tail(journalPath);
      assert.strictEqual(second.truncated, true);
      assert.strictEqual(second.entries.length, 1);
      assert.deepStrictEqual(second.errors, []);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
