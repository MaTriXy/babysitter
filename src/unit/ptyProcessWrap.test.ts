import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { wrapCommandForPlatform } from '../core/ptyProcess';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

suite('ptyProcess command wrapping', () => {
  test('wraps bash-shebang scripts with bash on win32', () => {
    const tempDir = makeTempDir('babysitter-pty-wrap-');
    try {
      const scriptPath = path.join(tempDir, 'o');
      fs.writeFileSync(scriptPath, '#!/usr/bin/env bash\necho ok\n', 'utf8');

      const wrapped = wrapCommandForPlatform({
        filePath: scriptPath,
        args: ['arg1', 'arg2'],
        platform: 'win32',
      });

      assert.strictEqual(wrapped.filePath, 'bash');
      assert.deepStrictEqual(wrapped.args, [scriptPath, 'arg1', 'arg2']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('does not wrap normal windows executables', () => {
    const wrapped = wrapCommandForPlatform({
      filePath: 'C:\\path\\to\\o.exe',
      args: ['x'],
      platform: 'win32',
    });
    assert.strictEqual(wrapped.filePath, 'C:\\path\\to\\o.exe');
    assert.deepStrictEqual(wrapped.args, ['x']);
  });
});

