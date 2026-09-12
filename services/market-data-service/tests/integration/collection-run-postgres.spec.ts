import { Pool } from "pg";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CollectionRunConflict, CollectionRunRepository } from "../../src/application/collection-run-repository.js";
import { CollectionScheduleRepository } from "../../src/application/collection-schedule-repository.js";
import { CollectionScheduler } from "../../src/application/collection-scheduler.js";
import { PersistentCollectionSchedulerWorker } from "../../src/application/persistent-collection-scheduler.js";

const connectionString = process.env.MARKET_DATA_DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase("CollectionRunRepository PostgreSQL integration", () => {
  const pool = new Pool({ connectionString });
  const repository = new CollectionRunRepository(pool);
  const schedules = new CollectionScheduleRepository(pool);
  const suffix = Date.now().toString();

  beforeAll(async () => {
    await repository.migrate();
    await schedules.migrate();
  });

  afterAll(async () => {
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
    const events = (await repository.pendingEvents()).filter((event) => event.runId === created.run.runId);
    expect(events).toHaveLength(1);
    await repository.markEventSent(events[0].eventId);
    expect((await repository.pendingEvents()).some((event) => event.runId === created.run.runId)).toBe(false);
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

  it("keeps the completion event pending when delivery is unavailable, then allows retry", async () => {
    const request = { subscriptionId: `outbox-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:45:00.000Z", windowEnd: "2026-09-11T05:50:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `outbox-${suffix}`, requestHash: "f".repeat(64) };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    await repository.publish(created.run.runId, claimed!.fencingToken, `artifact-${suffix}-outbox`);
    const pending = await repository.pendingEvents();
    expect(pending.some((event) => event.runId === created.run.runId)).toBe(true);
    // Simulate a broker outage: the dispatcher does not mark the event sent.
    expect((await repository.pendingEvents()).some((event) => event.runId === created.run.runId)).toBe(true);
    const event = pending.find((item) => item.runId === created.run.runId)!;
    await repository.markEventSent(event.eventId);
    expect((await repository.pendingEvents()).some((item) => item.runId === created.run.runId)).toBe(false);
  });

  it("recovers after a real worker process is terminated and fences its lease", async () => {
    const request = { subscriptionId: `crash-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:50:00.000Z", windowEnd: "2026-09-11T05:55:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `crash-${suffix}`, requestHash: "1".repeat(64) };
    const created = await repository.create(request);
    const script = `const {Client}=require('pg'); const c=new Client({connectionString:process.env.MARKET_DATA_DATABASE_URL}); (async()=>{await c.connect(); await c.query("UPDATE market_data_collection_runs SET status='RUNNING',fencing_token=fencing_token+1,lease_until=now()+interval '30 seconds',version=version+1 WHERE run_id=$1",[process.env.RUN_ID]); process.stdout.write('CLAIMED\\n'); setInterval(()=>{},1000)})().catch(e=>{console.error(e);process.exit(1)})`;
    const worker = spawn(process.execPath, ["-e", script], { env: { ...process.env, MARKET_DATA_DATABASE_URL: connectionString, RUN_ID: created.run.runId } });
    await new Promise<void>((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error("worker did not claim before timeout")), 5000);
      worker.stdout.on("data", (chunk: Buffer) => { if (chunk.toString().includes("CLAIMED")) { clearTimeout(timer); resolveReady(); } });
      worker.once("error", reject);
    });
    worker.kill("SIGKILL");
    await once(worker, "close");
    await pool.query("UPDATE market_data_collection_runs SET lease_until=now() - interval '1 second' WHERE run_id=$1", [created.run.runId]);
    const takeover = await repository.claim(created.run.runId, 30);
    expect(takeover?.fencingToken).toBe(2);
    await expect(repository.checkpoint(created.run.runId, 1, { cursor: "crashed-worker" })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, takeover!.fencingToken, { cursor: "recovered-worker" });
  });

  it("validates a Fixture and publishes its content-addressed Artifact atomically", async () => {
    const fixturePath = resolve(process.cwd(), "../../fixtures/v2/v2.2/minute_bars.csv");
    const fixture = await readFile(fixturePath);
    const lines = fixture.toString("utf8").trim().split(/\r?\n/);
    const rowCount = Math.max(0, lines.length - 1);
    expect(lines[0]).toContain("securityId");
    expect(rowCount).toBeGreaterThan(0);
    const sha256 = createHash("sha256").update(fixture).digest("hex");
    const request = { subscriptionId: `fixture-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:55:00.000Z", windowEnd: "2026-09-11T06:00:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `fixture-${suffix}`, requestHash: sha256 };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    const artifactId = `fixture-v2.2-${sha256.slice(0, 16)}`;
    const published = await repository.publish(created.run.runId, claimed!.fencingToken, artifactId, { sha256, rowCount });
    expect(published.status).toBe("COMPLETED");
    expect(await repository.findArtifact(artifactId)).toEqual({ artifactId, runId: created.run.runId, sha256, rowCount });
    const event = (await repository.pendingEvents()).find((item) => item.runId === created.run.runId)!;
    expect(event.payload).toMatchObject({ runId: created.run.runId, artifactId, sha256, rowCount });
  });

  it("persists schedule configuration, enforces a single scheduler lease and resumes from its watermark", async () => {
    const subscriptionId = `schedule-${suffix}`;
    const created = await schedules.upsert({ subscriptionId, subscriptionVersion: 1, fromDate: "2026-09-11", toDate: "2026-09-11", calendarVersion: "fixture-cn-1" });
    expect(created.enabled).toBe(false);
    const enabled = await schedules.setEnabled(subscriptionId, true);
    expect((await schedules.find(subscriptionId))?.enabled).toBe(true);
    await pool.query("UPDATE market_data_collection_scheduler_lease SET lease_until=now() - interval '1 second' WHERE lease_id=1");
    const firstLease = await schedules.acquireLease(`worker-a-${suffix}`, 60);
    expect(firstLease?.fencingToken).toBeGreaterThan(0);
    expect(await schedules.acquireLease(`worker-b-${suffix}`, 60)).toBeNull();

    const planner = new CollectionScheduler({ session: (date) => ({ date, status: "TRADING" as const, calendarVersion: "fixture-cn-1", sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] }) }, { now: () => new Date("2026-09-11T06:00:00.000Z") }, 5, 120);
    const worker = new PersistentCollectionSchedulerWorker(schedules, repository, planner, `worker-a-${suffix}`);
    const firstTick = await worker.tick();
    expect(firstTick.leaseAcquired).toBe(true);
    expect(firstTick.schedules).toBeGreaterThanOrEqual(1);
    expect(firstTick.submitted).toBeGreaterThanOrEqual(4);
    const after = await schedules.find(subscriptionId);
    expect(after?.watermarkEnd).toBe("2026-09-11T05:10:00.000Z");

    const resumed = new PersistentCollectionSchedulerWorker(schedules, repository, planner, `worker-a-${suffix}`);
    const secondTick = await resumed.tick();
    expect(secondTick.submitted).toBe(0);
    expect((await schedules.find(subscriptionId))?.version).toBe(after?.version);
    expect(enabled.version).toBeLessThan(after!.version);
  });
});
