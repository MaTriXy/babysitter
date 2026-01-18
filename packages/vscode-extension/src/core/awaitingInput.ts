import type { StateJson } from './stateJson';

export type AwaitingInputSource = 'state' | 'journal' | 'process';

export type AwaitingInputStatus = {
  awaiting: true;
  source: AwaitingInputSource;
  /**
   * Best-effort extraction of the question/prompt being asked of the user.
   * Intended for display in the UI; may be absent.
   */
  prompt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
}

export function detectAwaitingInputFromState(state?: StateJson): AwaitingInputStatus | undefined {
  if (!state || !isRecord(state)) return undefined;

  const active = isRecord(state.active) ? state.active : undefined;

  const candidateFlags: unknown[] = [
    state.awaitingUserInput,
    state.awaiting_user_input,
    state.waitingForUserInput,
    state.waiting_for_user_input,
    state.needsUserInput,
    state.needs_user_input,
    state.inputRequired,
    state.input_required,
    state.paused,
    active?.awaitingUserInput,
    active?.awaiting_user_input,
    active?.waitingForUserInput,
    active?.inputRequired,
  ];

  const awaiting = candidateFlags.some((flag) => coerceBoolean(flag) === true);
  if (!awaiting) return undefined;

  const prompt = firstNonEmptyString(
    state.prompt,
    state.message,
    state.question,
    active?.prompt,
    active?.message,
    active?.question,
  );

  return { awaiting: true, source: 'state', ...(prompt ? { prompt } : {}) };
}

function isInputRelatedToken(token: string): boolean {
  const t = token.toLowerCase();
  return (
    t.includes('breakpoint') ||
    t.includes('await') ||
    t.includes('user_input') ||
    t.includes('user-input') ||
    t.includes('input_required') ||
    t.includes('input-required') ||
    t.includes('needs_input') ||
    t.includes('needs-input') ||
    t.includes('prompt') ||
    t.includes('feedback') ||
    t.includes('steer')
  );
}

function extractPromptFromJournalEntry(entry: Record<string, unknown>): string | undefined {
  const data = isRecord(entry.data) ? entry.data : undefined;
  return firstNonEmptyString(
    entry.prompt,
    entry.message,
    entry.question,
    data?.prompt,
    data?.message,
    data?.question,
    data?.text,
  );
}

/**
 * Heuristically detects "awaiting user input" from journal records.
 * Journal formats vary by `o` version; this intentionally stays permissive.
 */
export function detectAwaitingInputFromJournal(
  entries: readonly unknown[],
): AwaitingInputStatus | undefined {
  if (entries.length === 0) return undefined;

  for (let i = entries.length - 1; i >= 0; i--) {
    const raw = entries[i];
    if (!isRecord(raw)) continue;
    const entry = raw;

    const typeToken = typeof entry.type === 'string' ? entry.type : undefined;
    const eventToken = typeof entry.event === 'string' ? entry.event : undefined;
    const statusToken = typeof entry.status === 'string' ? entry.status : undefined;

    const tokens = [typeToken, eventToken, statusToken].filter(
      (t): t is string => typeof t === 'string' && t.trim().length > 0,
    );
    if (tokens.length === 0) continue;
    if (!tokens.some(isInputRelatedToken)) continue;

    const prompt = extractPromptFromJournalEntry(entry);
    return { awaiting: true, source: 'journal', ...(prompt ? { prompt } : {}) };
  }

  return undefined;
}

function endsWithNewline(text: string): boolean {
  return text.endsWith('\n') || text.endsWith('\r');
}

function isLikelyInteractivePrompt(line: string): boolean {
  const trimmed = line.trimEnd();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('press enter') ||
    lower.includes('hit enter') ||
    lower.includes('awaiting input') ||
    lower.includes('awaiting user input') ||
    lower.includes('waiting for input') ||
    lower.includes('waiting for your input') ||
    (lower.includes('provide') && lower.includes('feedback'))
  ) {
    return true;
  }

  // Common CLI prompts: "Question: " / "Continue? " / "Runner [x]: "
  if (/[?:]\s*$/.test(trimmed)) return true;
  if (/\]\s*$/.test(trimmed) && /\]\s*:?$/.test(trimmed)) return true;

  return false;
}

/**
 * Detects whether recent `o` stdout/stderr looks like it's currently blocked on user input.
 * Works best with PTY output where prompts may not end with a newline.
 */
export function detectAwaitingInputFromProcessOutput(
  output: string,
): AwaitingInputStatus | undefined {
  if (typeof output !== 'string' || output.length === 0) return undefined;
  if (endsWithNewline(output)) return undefined;

  const tail = output.slice(-4000);
  const lines = tail.split(/\r?\n/);
  const lastLine = lines[lines.length - 1] ?? '';
  if (!isLikelyInteractivePrompt(lastLine)) return undefined;

  const prompt = lastLine.trimEnd();
  return { awaiting: true, source: 'process', ...(prompt ? { prompt } : {}) };
}
