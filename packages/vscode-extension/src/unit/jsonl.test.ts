import * as assert from 'assert';

import { parseJsonLines } from '../core/jsonl';

suite('parseJsonLines', () => {
  test('parses JSON objects per line', () => {
    const input = ['{"a":1}', '{"b":"x"}'].join('\n');
    const parsed = parseJsonLines(input) as Array<Record<string, unknown>>;
    assert.deepStrictEqual(parsed, [{ a: 1 }, { b: 'x' }]);
  });

  test('ignores empty lines and whitespace', () => {
    const input = ['  ', '{"a":1}', '', ' \t', '{"b":2}'].join('\n');
    const parsed = parseJsonLines(input) as Array<Record<string, unknown>>;
    assert.deepStrictEqual(parsed, [{ a: 1 }, { b: 2 }]);
  });

  test('throws with line context on invalid JSON', () => {
    const input = ['{"ok":true}', '{not-json}', '{"ok2":true}'].join('\n');
    assert.throws(
      () => parseJsonLines(input),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        const anyErr = err as unknown as { line?: unknown; source?: unknown; message?: unknown };
        return (
          anyErr.line === 2 &&
          anyErr.source === '{not-json}' &&
          typeof anyErr.message === 'string' &&
          anyErr.message.includes('line 2')
        );
      },
    );
  });
});
