export class DebouncedBatcher<T> {
  private timer: NodeJS.Timeout | undefined;
  private items: T[] = [];

  public constructor(
    private readonly debounceMs: number,
    private readonly onFlush: (items: T[]) => void,
  ) {
    if (!Number.isFinite(debounceMs) || debounceMs < 0) {
      throw new Error(`debounceMs must be a non-negative finite number (got ${debounceMs})`);
    }
  }

  public push(item: T): void {
    this.items.push(item);
    this.schedule();
  }

  public flushNow(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;

    if (this.items.length === 0) return;
    const batch = this.items;
    this.items = [];
    this.onFlush(batch);
  }

  public dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.items = [];
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flushNow(), this.debounceMs);
  }
}
