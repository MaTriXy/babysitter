import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function assertAsciiOnly(fileRelPath: string): void {
  const root = path.resolve(__dirname, '..', '..');
  const abs = path.join(root, fileRelPath);
  const text = fs.readFileSync(abs, 'utf8');
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 127) continue;
    const snippet = text.slice(Math.max(0, i - 20), Math.min(text.length, i + 20));
    assert.fail(
      `Non-ASCII character (U+${code.toString(16).toUpperCase()}) found in ${fileRelPath} near: ${JSON.stringify(snippet)}`,
    );
  }
}

suite('Source sanity', () => {
  test('webview sources avoid non-ASCII characters', () => {
    assertAsciiOnly('src/extension/promptBuilderView.ts');
    assertAsciiOnly('src/extension/runDetailsView.ts');
    assertAsciiOnly('src/extension/runLogsView.ts');
  });
});
