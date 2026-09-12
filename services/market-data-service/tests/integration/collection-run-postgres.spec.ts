import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CollectionRunConflict, CollectionRunRepository } from "../../src/application/collection-run-repository.js";

const connectionString = process.env.MARKET_DATA_DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase("CollectionRunRepository PostgreSQL integration", () => {
  const pool = new Pool({ connectionString });
  const repository = new CollectionRunRepository(pool);
  const suffix = Date.now().toString();

  beforeAll(async () => {
    await repository.migrate();
  });

  afterAll(async () => {
    await pool.query("DROP TABLE IF EXISTS market_data_collection_runs");
    await pool.end();
  });

  it("claims, checkpoints, publishes and rejects stale fencing tokens", async () => {
    const request = { subscriptionId: `integration-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:35:00.000Z", windowEnd: "2026-09-11T05:40:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `integration-${suffix}`, requestHash: "c".repeat(64) };
    const created = await repository.create(request);
    const duplicate = await repository.create(request);
    expect(duplicate.created).toBe(false);
    const claimed = await repository.claim(created.run.runId, 30);
    expect(claimed?.status).toBe("RUNNING");
    await expect(repository.checkpoint(created.run.runId, 0, { cursor: 1 })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, claimed!.fencingToken, { cursor: 1 });
    const published = await repository.publish(created.run.runId, claimed!.fencingToken, `artifact-${suffix}`);
    expect(published.status).toBe("COMPLETED");
    expect(published.publishedArtifactId).toBe(`artifact-${suffix}`);
  });

  it("lets a new worker take over an expired lease and fences the old worker", async () => {
    const request = { subscriptionId: `takeover-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:40:00.000Z", windowEnd: "2026-09-11T05:45:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `takeover-${suffix}`, requestHash: "e".repeat(64) };
    const created = await repository.create(request);
    const firstWorker = await repository.claim(created.run.runId, 30);
    expect(firstWorker?.fencingToken).toBe(1);
    await pool.query("UPDATE market_data_collection_runs SET lease_until=now() - interval '1 second' WHERE run_id=$1", [created.run.runId]);
    const secondWorker = await repository.claim(created.run.runId, 30);
    expect(secondWorker?.fencingToken).toBe(2);
    await expect(repository.checkpoint(created.run.runId, firstWorker!.fencingToken, { cursor: "old-worker" })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, secondWorker!.fencingToken, { cursor: "new-worker" });
  });

  it("does not confirm a task when the database is unavailable", async () => {
    const unavailable = new Pool({ connectionString: "postgresql://market_data@127.0.0.1:59999/market_data", connectionTimeoutMillis: 200 });
    const unavailableRepository = new CollectionRunRepository(unavailable);
    await expect(unavailableRepository.migrate()).rejects.toBeTruthy();
    await unavailable.end();
  });
});
