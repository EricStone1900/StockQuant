import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresSnapshotSamplingRepository } from "../../src/adapters/postgres-snapshot-sampling-repository.js";
import { PostgresV24LocalSnapshotBarrierRepository } from "../../src/adapters/postgres-v24-local-snapshot-barrier-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "../../src/adapters/postgres-sampling-task-lifecycle-repository.js";
import { SamplingTaskWorker } from "../../src/application/sampling-task-worker.js";
import { V24LocalSnapshotWorker } from "../../src/application/v24-local-snapshot-worker.js";
import { parseV21SnapshotSamplingFixture } from "../../src/application/v21-snapshot-sampling-fixture.js";

if (!process.env.STOCKQUANT_ISOLATED_PG_CONTAINER || !process.env.MARKET_DATA_DATABASE_URL) throw new Error("Isolated PostgreSQL wrapper required");
const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
const sampling = new PostgresSnapshotSamplingRepository(pool);
const barrier = new PostgresV24LocalSnapshotBarrierRepository(pool);
const lifecycle = new PostgresSamplingTaskLifecycleRepository(pool);
const testRunId = randomUUID();
const scope = { market: "CN_A" as const, ownerId: `owner-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
const root = resolve(import.meta.dirname, "../../../..");
beforeAll(async () => { await sampling.migrate(); await lifecycle.migrate(); await barrier.migrate(); });
afterAll(async () => { await pool.end(); });

describe("C5 scoped synthetic snapshot plan and business completion receipt", () => {
  it("waits for durable complete task and receipt, selects exact pinned input, survives reconnect and isolates owner", async () => {
    for (const date of ["2024-01-04", "2024-01-05"]) {
      const dateKey = date.replaceAll("-", "");
      const path = `fixtures/v2/v2.4/c5-local-snapshot-${dateKey}`;
      const manifest = JSON.parse(await readFile(resolve(root, path, "manifest.json"), "utf8"));
      const bytes = await readFile(resolve(root, manifest.files[0].path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.files[0].sha256);
      const [a, b] = await Promise.all([barrier.createPlan(scope, date), barrier.createPlan(scope, date)]);
      expect([a, b].filter((x) => x.created)).toHaveLength(1); expect(a.plan).toEqual(b.plan);
      expect(await barrier.readPlan({ ...scope, ownerId: "foreign" }, date)).toBeNull();
      await expect(barrier.createPlan({ ...scope, ownerId: "foreign" }, date)).rejects.toThrow("PLAN_SCOPE_CONFLICT");
      const scheduledAt = `${date}T01:31:10.000Z`; const completedAt = `${date}T01:31:11.000Z`; const evalAt = `${date}T09:31:50+08:00`;
      expect(await barrier.select(scope, date, evalAt)).toMatchObject({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
      await expect(barrier.recordCompletion(scope, date)).rejects.toThrow("TASK_INCOMPLETE");
      const queued = await sampling.record({ scheduledAt, intervalMinutes: 30, settingsVersion: 1, calendarVersion: "c5-local-synthetic-sessions-1", window: "morning", dataMode: "FIXTURE", sourceId: `fixture:${manifest.fixtureVersion}`, scope, securityIds: ["600000.SH"], status: "QUEUED", fixtureVersion: manifest.fixtureVersion });
      expect(queued.taskId).toBe(a.plan.tasks[0]!.taskId);
      const parsed = parseV21SnapshotSamplingFixture({ bytes, manifestVersion: manifest.fixtureVersion, manifestSha256: manifest.files[0].sha256, scheduledAt, calendarVersion: "c5-local-synthetic-sessions-1", securityIds: ["600000.SH"], ingestedAt: completedAt, availableAt: completedAt, maxAgeMinutes: 20 });
      await sampling.completeFixture(queued.taskId, parsed.fixtureVersion, parsed.fixtureSha256, parsed.observations);
      expect(await barrier.select(scope, date, evalAt)).toMatchObject({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
      const receipts = await Promise.all([barrier.recordCompletion(scope, date), barrier.recordCompletion(scope, date)]);
      expect(receipts.filter((x) => x.recorded)).toHaveLength(1);
      expect(await barrier.select(scope, date, `${date}T09:31:10+08:00`)).toMatchObject({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
      const result = await barrier.select(scope, date, evalAt);
      expect(result).toMatchObject({ status: "SELECTED", planId: a.plan.planId, taskId: queued.taskId, observation: { snapshotId: `fixture-c5-${dateKey}-600000`, price: dateKey === "20240104" ? "10.2500" : "10.0000" } });
      const reopened = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
      try { expect(await new PostgresV24LocalSnapshotBarrierRepository(reopened).select(scope, date, evalAt)).toEqual(result); } finally { await reopened.end(); }
      await pool.query("UPDATE market_data_v24_local_snapshot_receipts SET fixture_sha256=$2 WHERE plan_id=$1", [a.plan.planId, "0".repeat(64)]);
      await expect(barrier.select(scope, date, evalAt)).rejects.toThrow("RECEIPT_CORRUPT");
      await pool.query("UPDATE market_data_v24_local_snapshot_receipts SET fixture_sha256=$2 WHERE plan_id=$1", [a.plan.planId, manifest.files[0].sha256]);
    }
  });
  it("runs the durable worker and recovers after task completion before receipt", async () => {
    const runId = randomUUID();
    const scoped = { market: "CN_A" as const, ownerId: `worker-${runId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${runId}`, testRunId: runId };
    const local = new V24LocalSnapshotWorker(sampling, barrier, root);
    const worker = new SamplingTaskWorker(lifecycle, { execute: async (claim) => { const task = await sampling.find(claim.taskId); if (!task) throw new Error("missing task"); await local.execute(task); return { state: "COMPLETED" }; } }, { now: () => new Date("2026-10-28T00:00:00.000Z") }, "isolated-c5-worker");
    for (const date of ["2024-01-04", "2024-01-05"]) {
      const key = date.replaceAll("-", ""); const version = `v24-c5-local-snapshot-${key}-1`;
      const plan = (await barrier.createPlan(scoped, date)).plan;
      const scheduledAt = `${date}T01:31:10.000Z`;
      const task = await sampling.record({ scheduledAt, intervalMinutes: 30, settingsVersion: 1, calendarVersion: "c5-local-synthetic-sessions-1", window: "morning", dataMode: "FIXTURE", sourceId: `fixture:${version}`, scope: scoped, securityIds: ["600000.SH"], status: "QUEUED", fixtureVersion: version });
      expect(task.taskId).toBe(plan.tasks[0]!.taskId);
      if (date === "2024-01-05") {
        const manifest = JSON.parse(await readFile(resolve(root, `fixtures/v2/v2.4/c5-local-snapshot-${key}/manifest.json`), "utf8"));
        const parsed = parseV21SnapshotSamplingFixture({ bytes: await readFile(resolve(root, manifest.files[0].path)), manifestVersion: version, manifestSha256: manifest.files[0].sha256, scheduledAt, calendarVersion: "c5-local-synthetic-sessions-1", securityIds: ["600000.SH"], ingestedAt: `${date}T01:31:11.000Z`, availableAt: `${date}T01:31:11.000Z`, maxAgeMinutes: 30 });
        await sampling.completeFixture(task.taskId, version, parsed.fixtureSha256, parsed.observations);
        expect(await barrier.select(scoped, date, `${date}T09:31:50+08:00`)).toMatchObject({ status: "WAITING" });
      }
      await lifecycle.enqueue(task.taskId);
      expect(await worker.tick()).toMatchObject({ claimed: true, taskId: task.taskId, state: "COMPLETED" });
      expect(await lifecycle.read(task.taskId)).toMatchObject({ state: "COMPLETED" });
      expect(await barrier.select(scoped, date, `${date}T09:31:50+08:00`)).toMatchObject({ status: "SELECTED", taskId: task.taskId });
      expect(await barrier.recordCompletion(scoped, date)).toEqual({ recorded: false });
    }
  });

});
