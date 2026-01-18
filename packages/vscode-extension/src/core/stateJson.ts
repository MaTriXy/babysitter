import * as fs from 'fs';

import type { RunStatus } from './run';
import { normalizeRunStatus } from './runStatus';

export type StateJson = {
  runId?: string;
  status?: string;
  [key: string]: unknown;
};

export type StateJsonIssue = {
  code:
    | 'STATE_NOT_FOUND'
    | 'STATE_READ_ERROR'
    | 'STATE_INVALID_JSON'
    | 'STATE_INVALID_SHAPE'
    | 'STATE_EMPTY';
  message: string;
  detail?: string;
};

export type ReadStateJsonResult = {
  state?: StateJson;
  status: RunStatus;
  issues: StateJsonIssue[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStateObject(obj: Record<string, unknown>): StateJson {
  const state: StateJson = { ...obj };
  if (!isNonEmptyString(state.runId)) delete state.runId;
  if (!isNonEmptyString(state.status)) delete state.status;
  if (typeof state.runId === 'string') state.runId = state.runId.trim();
  if (typeof state.status === 'string') state.status = state.status.trim();
  return state;
}

export function parseStateJsonText(text: string): ReadStateJsonResult {
  const issues: StateJsonIssue[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    issues.push({
      code: 'STATE_EMPTY',
      message: 'state.json is empty (possibly still being written).',
    });
    return { status: 'unknown', issues };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      code: 'STATE_INVALID_JSON',
      message: 'state.json is not valid JSON.',
      detail: message,
    });
    return { status: 'unknown', issues };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    issues.push({ code: 'STATE_INVALID_SHAPE', message: 'state.json must be a JSON object.' });
    return { status: 'unknown', issues };
  }

  const state = normalizeStateObject(parsed as Record<string, unknown>);
  const status = normalizeRunStatus(state.status);
  return { state, status, issues };
}

export function readStateJsonFile(filePath: string): ReadStateJsonResult {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return parseStateJsonText(raw);
  } catch (err) {
    const errno = err as NodeJS.ErrnoException | undefined;
    if (errno?.code === 'ENOENT') {
      return {
        status: 'unknown',
        issues: [{ code: 'STATE_NOT_FOUND', message: 'state.json does not exist.' }],
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'unknown',
      issues: [
        { code: 'STATE_READ_ERROR', message: 'Failed to read state.json.', detail: message },
      ],
    };
  }
}
