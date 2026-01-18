import type { RunStatus } from './run';

export function formatRunStatus(status: RunStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'paused':
      return 'Paused';
    case 'canceled':
      return 'Canceled';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

export function runStatusThemeIconId(status: RunStatus): string {
  switch (status) {
    case 'running':
      return 'play-circle';
    case 'completed':
      return 'check';
    case 'failed':
      return 'error';
    case 'paused':
      return 'debug-pause';
    case 'canceled':
      return 'circle-slash';
    case 'unknown':
    default:
      return 'question';
  }
}
