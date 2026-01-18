import * as assert from 'assert';

import { buildGuidedPrompt } from '../core/promptBuilder';

suite('promptBuilder', () => {
  test('renders a stable prompt template', () => {
    const prompt = buildGuidedPrompt({
      processId: '.a5c/processes/roles/development/recipes/full_project.js#fullProject',
      args: { task: 'Build a VS Code extension', domain: 'package' },
      request: 'Build the full project described in requirements.md',
      attachments: ['file:///c%3A/Users/test/requirements.md'],
    });

    assert.ok(prompt.includes('# process'));
    assert.ok(
      prompt.includes('.a5c/processes/roles/development/recipes/full_project.js#fullProject'),
    );
    assert.ok(prompt.includes('```json'));
    assert.ok(prompt.includes('"task": "Build a VS Code extension"'));
    assert.ok(prompt.includes('## files'));
    assert.ok(prompt.includes('- file:///c%3A/Users/test/requirements.md'));
    assert.ok(prompt.includes('## request'));
    assert.ok(prompt.includes('Build the full project described in requirements.md'));
  });
});
