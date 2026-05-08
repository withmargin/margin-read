import { describe, expect, it, vi } from "vitest";
import { compareQueueItems, TranslationQueue, type TranslationQueueItem } from "./translationQueue";

describe("compareQueueItems", () => {
  it("prioritizes lower priority values before distance", () => {
    const low: TranslationQueueItem<string> = { id: "low", priority: 2, distance: 0, value: "low" };
    const high: TranslationQueueItem<string> = { id: "high", priority: 0, distance: 500, value: "high" };

    expect([low, high].sort(compareQueueItems).map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("uses viewport distance within the same priority", () => {
    const far: TranslationQueueItem<string> = { id: "far", priority: 1, distance: 500, value: "far" };
    const near: TranslationQueueItem<string> = { id: "near", priority: 1, distance: 10, value: "near" };

    expect([far, near].sort(compareQueueItems).map((item) => item.id)).toEqual(["near", "far"]);
  });

  it("uses id as a stable final tiebreaker", () => {
    const b: TranslationQueueItem<string> = { id: "b", priority: 1, distance: 10, value: "b" };
    const a: TranslationQueueItem<string> = { id: "a", priority: 1, distance: 10, value: "a" };

    expect([b, a].sort(compareQueueItems).map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("TranslationQueue", () => {
  it("runs batches in priority order with a concurrency limit", async () => {
    const batches: string[][] = [];
    let running = 0;
    let maxRunning = 0;

    const queue = new TranslationQueue<string>({
      batchSize: 2,
      concurrency: 2,
      worker: vi.fn(async (items: string[]) => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        batches.push(items);
        await Promise.resolve();
        running -= 1;
      })
    });

    queue.enqueue([
      { id: "c", priority: 2, distance: 0, value: "c" },
      { id: "a", priority: 0, distance: 0, value: "a" },
      { id: "b", priority: 1, distance: 0, value: "b" },
      { id: "d", priority: 2, distance: 1, value: "d" }
    ]);

    await waitForQueue();

    expect(batches.flat()).toEqual(["a", "b", "c", "d"]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("keeps the higher priority item when the same id is enqueued twice", async () => {
    const batches: string[][] = [];
    const queue = new TranslationQueue<string>({
      batchSize: 4,
      concurrency: 1,
      worker: vi.fn(async (items: string[]) => {
        batches.push(items);
        await Promise.resolve();
      })
    });

    queue.enqueue([
      { id: "same", priority: 2, distance: 100, value: "slow" },
      { id: "same", priority: 0, distance: 0, value: "fast" }
    ]);

    await waitForQueue();

    expect(batches.flat()).toEqual(["fast"]);
  });

  it("keeps an existing pending item when a duplicate has lower priority", async () => {
    const batches: string[][] = [];
    const queue = new TranslationQueue<string>({
      batchSize: 4,
      concurrency: 1,
      worker: vi.fn(async (items: string[]) => {
        batches.push(items);
        await Promise.resolve();
      })
    });

    queue.enqueue([
      { id: "same", priority: 0, distance: 0, value: "fast" },
      { id: "same", priority: 2, distance: 100, value: "slow" }
    ]);

    await waitForQueue();

    expect(batches.flat()).toEqual(["fast"]);
  });

  it("clears pending items", async () => {
    const batches: string[][] = [];
    const queue = new TranslationQueue<string>({
      batchSize: 1,
      concurrency: 1,
      worker: vi.fn(async (items: string[]) => {
        batches.push(items);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      })
    });

    queue.enqueue([
      { id: "a", priority: 0, distance: 0, value: "a" },
      { id: "b", priority: 1, distance: 0, value: "b" }
    ]);
    queue.clear();

    await waitForQueue();

    expect(batches.flat()).toEqual(["a"]);
    expect(queue.size).toBe(0);
  });

  it("continues draining after a worker failure", async () => {
    const batches: string[][] = [];
    const queue = new TranslationQueue<string>({
      batchSize: 1,
      concurrency: 1,
      worker: vi.fn(async (items: string[]) => {
        batches.push(items);
        await Promise.resolve();
        if (items[0] === "a") {
          throw new Error("failed");
        }
      })
    });

    queue.enqueue([
      { id: "a", priority: 0, distance: 0, value: "a" },
      { id: "b", priority: 1, distance: 0, value: "b" }
    ]);

    await waitForQueue();

    expect(batches.flat()).toEqual(["a", "b"]);
  });
});

async function waitForQueue(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}
