import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { resolveOBinaryPath } from '../core/oBinary';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath: string): void {
  fs.writeFileSync(filePath, 'test');
}

suite('oBinary', () => {
  test('prefers configured path when set', () => {
    const tempDir = makeTempDir('babysitter-oBinary-');
    try {
      const configured = path.join(tempDir, 'custom-o.exe');
      writeFile(configured);

      const resolved = resolveOBinaryPath({
        configuredPath: configured,
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.ok(resolved);
      assert.strictEqual(resolved.source, 'setting');
      assert.strictEqual(resolved.path, configured);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('finds o in workspace root when present', () => {
    const tempDir = makeTempDir('babysitter-oBinary-');
    try {
      const oExe = path.join(tempDir, 'o.exe');
      writeFile(oExe);

      const resolved = resolveOBinaryPath({
        workspaceRoot: tempDir,
        envPath: '',
        platform: 'win32',
      });

      assert.ok(resolved);
      assert.strictEqual(resolved.source, 'workspace');
      assert.strictEqual(resolved.path, oExe);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('finds o on PATH when present', () => {
    const tempDir = makeTempDir('babysitter-oBinary-');
    try {
      const binDir = path.join(tempDir, 'bin');
      fs.mkdirSync(binDir);
      const oExe = path.join(binDir, 'o.exe');
      writeFile(oExe);

      const resolved = resolveOBinaryPath({
        envPath: binDir,
        platform: 'win32',
      });

      assert.ok(resolved);
      assert.strictEqual(resolved.source, 'path');
      assert.strictEqual(resolved.path, oExe);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
