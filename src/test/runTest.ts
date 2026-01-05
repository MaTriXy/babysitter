import * as path from 'path';

import { runTests } from '@vscode/test-electron';

function isHeadlessRun(): boolean {
  return (
    process.argv.includes('--headless') ||
    process.env.BABYSITTER_HEADLESS === '1' ||
    process.env.CI === 'true'
  );
}

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const testWorkspacePath = path.resolve(extensionDevelopmentPath, 'src/test/fixtures/workspace');

  const headless = isHeadlessRun();
  const launchArgs = ['--disable-extensions', testWorkspacePath];
  if (headless) {
    launchArgs.push('--headless', '--disable-gpu');
    if (process.platform === 'linux') {
      launchArgs.push('--no-sandbox');
    }
  }

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs,
  });
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to run tests', err);
  process.exit(1);
});
