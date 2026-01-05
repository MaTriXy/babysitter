import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function readWorkspaceFile(relPath: string): string {
  const root = path.resolve(__dirname, '..', '..');
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

suite('Run Details webview template', () => {
  test('wires Work Summaries preview to loadTextFile and renders textFile responses', () => {
    const source = readWorkspaceFile('src/extension/runDetailsView.ts');

    assert.ok(source.includes('Work Summaries'), 'expected Work Summaries section label');
    assert.ok(source.includes('id="workList"'), 'expected Work Summaries list container');
    assert.ok(source.includes('id="workPreview"'), 'expected Work Summaries preview container');

    assert.ok(
      source.includes("{ type: 'loadTextFile'") || source.includes('{ type: "loadTextFile"'),
      'expected Preview button to postMessage type loadTextFile',
    );
    assert.ok(
      source.includes("msg.type === 'textFile'") || source.includes('msg.type === "textFile"'),
      'expected webview to handle textFile responses',
    );
    assert.ok(source.includes('(truncated)'), 'expected preview to surface truncation hint');
  });
});

