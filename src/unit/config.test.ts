import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { resolveBabysitterConfig } from '../core/config';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath: string, contents = 'test'): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

suite('config', () => {
  test('defaults runs root to .a5c/runs under workspace root', () => {
    const tempDir = makeTempDir('babysitter-config-');
    try {
      writeFile(path.join(tempDir, 'o.exe'));

      const result = resolveBabysitterConfig({
        settings: { oBinaryPath: '', oPath: '', runsRoot: '', globalConfigPath: '' },
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.deepStrictEqual(result.issues, []);
      assert.ok(result.config.oBinary);
      assert.ok(result.config.runsRoot);
      assert.strictEqual(result.config.runsRoot.source, 'default');
      assert.strictEqual(result.config.runsRoot.path, path.join(tempDir, '.a5c/runs'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('uses runsRoot setting when provided', () => {
    const tempDir = makeTempDir('babysitter-config-');
    try {
      writeFile(path.join(tempDir, 'o.exe'));

      const result = resolveBabysitterConfig({
        settings: { runsRoot: 'customRuns' },
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.deepStrictEqual(result.issues, []);
      assert.ok(result.config.runsRoot);
      assert.strictEqual(result.config.runsRoot.source, 'setting');
      assert.strictEqual(result.config.runsRoot.path, path.join(tempDir, 'customRuns'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('reads oBinaryPath and runsRoot from global config', () => {
    const tempDir = makeTempDir('babysitter-config-');
    try {
      const binDir = path.join(tempDir, 'bin');
      writeFile(path.join(binDir, 'o.exe'));

      const globalConfigPath = path.join(tempDir, 'babysitter.global.json');
      writeFile(
        globalConfigPath,
        JSON.stringify({ oBinaryPath: binDir, runsRoot: 'runs-from-global' }),
      );

      const result = resolveBabysitterConfig({
        settings: { globalConfigPath },
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.deepStrictEqual(result.issues, []);
      assert.ok(result.config.oBinary);
      assert.strictEqual(result.config.oBinary.source, 'globalConfig');
      assert.strictEqual(result.config.oBinary.path, path.join(binDir, 'o.exe'));
      assert.ok(result.config.runsRoot);
      assert.strictEqual(result.config.runsRoot.source, 'globalConfig');
      assert.strictEqual(result.config.runsRoot.path, path.join(tempDir, 'runs-from-global'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('surfaces global config JSON errors without discarding resolvable fields', () => {
    const tempDir = makeTempDir('babysitter-config-');
    try {
      writeFile(path.join(tempDir, 'o.exe'));
      const globalConfigPath = path.join(tempDir, 'broken.json');
      writeFile(globalConfigPath, '{not-json');

      const result = resolveBabysitterConfig({
        settings: { globalConfigPath },
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.ok(result.issues.some((i) => i.code === 'GLOBAL_CONFIG_INVALID_JSON'));
      assert.ok(result.config.oBinary, 'expected o binary to still resolve from workspace');
      assert.ok(result.config.runsRoot, 'expected runs root to still resolve from default');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('returns NO_WORKSPACE issue when runsRoot is relative without a workspace root', () => {
    const tempDir = makeTempDir('babysitter-config-');
    try {
      const binDir = path.join(tempDir, 'bin');
      writeFile(path.join(binDir, 'o.exe'));

      const result = resolveBabysitterConfig({
        settings: {},
        envPath: binDir,
        platform: 'win32',
      });

      assert.ok(result.issues.some((i) => i.code === 'NO_WORKSPACE'));
      assert.ok(result.config.oBinary);
      assert.strictEqual(result.config.oBinary.path, path.join(binDir, 'o.exe'));
      assert.strictEqual(result.config.runsRoot, undefined);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
