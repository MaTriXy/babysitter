import * as fs from 'fs';

import { TextFileTailer } from './textTailer';

export type WorkSummaryTailEvent =
  | {
      type: 'set';
      fsPath: string;
      content: string;
      truncated: boolean;
      empty: boolean;
      size: number;
    }
  | { type: 'error'; fsPath: string; message: string };

function trimToMaxChars(text: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

function joinLines(lines: readonly string[]): string {
  if (lines.length === 0) return '';
  return `${lines.join('\n')}\n`;
}

function statSizeOrThrow(filePath: string): number {
  const stat = fs.statSync(filePath);
  return stat.isFile() ? stat.size : 0;
}

export class WorkSummaryTailSession {
  private readonly tailer = new TextFileTailer();
  private fsPath = '';
  private text = '';
  private seededFromOffset = 0;

  private readonly maxBytes: number;
  private readonly maxChars: number;

  constructor(opts?: { maxBytes?: number; maxChars?: number }) {
    this.maxBytes = Math.max(0, opts?.maxBytes ?? 200_000);
    this.maxChars = Math.max(0, opts?.maxChars ?? 200_000);
  }

  start(fsPath: string): WorkSummaryTailEvent {
    this.fsPath = fsPath;
    this.tailer.reset();
    this.text = '';
    this.seededFromOffset = 0;

    let size: number;
    try {
      size = statSizeOrThrow(fsPath);
    } catch (err) {
      const errno = err as NodeJS.ErrnoException | undefined;
      if (errno?.code === 'ENOENT') {
        return { type: 'error', fsPath, message: 'File not found.' };
      }
      return { type: 'error', fsPath, message: errno?.message ?? String(err) };
    }

    const start = Math.max(0, size - this.maxBytes);
    this.seededFromOffset = start;
    this.tailer.seek(start);
    const seeded = this.tailer.tail(fsPath);
    this.text = trimToMaxChars(joinLines(seeded.lines), this.maxChars);

    return {
      type: 'set',
      fsPath,
      content: this.text,
      truncated: start > 0 || seeded.truncated,
      empty: this.text.length === 0,
      size,
    };
  }

  poll(): WorkSummaryTailEvent | undefined {
    if (!this.fsPath) return undefined;

    let size: number;
    try {
      size = statSizeOrThrow(this.fsPath);
    } catch (err) {
      const errno = err as NodeJS.ErrnoException | undefined;
      if (errno?.code === 'ENOENT') {
        return { type: 'error', fsPath: this.fsPath, message: 'File not found.' };
      }
      return { type: 'error', fsPath: this.fsPath, message: errno?.message ?? String(err) };
    }

    const res = this.tailer.tail(this.fsPath);
    if (!res.truncated && res.lines.length === 0) return undefined;

    if (res.truncated) {
      this.seededFromOffset = 0;
      this.text = '';
    }

    const delta = joinLines(res.lines);
    if (delta) this.text = trimToMaxChars(this.text + delta, this.maxChars);

    return {
      type: 'set',
      fsPath: this.fsPath,
      content: this.text,
      truncated: this.seededFromOffset > 0 || res.truncated,
      empty: this.text.length === 0,
      size,
    };
  }

  getText(): string {
    return this.text;
  }
}
