import { detectAwaitingInputFromProcessOutput, type AwaitingInputStatus } from './awaitingInput';
import type { PtyProcess } from './ptyProcess';
import { ENTER, ESC } from './stdinControls';

export type OProcessInteractionChange = {
  pid: number;
  runId?: string;
  awaitingInput?: AwaitingInputStatus;
};

export type OProcessOutputEvent = {
  pid: number;
  label: string;
  runId?: string;
  chunk: string;
};

type ProcessEntry = {
  process: PtyProcess;
  label: string;
  outputTail: string;
  awaitingInput: AwaitingInputStatus | undefined;
  runId: string | undefined;
  disposeData: () => void;
  disposeExit: () => void;
};

export class OProcessInteractionTracker {
  private readonly maxOutputChars: number;
  private readonly processesByPid = new Map<number, ProcessEntry>();
  private readonly pidByRunId = new Map<string, number>();
  private readonly changeHandlers = new Set<(change: OProcessInteractionChange) => void>();
  private readonly outputHandlers = new Set<(event: OProcessOutputEvent) => void>();
  private activePid: number | undefined;

  constructor(options?: { maxOutputChars?: number }) {
    this.maxOutputChars = options?.maxOutputChars ?? 12_000;
  }

  onDidChange(handler: (change: OProcessInteractionChange) => void): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  onDidOutput(handler: (event: OProcessOutputEvent) => void): () => void {
    this.outputHandlers.add(handler);
    return () => this.outputHandlers.delete(handler);
  }

  private emit(change: OProcessInteractionChange): void {
    for (const handler of this.changeHandlers) handler(change);
  }

  private emitOutput(event: OProcessOutputEvent): void {
    for (const handler of this.outputHandlers) handler(event);
  }

  register(process: PtyProcess, label: string): void {
    const pid = process.pid;
    this.activePid = pid;

    const existing = this.processesByPid.get(pid);
    if (existing) this.unregister(pid);

    const entry: ProcessEntry = {
      process,
      label,
      outputTail: '',
      awaitingInput: undefined,
      runId: undefined,
      disposeData: () => undefined,
      disposeExit: () => undefined,
    };

    entry.disposeData = process.onData((chunk) => {
      entry.outputTail = `${entry.outputTail}${chunk}`;
      if (entry.outputTail.length > this.maxOutputChars) {
        entry.outputTail = entry.outputTail.slice(-this.maxOutputChars);
      }

      this.emitOutput({
        pid,
        label: entry.label,
        ...(entry.runId ? { runId: entry.runId } : {}),
        chunk,
      });

      const nextAwaiting = detectAwaitingInputFromProcessOutput(entry.outputTail);
      const prevPrompt = entry.awaitingInput?.prompt;
      const nextPrompt = nextAwaiting?.prompt;
      const changed =
        (entry.awaitingInput?.awaiting ?? false) !== (nextAwaiting?.awaiting ?? false) ||
        prevPrompt !== nextPrompt;
      entry.awaitingInput = nextAwaiting;

      if (changed) {
        this.emit({
          pid,
          ...(entry.runId ? { runId: entry.runId } : {}),
          ...(entry.awaitingInput ? { awaitingInput: entry.awaitingInput } : {}),
        });
      }
    });

    entry.disposeExit = process.onExit(() => {
      this.unregister(pid);
    });

    this.processesByPid.set(pid, entry);
    this.emit({ pid, ...(entry.awaitingInput ? { awaitingInput: entry.awaitingInput } : {}) });
  }

  unregister(pid: number): void {
    const entry = this.processesByPid.get(pid);
    if (!entry) return;
    this.processesByPid.delete(pid);
    if (entry.runId) this.pidByRunId.delete(entry.runId);
    if (this.activePid === pid) this.activePid = undefined;
    try {
      entry.disposeData();
    } finally {
      entry.disposeExit();
    }
    this.emit({ pid, ...(entry.runId ? { runId: entry.runId } : {}) });
  }

  /**
   * Detaches listeners from all tracked processes without terminating them.
   * Intended for extension deactivation.
   */
  detachAll(): void {
    for (const [pid, entry] of this.processesByPid.entries()) {
      try {
        entry.disposeData();
      } finally {
        entry.disposeExit();
      }
      try {
        entry.process.detach();
      } catch {
        // ignore
      }
      this.emit({ pid, ...(entry.runId ? { runId: entry.runId } : {}) });
    }
    this.processesByPid.clear();
    this.pidByRunId.clear();
    this.activePid = undefined;
  }

  setRunIdForPid(pid: number, runId: string): void {
    const entry = this.processesByPid.get(pid);
    if (!entry) return;
    entry.runId = runId;
    this.pidByRunId.set(runId, pid);
    this.emit({
      pid,
      runId,
      ...(entry.awaitingInput ? { awaitingInput: entry.awaitingInput } : {}),
    });
  }

  setLabelForPid(pid: number, label: string): void {
    const entry = this.processesByPid.get(pid);
    if (!entry) return;
    entry.label = label;
  }

  getActivePid(): number | undefined {
    return this.activePid;
  }

  getProcessByPid(pid: number): { process: PtyProcess; label: string } | undefined {
    const entry = this.processesByPid.get(pid);
    if (!entry) return undefined;
    return { process: entry.process, label: entry.label };
  }

  getAwaitingInputForRunId(runId: string): AwaitingInputStatus | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.processesByPid.get(pid)?.awaitingInput;
  }

  getOutputTailForRunId(runId: string): string | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.processesByPid.get(pid)?.outputTail;
  }

  getPidForRunId(runId: string): number | undefined {
    return this.pidByRunId.get(runId);
  }

  getLabelForRunId(runId: string): string | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.processesByPid.get(pid)?.label;
  }

  private sendToPid(pid: number, data: string): { pid: number; label: string } | undefined {
    const entry = this.processesByPid.get(pid);
    if (!entry) return undefined;
    entry.process.write(data);
    return { pid, label: entry.label };
  }

  sendUserInputToActive(text: string): { pid: number; label: string } | undefined {
    const pid = this.activePid;
    if (pid === undefined) return undefined;
    return this.sendToPid(pid, `${text}${ENTER}`);
  }

  sendUserInputToRunId(runId: string, text: string): { pid: number; label: string } | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.sendToPid(pid, `${text}${ENTER}`);
  }

  sendEscToActive(): { pid: number; label: string } | undefined {
    const pid = this.activePid;
    if (pid === undefined) return undefined;
    return this.sendToPid(pid, ESC);
  }

  sendEnterToActive(): { pid: number; label: string } | undefined {
    const pid = this.activePid;
    if (pid === undefined) return undefined;
    return this.sendToPid(pid, ENTER);
  }

  sendEscToRunId(runId: string): { pid: number; label: string } | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.sendToPid(pid, ESC);
  }

  sendEnterToRunId(runId: string): { pid: number; label: string } | undefined {
    const pid = this.pidByRunId.get(runId);
    if (!pid) return undefined;
    return this.sendToPid(pid, ENTER);
  }
}
