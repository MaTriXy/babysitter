import * as assert from 'assert';

import { formatRunStatus, runStatusThemeIconId } from '../core/runPresentation';

suite('runPresentation', () => {
  test('formats statuses for UI', () => {
    assert.strictEqual(formatRunStatus('running'), 'Running');
    assert.strictEqual(formatRunStatus('completed'), 'Completed');
    assert.strictEqual(formatRunStatus('failed'), 'Failed');
    assert.strictEqual(formatRunStatus('paused'), 'Paused');
    assert.strictEqual(formatRunStatus('canceled'), 'Canceled');
    assert.strictEqual(formatRunStatus('unknown'), 'Unknown');
  });

  test('maps statuses to theme icon ids', () => {
    assert.strictEqual(runStatusThemeIconId('running'), 'play-circle');
    assert.strictEqual(runStatusThemeIconId('completed'), 'check');
    assert.strictEqual(runStatusThemeIconId('failed'), 'error');
    assert.strictEqual(runStatusThemeIconId('paused'), 'debug-pause');
    assert.strictEqual(runStatusThemeIconId('canceled'), 'circle-slash');
    assert.strictEqual(runStatusThemeIconId('unknown'), 'question');
  });
});
