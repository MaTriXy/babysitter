import * as fs from 'fs';
import { StringDecoder } from 'string_decoder';

import { TextLineIncrementalParser } from './textLines';

export type TextTailResult = {
  lines: string[];
  position: number;
  truncated: boolean;
};

/**
 * Incrementally tails plain-text logs.
 *
 * - Maintains a byte offset into the file, so repeated calls only read new data.
 * - Resilient to partial writes: incomplete final lines are buffered until complete.
 * - Resilient to truncation/rotation: if the file shrinks, the tailer resets and starts from 0.
 */
export class TextFileTailer {
  private position = 0;
  private decoder = new StringDecoder('utf8');
  private readonly parser = new TextLineIncrementalParser();

  reset(): void {
    this.position = 0;
    this.decoder = new StringDecoder('utf8');
    this.parser.reset();
  }

  /**
   * Resets internal state but keeps a non-zero starting position. Useful for seeding from end-of-file.
   * Prefer using this with a byte offset that starts on a safe boundary (e.g., 0 or `size - N`).
   */
  seek(position: number): void {
    this.position = Math.max(0, position);
    this.decoder = new StringDecoder('utf8');
    this.parser.reset();
  }

  getPosition(): number {
    return this.position;
  }

  tail(filePath: string): TextTailResult {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      const errno = err as NodeJS.ErrnoException | undefined;
      if (errno?.code === 'ENOENT') {
        return { lines: [], position: this.position, truncated: false };
      }
      throw err;
    }

    const size = stat.size;
    let truncated = false;
    if (size < this.position) {
      this.reset();
      truncated = true;
    }

    if (size === this.position) {
      return { lines: [], position: this.position, truncated };
    }

    const bytesToRead = size - this.position;
    const buffer = Buffer.allocUnsafe(bytesToRead);
    let bytesRead = 0;
    const fd = fs.openSync(filePath, 'r');
    try {
      bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, this.position);
    } finally {
      fs.closeSync(fd);
    }

    this.position += bytesRead;
    const text = this.decoder.write(buffer.subarray(0, bytesRead));
    const { lines } = this.parser.feed(text);
    return { lines, position: this.position, truncated };
  }
}
