import * as assert from 'assert';

import { determineProcessKind, extractProcessExportsFromSource } from '../core/processCatalog';

suite('processCatalog', () => {
  test('extracts exported arrow function params + return keys', () => {
    const src = `
/** Returns a planning template. */
export const planningBreakdownTemplate = (task, ctx = {}, ...rest) => ({
  domain: "package",
  sections: [],
});
`;
    const exports = extractProcessExportsFromSource(
      src,
      '/virtual/.a5c/processes/roles/development/domains/packs/package.js',
      '.a5c/processes/roles/development/domains/packs/package.js',
    );
    assert.strictEqual(exports.length, 1);
    assert.ok(exports[0]);
    const first = exports[0];
    assert.strictEqual(first.exportName, 'planningBreakdownTemplate');
    assert.strictEqual(first.kind, 'domain');
    assert.strictEqual(first.doc, 'Returns a planning template.');
    assert.deepStrictEqual(first.params, [
      { name: 'task', hasDefault: false, isRest: false },
      { name: 'ctx', hasDefault: true, isRest: false },
      { name: 'rest', hasDefault: false, isRest: true },
    ]);
    assert.deepStrictEqual(first.returnKeys, ['domain', 'sections']);
  });

  test('extracts exported function declarations', () => {
    const src = `
/** Example helper. */
export function criteriaPack(task) {
  return { criteria: [task] };
}
`;
    const exports = extractProcessExportsFromSource(
      src,
      '/virtual/.a5c/processes/roles/development/domains/packs/package.js',
      '.a5c/processes/roles/development/domains/packs/package.js',
    );
    assert.strictEqual(exports.length, 1);
    assert.ok(exports[0]);
    const first = exports[0];
    assert.strictEqual(first.exportName, 'criteriaPack');
    assert.strictEqual(first.doc, 'Example helper.');
    assert.deepStrictEqual(first.params, [{ name: 'task', hasDefault: false, isRest: false }]);
    assert.deepStrictEqual(first.returnKeys, ['criteria']);
  });

  test('classifies module path kind', () => {
    assert.strictEqual(determineProcessKind('.a5c/processes/core/loops/plan_execute.js'), 'loop');
    assert.strictEqual(determineProcessKind('.a5c/processes/core/task.js'), 'core');
    assert.strictEqual(
      determineProcessKind('.a5c/processes/roles/development/aspects/docs.js'),
      'aspect',
    );
    assert.strictEqual(
      determineProcessKind('.a5c/processes/roles/development/recipes/bugfix.js'),
      'recipe',
    );
    assert.strictEqual(
      determineProcessKind('.a5c/processes/roles/development/domains/packs/package.js'),
      'domain',
    );
    assert.strictEqual(determineProcessKind('.a5c/processes/roles/security.js'), 'role');
    assert.strictEqual(
      determineProcessKind('.a5c/processes/roles/development/domains/shared/rollout.js'),
      'shared',
    );
    assert.strictEqual(determineProcessKind('.a5c/processes/misc/whatever.js'), 'unknown');
  });
});
