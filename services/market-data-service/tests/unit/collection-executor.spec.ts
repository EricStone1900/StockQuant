import { describe, expect, it } from "vitest";
import { PersistentCollectionExecutor, type CollectionAdapter } from "../../src/application/collection-executor.js";

const run = { runId: "run-1", subscriptionId: "cn-5m", subscriptionVersion: 1, windowStart: "2026-09-11T01:30:00.000Z", windowEnd: "2026-09-11T01:35:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: "key", requestHash: "a".repeat(64), status: "RUNNING" as const, version: 2, checkpoint: null, fencingToken: 1, leaseUntil: "2026-09-11T01:33:00.000Z", retryAt: null, publishedArtifactId: null };
const bar = { securityId: "600000.SH", barStart: "2026-09-11T09:30:00+08:00", barEnd: "2026-09-11T09:35:00+08:00", availableAt: null, open: "10", high: "11", low: "9", close: "10", volume: "100", amount: "1000", adjustment: "raw", sourceId: "baostock" };

class FakeRuns {
  checkpointed: unknown = null;
  published: any = null;
  retry: unknown = null;
  async runnableRunIds() { return [run.runId]; }
  async claim() { return { ...run }; }
  async checkpoint(_id: string, _token: number, checkpoint: unknown) { this.checkpointed = checkpoint; return { ...run, checkpoint }; }
  async publishRows(input: any) { this.published = input; return { ...run, status: "COMPLETED", publishedArtifactId: input.artifactId }; }
  async releaseToRetry(_id: string, _token: number, seconds: number) { this.retry = seconds; return { ...run, status: "WAITING_RETRY" }; }
}

describe("PersistentCollectionExecutor", () => {
  it("claims a run, validates adapter data and atomically publishes a content-addressed artifact", async () => {
    const runs = new FakeRuns();
    const adapter: CollectionAdapter = { collect: async () => ({ sourceId: "baostock", bars: [bar], attempts: [{ sourceId: "baostock", status: "PASS" }] }) };
    const result = await new PersistentCollectionExecutor(runs as never, adapter, { securityIds: ["600000.SH"], projectId: "stockquant-local", dataVersion: "cn-5m-raw-v1" }).tick();
    expect(result).toEqual({ attempted: 1, completed: 1, waitingRetry: 0 });
    expect(runs.published.projectId).toBe("stockquant-local");
    expect(runs.published.rows[0]).toMatchObject({ open: 10, amount: 1000, sourceId: "baostock" });
    expect(runs.published.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not publish malformed data and leaves the persisted run retryable", async () => {
    const runs = new FakeRuns();
    const adapter: CollectionAdapter = { collect: async () => ({ sourceId: "sina", bars: [{ ...bar, high: "8" }], attempts: [] }) };
    const result = await new PersistentCollectionExecutor(runs as never, adapter, { securityIds: ["600000.SH"], projectId: "stockquant-local", dataVersion: "cn-5m-raw-v1", retrySeconds: 123 }).tick();
    expect(result).toEqual({ attempted: 1, completed: 0, waitingRetry: 1 });
    expect(runs.published).toBeNull();
    expect(runs.retry).toBe(123);
  });

  it("publishes only the exact claimed five-minute window", async () => {
    const runs = new FakeRuns();
    const adapter: CollectionAdapter = { collect: async () => ({ sourceId: "baostock", bars: [bar, { ...bar, barStart: "2026-09-11T09:35:00+08:00", barEnd: "2026-09-11T09:40:00+08:00" }], attempts: [] }) };
    await new PersistentCollectionExecutor(runs as never, adapter, { securityIds: ["600000.SH"], projectId: "stockquant-local", dataVersion: "cn-5m-raw-v1" }).tick();
    expect(runs.published.rows).toHaveLength(1);
    expect(runs.published.rows[0].barStart).toBe("2026-09-11T09:30:00+08:00");
  });

  it("keeps a source failure durable for retry", async () => {
    const runs = new FakeRuns();
    const adapter: CollectionAdapter = { collect: async () => { throw new Error("ALL_SOURCES_FAILED"); } };
    const result = await new PersistentCollectionExecutor(runs as never, adapter, { securityIds: ["600000.SH"], projectId: "stockquant-local", dataVersion: "cn-5m-raw-v1" }).tick();
    expect(result.waitingRetry).toBe(1);
    expect(runs.retry).toBe(300);
  });
});
