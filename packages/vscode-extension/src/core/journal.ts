import * as fs from 'fs';
import { StringDecoder } from 'string_decoder';

import { JsonlIncrementalParser, type JsonlParseError } from './jsonl';

export type JournalTailResult = {
  entries: unknown[];
  errors: JsonlParseError[];
  position: number;
  truncated: boolean;
};

/**
 * Incrementally tails and parses `journal.jsonl`.
 *
 * - Maintains a byte offset into the file, so repeated calls only read new data.
 * - Resilient to partial writes: incomplete final lines are buffered until complete.
 * - Resilient to truncation/rotation: if the file shrinks, the tailer resets and starts from 0.
 */
export class JournalTailer {
  private position = 0;
  private decoder = new StringDecoder('utf8');
  private readonly parser = new JsonlIncrementalParser();

  constructor() {}

  reset(): void {
    this.position = 0;
    this.decoder = new StringDecoder('utf8');
    this.parser.reset();
  }

  getPosition(): number {
    return this.position;
  }

  tail(filePath: string): JournalTailResult {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      const errno = err as NodeJS.ErrnoException | undefined;
      if (errno?.code === 'ENOENT') {
        return { entries: [], errors: [], position: this.position, truncated: false };
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
      return { entries: [], errors: [], position: this.position, truncated };
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
    const { records, errors } = this.parser.feed(text);
    return { entries: records, errors, position: this.position, truncated };
  }
}
