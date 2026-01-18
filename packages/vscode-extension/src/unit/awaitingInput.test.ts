import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  detectAwaitingInputFromJournal,
  detectAwaitingInputFromProcessOutput,
  detectAwaitingInputFromState,
} from '../core/awaitingInput';
import type { StateJson } from '../core/stateJson';

function fixturePath(rel: string): string {
  return path.join(__dirname, '../../src/unit/fixtures/interaction', rel);
}

suite('awaitingInput detection', () => {
  test('detects awaiting input from state.json shape', () => {
    const state = JSON.parse(
      fs.readFileSync(fixturePath('state-awaiting.json'), 'utf8'),
    ) as StateJson;
    const detected = detectAwaitingInputFromState(state);
    assert.ok(detected, 'expected detection');
    assert.strictEqual(detected?.source, 'state');
    assert.strictEqual(detected?.awaiting, true);
    assert.strictEqual(detected?.prompt, 'Which approach should I take?');
  });

  test('detects awaiting input from journal.jsonl entries', () => {
    const raw = fs.readFileSync(fixturePath('journal-breakpoint.jsonl'), 'utf8');
    const entries = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as unknown);

    const detected = detectAwaitingInputFromJournal(entries);
    assert.ok(detected, 'expected detection');
    assert.strictEqual(detected?.source, 'journal');
    assert.strictEqual(detected?.awaiting, true);
    assert.strictEqual(detected?.prompt, 'Please clarify the desired behavior.');
  });

  test('detects awaiting input from process output without trailing newline', () => {
    const raw = fs.readFileSync(fixturePath('process-prompt.txt'), 'utf8');
    const output = raw.replace(/\r?\n$/, '');
    const detected = detectAwaitingInputFromProcessOutput(output);
    assert.ok(detected, 'expected detection');
    assert.strictEqual(detected?.source, 'process');
    assert.strictEqual(detected?.awaiting, true);
    assert.strictEqual(detected?.prompt, 'Need input:');
  });

  test('does not detect awaiting input when output ends with newline', () => {
    const output = 'All good.\n';
    assert.strictEqual(detectAwaitingInputFromProcessOutput(output), undefined);
  });
});
