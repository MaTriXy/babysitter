import type { RunStatus } from './run';

export function normalizeRunStatus(raw: unknown): RunStatus {
  if (typeof raw !== 'string') return 'unknown';
  const value = raw.trim().toLowerCase();
  switch (value) {
    case 'running':
      return 'running';
    case 'completed':
    case 'complete':
    case 'success':
    case 'succeeded':
      return 'completed';
    case 'failed':
    case 'error':
      return 'failed';
    case 'paused':
      return 'paused';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return 'unknown';
  }
}
