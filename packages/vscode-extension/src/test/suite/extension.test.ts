import * as assert from 'assert';
import * as vscode from 'vscode';

import { EXTENSION_ID } from './constants';

suite('Extension', () => {
  test('activates and returns API', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, 'extension not found');

    const api = (await ext.activate()) as { outputChannelName?: unknown };
    assert.ok(ext.isActive, 'extension not active after activation');
    assert.strictEqual(api.outputChannelName, 'Babysitter');
  });

  test('registers run view commands', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, 'extension not found');
    await ext.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('babysitter.openRunDetails'));
    assert.ok(commands.includes('babysitter.openRunLogs'));
    assert.ok(commands.includes('babysitter.revealRunFolder'));
  });
});
