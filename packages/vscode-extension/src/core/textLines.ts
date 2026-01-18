export type TextLineIncrementalResult = {
  lines: string[];
};

/**
 * Incremental newline-based text parser.
 *
 * - Keeps an internal remainder buffer for partial lines.
 * - Splits on `\n`, tolerates Windows `\r\n` (strips trailing `\r`).
 * - Does not emit the final unterminated line until a newline arrives.
 */
export class TextLineIncrementalParser {
  private remainder = '';

  reset(): void {
    this.remainder = '';
  }

  getRemainder(): string {
    return this.remainder;
  }

  feed(chunk: string): TextLineIncrementalResult {
    const lines: string[] = [];
    if (chunk.length > 0) this.remainder += chunk;

    for (;;) {
      const newlineIndex = this.remainder.indexOf('\n');
      if (newlineIndex === -1) break;

      let line = this.remainder.slice(0, newlineIndex);
      this.remainder = this.remainder.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      lines.push(line);
    }

    return { lines };
  }
}
