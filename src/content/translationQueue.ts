export type QueuePriority = 0 | 1 | 2;

export interface TranslationQueueItem<T> {
  id: string;
  priority: QueuePriority;
  distance: number;
  value: T;
}

export interface TranslationQueueOptions<T> {
  batchSize: number;
  concurrency: number;
  worker: (items: T[]) => Promise<void>;
}

export class TranslationQueue<T> {
  readonly #batchSize: number;
  readonly #concurrency: number;
  readonly #worker: (items: T[]) => Promise<void>;
  readonly #pending = new Map<string, TranslationQueueItem<T>>();
  #running = 0;
  #cancelled = false;

  constructor(options: TranslationQueueOptions<T>) {
    this.#batchSize = options.batchSize;
    this.#concurrency = options.concurrency;
    this.#worker = options.worker;
  }

  enqueue(items: TranslationQueueItem<T>[]): void {
    this.#cancelled = false;
    for (const item of items) {
      const existing = this.#pending.get(item.id);
      if (!existing || compareQueueItems(item, existing) < 0) {
        this.#pending.set(item.id, item);
      }
    }
    void this.#drain();
  }

  clear(): void {
    this.#cancelled = true;
    this.#pending.clear();
  }

  get size(): number {
    return this.#pending.size;
  }

  #drain(): void {
    while (!this.#cancelled && this.#running < this.#concurrency && this.#pending.size > 0) {
      const batch = this.#takeBatch();
      this.#running += 1;
      void this.#worker(batch)
        .catch(() => undefined)
        .finally(() => {
          this.#running -= 1;
          this.#drain();
        });
    }
  }

  #takeBatch(): T[] {
    const batch = [...this.#pending.values()].sort(compareQueueItems).slice(0, this.#batchSize);
    for (const item of batch) {
      this.#pending.delete(item.id);
    }
    return batch.map((item) => item.value);
  }
}

export function compareQueueItems<T>(left: TranslationQueueItem<T>, right: TranslationQueueItem<T>): number {
  return left.priority - right.priority || left.distance - right.distance || left.id.localeCompare(right.id);
}
