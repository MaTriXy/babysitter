import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { spawnPtyProcess } from '../core/ptyProcess';
import { sendEnter, sendEsc } from '../core/stdinControls';

function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms.`));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}

function assertIsNumberArray(value: unknown): asserts value is number[] {
  assert.ok(Array.isArray(value) && value.every((x) => typeof x === 'number'), 'expected number[]');
}

suite('PTY stdin controls', () => {
  test('sends ESC and Enter via PTY stdin', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babysitter-pty-test-'));
    const scriptPath = path.join(tempDir, 'stdin-stub.js');

    fs.writeFileSync(
      scriptPath,
      [
        'process.stdin.resume();',
        "if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') { process.stdin.setRawMode(true); }",
        'const bytes = [];',
        "process.stdout.write('READY\\n');",
        "process.stdin.on('data', (chunk) => {",
        '  for (const b of chunk) bytes.push(b);',
        '  if (bytes.includes(27) && bytes.includes(13)) {',
        "    process.stdout.write('BYTES=' + JSON.stringify(bytes) + '\\n');",
        '    process.exit(0);',
        '  }',
        '});',
        "setTimeout(() => { process.stderr.write('TIMEOUT\\n'); process.exit(2); }, 1500);",
        '',
      ].join('\n'),
      'utf8',
    );

    const command =
      process.platform === 'win32'
        ? (() => {
            const cmdPath = path.join(tempDir, 'stdin-stub.cmd');
            fs.writeFileSync(
              cmdPath,
              `@echo off\r\n"${process.execPath}" "${scriptPath}"\r\n`,
              'utf8',
            );
            return { file: cmdPath, args: [] as string[] };
          })()
        : { file: process.execPath, args: [scriptPath] };

    const proc = spawnPtyProcess(command.file, command.args, { cwd: tempDir });
    let output = '';
    const unsubData = proc.onData((data) => {
      output += data;
    });
    const exitPromise = new Promise<{ exitCode: number; signal: number }>((resolve) => {
      proc.onExit(resolve);
    });

    try {
      await waitFor(() => output.includes('READY'), 1500);
      sendEsc(proc);
      sendEnter(proc);
      await waitFor(() => output.includes('BYTES='), 1500);

      const exit = await exitPromise;
      assert.strictEqual(
        exit.exitCode,
        0,
        `expected exit code 0, got ${exit.exitCode} (output=${output})`,
      );

      const match = output.match(/BYTES=([^\r\n]+)/);
      const payload = match?.[1];
      assert.ok(payload, `expected BYTES marker in output: ${output}`);
      const parsed: unknown = JSON.parse(payload);
      assertIsNumberArray(parsed);
      const bytes = parsed;
      assert.ok(bytes.includes(27), `expected ESC (27) in bytes: ${JSON.stringify(bytes)}`);
      assert.ok(bytes.includes(13), `expected CR (13) in bytes: ${JSON.stringify(bytes)}`);
    } finally {
      unsubData();
      proc.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
