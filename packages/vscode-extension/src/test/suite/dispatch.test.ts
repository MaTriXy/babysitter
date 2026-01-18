import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as vscode from 'vscode';

import { EXTENSION_ID } from './constants';

function createOBinaryShim(tempDir: string, argsOutputPath: string): string {
  const shimScriptPath = path.join(tempDir, 'o-shim.js');
  const runId = 'run-20990101-000000';

  fs.writeFileSync(
    shimScriptPath,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      '',
      `const argsOutputPath = ${JSON.stringify(argsOutputPath)};`,
      `const runId = ${JSON.stringify(runId)};`,
      "const promptArg = process.argv.slice(2).join(' ');",
      'fs.writeFileSync(argsOutputPath, JSON.stringify({ argv: process.argv.slice(2), promptArg }, null, 2));',
      '',
      "const runsRoot = path.join(process.cwd(), '.a5c', 'runs');",
      'const runRoot = path.join(runsRoot, runId);',
      'fs.mkdirSync(runRoot, { recursive: true });',
      '',
      'console.error(`created run ${runId}`);',
      'console.log(`runRoot=${runRoot}`);',
      'process.exit(0);',
      '',
    ].join('\n'),
    'utf8',
  );

  if (process.platform === 'win32') {
    const shimCmdPath = path.join(tempDir, 'o.cmd');
    fs.writeFileSync(shimCmdPath, `@echo off\r\nnode "${shimScriptPath}" %*\r\n`, 'utf8');
    return shimCmdPath;
  }

  const shimShPath = path.join(tempDir, 'o');
  fs.writeFileSync(shimShPath, `#!/usr/bin/env bash\nnode '${shimScriptPath}' "$@"\n`, 'utf8');
  fs.chmodSync(shimShPath, 0o755);
  return shimShPath;
}

suite('Dispatch', () => {
  test('dispatches via configured `o` binary and parses run info', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, 'extension not found');
    await ext.activate();

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'test workspace not opened');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babysitter-o-shim-'));
    const argsOutputPath = path.join(tempDir, 'args.json');
    const shimPath = createOBinaryShim(tempDir, argsOutputPath);

    const cfg = vscode.workspace.getConfiguration('babysitter');
    await cfg.update('o.binaryPath', shimPath, vscode.ConfigurationTarget.Workspace);
    await cfg.update('runsRoot', '.a5c/runs', vscode.ConfigurationTarget.Workspace);

    const prompt = 'dispatch integration test prompt';
    const previousHeadless = process.env.BABYSITTER_HEADLESS;
    process.env.BABYSITTER_HEADLESS = '1';
    const result = await (async () => {
      try {
        return await vscode.commands.executeCommand<{
          runId: string;
          runRootPath: string;
          stdout: string;
          stderr: string;
        }>('babysitter.dispatchRun', { prompt });
      } finally {
        process.env.BABYSITTER_HEADLESS = previousHeadless;
      }
    })();

    assert.ok(result.runRootPath.includes(result.runId), 'expected run root to include run id');
    assert.ok(result.stdout.includes('runRoot='), 'expected output to contain runRoot marker');
    assert.ok(result.stdout.includes('created run'), 'expected output to contain created marker');
    assert.ok(fs.existsSync(result.runRootPath), 'expected run directory to be created by shim');

    const argsJson = JSON.parse(fs.readFileSync(argsOutputPath, 'utf8')) as { promptArg?: unknown };
    assert.strictEqual(argsJson.promptArg, prompt, 'expected prompt to be passed to o');
  });
});
