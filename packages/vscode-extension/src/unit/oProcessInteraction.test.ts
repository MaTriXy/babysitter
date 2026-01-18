import * as assert from 'assert';

import { OProcessInteractionTracker } from '../core/oProcessInteraction';
import type { PtyExitEvent, PtyProcess } from '../core/ptyProcess';

class FakePtyProcess implements PtyProcess {
  readonly pid: number;
  readonly writes: string[] = [];
  private readonly dataHandlers = new Set<(data: string) => void>();
  private readonly exitHandlers = new Set<(event: PtyExitEvent) => void>();

  constructor(pid: number) {
    this.pid = pid;
  }

  write(data: string): void {
    this.writes.push(data);
  }

  onData(handler: (data: string) => void): () => void {
    this.dataHandlers.add(handler);
    return () => this.dataHandlers.delete(handler);
  }

  onExit(handler: (event: PtyExitEvent) => void): () => void {
    this.exitHandlers.add(handler);
    return () => this.exitHandlers.delete(handler);
  }

  emitData(data: string): void {
    for (const handler of this.dataHandlers) handler(data);
  }

  emitExit(event: PtyExitEvent = { exitCode: 0, signal: 0 }): void {
    for (const handler of this.exitHandlers) handler(event);
  }

  kill(): void {
    this.emitExit({ exitCode: 0, signal: 0 });
  }

  detach(): void {
    this.dataHandlers.clear();
    this.exitHandlers.clear();
  }

  dispose(): void {
    this.detach();
  }
}

suite('OProcessInteractionTracker', () => {
  test('detects prompts from output and allows responding (simulated session)', () => {
    const runId = 'run-20260105-010206';
    const tracker = new OProcessInteractionTracker({ maxOutputChars: 2000 });
    const proc = new FakePtyProcess(123);

    const changes: Array<{ runId: string | undefined; prompt: string | undefined }> = [];
    tracker.onDidChange((change) => {
      changes.push({ runId: change.runId, prompt: change.awaitingInput?.prompt });
    });

    tracker.register(proc, 'o (test)');
    tracker.setRunIdForPid(proc.pid, runId);

    proc.emitData('Need input: ');
    const awaiting = tracker.getAwaitingInputForRunId(runId);
    assert.ok(awaiting, 'expected awaiting input');
    assert.strictEqual(awaiting?.source, 'process');
    assert.strictEqual(awaiting?.prompt, 'Need input:');

    const sent = tracker.sendUserInputToRunId(runId, 'hello');
    assert.ok(sent, 'expected send to succeed');
    assert.deepStrictEqual(proc.writes, ['hello\r']);

    proc.emitData('hello\r\n');
    assert.strictEqual(tracker.getAwaitingInputForRunId(runId), undefined);

    assert.ok(
      changes.some((c) => c.runId === runId && c.prompt === 'Need input:'),
      'expected prompt change',
    );
  });

  test('streams output events and exposes output tail by runId', () => {
    const runId = 'run-20260105-010206';
    const tracker = new OProcessInteractionTracker({ maxOutputChars: 20 });
    const proc = new FakePtyProcess(999);

    const outputs: Array<{ runId: string | undefined; chunk: string }> = [];
    tracker.onDidOutput((evt) => outputs.push({ runId: evt.runId, chunk: evt.chunk }));

    tracker.register(proc, 'o (test)');
    tracker.setRunIdForPid(proc.pid, runId);

    proc.emitData('hello');
    proc.emitData('\nworld\n');

    const tail = tracker.getOutputTailForRunId(runId);
    assert.ok(tail?.includes('hello'), 'expected output tail to include hello');
    assert.ok(
      outputs.some((o) => o.runId === runId && o.chunk === 'hello'),
      'expected output event for hello',
    );
  });

  test('returns undefined when sending to unknown runId', () => {
    const tracker = new OProcessInteractionTracker();
    assert.strictEqual(tracker.sendUserInputToRunId('run-20260105-010206', 'x'), undefined);
  });
});
