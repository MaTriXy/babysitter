import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

function isHeadlessRun(): boolean {
  return (
    process.argv.includes('--headless') ||
    process.env.BABYSITTER_HEADLESS === '1' ||
    process.env.CI === 'true'
  );
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const fixtureWorkspacePath = path.resolve(
    extensionDevelopmentPath,
    'src/test/fixtures/workspace',
  );
  const tempRoot = makeTempDir('babysitter-vscode-workspace-');
  const testWorkspacePath = path.join(tempRoot, 'workspace');
  fs.cpSync(fixtureWorkspacePath, testWorkspacePath, { recursive: true });

  const headless = isHeadlessRun();
  const launchArgs = ['--disable-extensions', testWorkspacePath];
  if (headless) {
    launchArgs.push('--headless', '--disable-gpu');
    if (process.platform === 'linux') {
      launchArgs.push('--no-sandbox');
    }
  }

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to run tests', err);
  process.exit(1);
});
