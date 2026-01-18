import * as assert from 'assert';

import { DebouncedBatcher } from '../core/debouncedBatcher';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

suite('DebouncedBatcher', () => {
  test('flushes once after the debounce window', async () => {
    const batches: number[][] = [];
    const batcher = new DebouncedBatcher<number>(50, (items) => batches.push(items));

    batcher.push(1);
    batcher.push(2);
    batcher.push(3);

    await sleep(120);
    batcher.dispose();

    assert.strictEqual(batches.length, 1);
    assert.deepStrictEqual(batches[0], [1, 2, 3]);
  });

  test('debounces by resetting the timer on each push', async () => {
    const batches: number[][] = [];
    const batcher = new DebouncedBatcher<number>(80, (items) => batches.push(items));

    batcher.push(1);
    await sleep(50);
    batcher.push(2);

    await sleep(140);
    batcher.dispose();

    assert.strictEqual(batches.length, 1);
    assert.deepStrictEqual(batches[0], [1, 2]);
  });

  test('flushNow flushes immediately and starts a new batch', async () => {
    const batches: number[][] = [];
    const batcher = new DebouncedBatcher<number>(200, (items) => batches.push(items));

    batcher.push(1);
    batcher.flushNow();
    assert.deepStrictEqual(batches, [[1]]);

    batcher.push(2);
    await sleep(260);
    batcher.dispose();

    assert.deepStrictEqual(batches, [[1], [2]]);
  });

  test('dispose cancels pending flushes', async () => {
    const batches: number[][] = [];
    const batcher = new DebouncedBatcher<number>(50, (items) => batches.push(items));

    batcher.push(1);
    batcher.dispose();
    await sleep(120);

    assert.deepStrictEqual(batches, []);
  });
});
