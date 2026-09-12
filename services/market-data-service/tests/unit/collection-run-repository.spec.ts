import { describe, expect, it } from "vitest";
import { CollectionRunConflict, CollectionRunRepository } from "../../src/application/collection-run-repository.js";

type Row = Record<string, any>;

class FakePool {
  rows: Row[] = [];
  migrations = 0;

  async query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<{ rowCount: number; rows: T[] }> {
    if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
      this.migrations += 1;
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes("INSERT INTO market_data_collection_runs")) {
      const existing = this.rows.find((row) => row.idempotency_key === params[6]);
      if (existing) return { rowCount: 0, rows: [] };
      const row = this.row(params);
      this.rows.push(row);
      return { rowCount: 1, rows: [row as T] };
    }
    if (sql.includes("SELECT * FROM market_data_collection_runs")) {
      const row = this.rows.find((item) => item.idempotency_key === params[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [row as T] : [] };
    }
    if (sql.includes("SET status='RUNNING'")) {
      const row = this.rows.find((item) => item.run_id === params[0]);
      if (!row || !["QUEUED", "RUNNING", "WAITING_RETRY", "PARTIAL"].includes(row.status) || (row.status === "RUNNING" && row.lease_until && row.lease_until > new Date())) return { rowCount: 0, rows: [] };
      row.status = "RUNNING";
      row.fencing_token += 1;
      row.version += 1;
      row.lease_until = new Date(Date.now() + Number(params[1]) * 1000);
      return { rowCount: 1, rows: [row as T] };
    }
    if (sql.includes("SET checkpoint=")) {
      const row = this.rows.find((item) => item.run_id === params[0] && item.fencing_token === params[1] && item.status === "RUNNING");
      if (!row) return { rowCount: 0, rows: [] };
      row.checkpoint = JSON.parse(String(params[2]));
      row.version += 1;
      return { rowCount: 1, rows: [row as T] };
    }
    if (sql.includes("SET status='COMPLETED'")) {
      const row = this.rows.find((item) => item.run_id === params[0] && item.fencing_token === params[1] && item.status === "RUNNING");
      if (!row) return { rowCount: 0, rows: [] };
      row.status = "COMPLETED";
      row.published_artifact_id = params[2];
      row.lease_until = null;
      row.version += 1;
      return { rowCount: 1, rows: [row as T] };
    }
    throw new Error(`unhandled SQL: ${sql}`);
  }

  private row(params: unknown[]): Row {
    return {
      run_id: "00000000-0000-4000-8000-000000000001",
      subscription_id: params[1], subscription_version: params[2], window_start: new Date(String(params[3])), window_end: new Date(String(params[4])),
      job_kind: params[5], idempotency_key: params[6], request_hash: params[7], status: "QUEUED", version: 1, checkpoint: null, fencing_token: 0, lease_until: null, published_artifact_id: null,
    };
  }
}

const request = { subscriptionId: "stockquant-cn-5m", subscriptionVersion: 1, windowStart: "2026-09-11T05:35:00.000Z", windowEnd: "2026-09-11T05:40:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: "sub-1-window-1", requestHash: "a".repeat(64) };

describe("CollectionRunRepository", () => {
  it("persists a run and returns the same run on an idempotent retry", async () => {
    const pool = new FakePool();
    const repository = new CollectionRunRepository(pool as never);
    await repository.migrate();
    const first = await repository.create(request);
    const second = await repository.create(request);
    expect(pool.migrations).toBe(1);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.run.runId).toBe(first.run.runId);
  });

  it("rejects reusing an idempotency key with a different request hash", async () => {
    const pool = new FakePool();
    const repository = new CollectionRunRepository(pool as never);
    await repository.create(request);
    await expect(repository.create({ ...request, requestHash: "b".repeat(64) })).rejects.toBeInstanceOf(CollectionRunConflict);
  });

  it("requires the current fencing token to checkpoint and publish", async () => {
    const pool = new FakePool();
    const repository = new CollectionRunRepository(pool as never);
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    expect(claimed?.fencingToken).toBe(1);
    await expect(repository.checkpoint(created.run.runId, 0, { cursor: 10 })).rejects.toBeInstanceOf(CollectionRunConflict);
    const checkpointed = await repository.checkpoint(created.run.runId, 1, { cursor: 10 });
    expect(checkpointed.checkpoint).toEqual({ cursor: 10 });
    const published = await repository.publish(created.run.runId, 1, "artifact-1");
    expect(published.status).toBe("COMPLETED");
    expect(published.publishedArtifactId).toBe("artifact-1");
  });
});
