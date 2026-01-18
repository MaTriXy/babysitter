export type JsonlParseError = Error & {
  readonly line: number;
  readonly source: string;
};

function createJsonlParseError(message: string, line: number, source: string): JsonlParseError {
  const err = new Error(message) as JsonlParseError;
  Object.defineProperties(err, {
    line: { value: line, enumerable: true },
    source: { value: source, enumerable: true },
  });
  return err;
}

/**
 * Parses newline-delimited JSON (JSONL/JSON Lines).
 *
 * - Empty/whitespace-only lines are ignored.
 * - Throws with line number and source line on invalid JSON.
 */
export function parseJsonLines(text: string): unknown[] {
  const lines = text.split(/\r?\n/);
  const results: unknown[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1;
    const raw = lines[idx] ?? '';
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    try {
      results.push(JSON.parse(trimmed) as unknown);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw createJsonlParseError(`Invalid JSON at line ${lineNo}: ${message}`, lineNo, raw);
    }
  }

  return results;
}

export type JsonlIncrementalResult = {
  records: unknown[];
  errors: JsonlParseError[];
};

/**
 * Incremental JSONL parser.
 *
 * - Designed for tailing append-only `.jsonl` logs.
 * - Keeps an internal remainder buffer for partial lines.
 * - Never throws: JSON parse errors are returned in `errors` and parsing continues.
 * - When `atEof` is true, it will attempt to parse a final non-newline-terminated line;
 *   if that line is incomplete, it is retained as the remainder without an error.
 */
export class JsonlIncrementalParser {
  private remainder = '';
  private nextLineNumber = 1;

  reset(): void {
    this.remainder = '';
    this.nextLineNumber = 1;
  }

  getRemainder(): string {
    return this.remainder;
  }

  getNextLineNumber(): number {
    return this.nextLineNumber;
  }

  feed(chunk: string): JsonlIncrementalResult {
    const records: unknown[] = [];
    const errors: JsonlParseError[] = [];

    if (chunk.length > 0) this.remainder += chunk;

    for (;;) {
      const newlineIndex = this.remainder.indexOf('\n');
      if (newlineIndex === -1) break;

      let line = this.remainder.slice(0, newlineIndex);
      this.remainder = this.remainder.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);

      const trimmed = line.trim();
      const lineNo = this.nextLineNumber++;
      if (trimmed.length === 0) continue;

      try {
        records.push(JSON.parse(trimmed) as unknown);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(
          createJsonlParseError(`Invalid JSON at line ${lineNo}: ${message}`, lineNo, line),
        );
      }
    }

    return { records, errors };
  }

  /**
   * Attempts to parse a final, non-newline-terminated line.
   *
   * Prefer not calling this for live files: some writers flush the JSON and the newline separately,
   * and parsing before the newline arrives can cause confusing line numbering.
   */
  finish(): JsonlIncrementalResult {
    const records: unknown[] = [];
    const errors: JsonlParseError[] = [];

    const trimmed = this.remainder.trim();
    if (trimmed.length === 0) {
      this.remainder = '';
      return { records, errors };
    }

    const lineNo = this.nextLineNumber;
    try {
      records.push(JSON.parse(trimmed) as unknown);
      this.remainder = '';
      this.nextLineNumber++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(
        createJsonlParseError(`Invalid JSON at line ${lineNo}: ${message}`, lineNo, this.remainder),
      );
    }

    return { records, errors };
  }
}
