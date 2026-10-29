import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PostgresDailyBarCompletionRepository } from "../../../market-data-service/src/adapters/postgres-daily-bar-completion-repository.js";
import { validateDailyBarCompletion } from "../../../market-data-service/src/application/v21-daily-bar-completion.js";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { PostgresV24DailyTargetRepository } from "../../src/adapters/postgres-v24-daily-target-repository.js";
import { loadV24DailyDirectionFixture } from "../../src/adapters/v24-daily-direction-fixture.js";
import { V24FixtureDailyCoordinator } from "../../src/application/v24-fixture-daily-coordinator.js";
import { PostgresV24FixtureTargetJobs } from "../../src/adapters/postgres-v24-fixture-target-jobs.js";
import { V24FixtureTargetWorker } from "../../src/application/v24-fixture-target-worker.js";

const url = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (!url || !/^sq-test-postgres-[a-f0-9]+$/u.test(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER ?? "")) throw new Error("Disposable PostgreSQL wrapper is required");
const pool = new Pool({ connectionString: url });
const daily = new PostgresDailyBarCompletionRepository(pool);
const targets = new PostgresV24DailyTargetRepository(pool);
const jobs = new PostgresV24FixtureTargetJobs(pool);
const testRunId = randomUUID();
const scope = { ownerId: "coordinator-owner", accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };

beforeAll(async () => {
  await new PostgresStageRunRepository(pool).migrate(); await targets.migrate(); await jobs.migrate();
  await daily.migrate(); await daily.migrateJobs(); await daily.migrateRealJobs();
  await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','candidate-binding','2.5.0',$2,$3,'RUNNING',1,'[]','{}')", [testRunId, scope.ownerId, scope.namespace]);
  const fixture = await loadV24DailyDirectionFixture();
  for (const [index, bar] of fixture.input.bars.entries()) {
    const marketScope = { market: "CN_A" as const, ...scope };
    const fixtureVersion = `c5-coordinator-test-${index}`;
    const completion = validateDailyBarCompletion({ scope: marketScope, sourceId: "fixture:coordinator-test", dataMode: "FIXTURE", fixtureVersion, dataVersion: "coordinator-test-v1", sessionDate: bar.sessionDate, expectedSecurityIds: [bar.securityId], bars: [{ securityId: bar.securityId, sessionDate: bar.sessionDate, open: bar.close, high: bar.close, low: bar.close, close: bar.close, volume: 100, amount: "1000" }], sessionCloseAt: `${bar.sessionDate}T15:00:00+08:00`, completionRequestedAt: `${bar.sessionDate}T15:04:00+08:00`, availableAt: bar.availableAt }, { sourceAuthorized: false });
    const job = await daily.enqueue({ scope: marketScope, fixtureVersion, fixtureSha256: "a".repeat(64) });
    const now = new Date("2026-10-15T07:10:00Z");
    expect((await daily.claim("coordinator-test", now, 30_000))?.taskId).toBe(job.task.taskId);
    await daily.complete(job.task.taskId, "coordinator-test", now, completion);
  }
});
afterAll(async () => { await pool.end(); });

describe("C5 isolated daily coordinator with PostgreSQL", () => {
  it("recovers an expired job and persists one paused target without order identity", async () => {
    const coordinator = new V24FixtureDailyCoordinator({
      loadFixture: loadV24DailyDirectionFixture,
      readSessions: async ({ sessionDates, sourceId, dataVersion, dataMode, asOf, ...targetScope }) => ({ completions: await daily.findSessions({ scope: { market: "CN_A", ...targetScope }, sessionDates, sourceId, dataVersion, dataMode, asOf }) }),
      readCalendar: async (date) => ({ date, status: "TRADING", calendarVersion: "isolated-test-calendar" }),
      readAccount: async () => ({ ...scope, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [] }), targets,
    });
    const input = { scope, sourceId: "fixture:coordinator-test", dataVersion: "coordinator-test-v1", asOf: "2026-10-15T15:10:00+08:00", evaluatedAt: "2026-10-16T09:31:00+08:00" };
    const first = await jobs.enqueue(input); expect(first.created).toBe(true);
    expect((await jobs.enqueue(input)).created).toBe(false);
    await expect(jobs.enqueue({ ...input, dataVersion: "different" })).rejects.toThrow("SCOPE_OR_INPUT_CONFLICT");
    const initial = new Date("2026-10-15T07:10:00Z");
    const abandoned = await jobs.claim("old-worker", initial, 30_000); expect(abandoned?.attempt).toBe(1);
    expect(await jobs.claim("new-worker", new Date(initial.getTime() + 29_000), 30_000)).toBeNull();
    const recoveredAt = new Date(initial.getTime() + 31_000);
    const worker = new V24FixtureTargetWorker(jobs, coordinator, { now: () => recoveredAt }, "new-worker");
    expect(await worker.tick()).toBe("COMPLETED");
    const stored = await pool.query<{ target_id: string; state: string; attempt: number }>("SELECT target_id,state,attempt FROM v24_fixture_target_jobs WHERE job_id=$1", [first.job.jobId]);
    expect(stored.rows[0]).toMatchObject({ state: "COMPLETED", attempt: 2 });
    const targetId = stored.rows[0].target_id;
    await expect(jobs.complete(abandoned!, "old-worker", recoveredAt, targetId)).rejects.toThrow("LEASE_OR_TARGET_INVALID");
    const reopened = new Pool({ connectionString: url });
    try {
      const target = await new PostgresV24DailyTargetRepository(reopened).find(scope, targetId);
      expect(target).toMatchObject({ clientOrderId: null, decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" } });
      expect(target?.dailyBarProvenance?.completionIds).toHaveLength(2);
      expect((await coordinator.materialize(input)).created).toBe(false);
      expect(await worker.tick()).toBe("IDLE");
      // Simulate a final-attempt crash after the target commit, before job acknowledgement.
      await pool.query("UPDATE v24_fixture_target_jobs SET state='CLAIMED',attempt=3,lease_owner='crashed-worker',lease_until=$2,target_id=NULL WHERE job_id=$1", [first.job.jobId, initial]);
      expect(await worker.tick()).toBe("IDLE");
      const finalRecovery = await pool.query<{ state: string; target_id: string }>("SELECT state,target_id FROM v24_fixture_target_jobs WHERE job_id=$1", [first.job.jobId]);
      expect(finalRecovery.rows[0]).toEqual({ state: "COMPLETED", target_id: targetId });
      await pool.query("UPDATE v24_fixture_target_jobs SET state='CLAIMED',attempt=3,lease_owner='crashed-worker',lease_until=$2,target_id=NULL,input=jsonb_set(input,'{dataVersion}',to_jsonb('other-version'::text)) WHERE job_id=$1", [first.job.jobId, initial]);
      expect(await worker.tick()).toBe("IDLE");
      const mismatch = await pool.query<{ state: string; target_id: string | null }>("SELECT state,target_id FROM v24_fixture_target_jobs WHERE job_id=$1", [first.job.jobId]);
      expect(mismatch.rows[0]).toEqual({ state: "FAILED", target_id: null });
    }
    finally { await reopened.end(); }
  });
  it("does not claim work after its owner-scoped TestRun is cancelled", async () => {
    const id = randomUUID(); const cancelledScope = { ownerId: "cancel-owner", accountId: randomUUID(), namespace: `v24-paper-v2-${id}`, testRunId: id };
    await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','candidate-binding','2.5.0',$2,$3,'RUNNING',1,'[]','{}')", [id, cancelledScope.ownerId, cancelledScope.namespace]);
    await jobs.enqueue({ scope: cancelledScope, sourceId: "fixture:coordinator-test", dataVersion: "coordinator-test-v1", asOf: "2026-10-15T15:10:00+08:00", evaluatedAt: "2026-10-16T09:31:00+08:00" });
    await pool.query("UPDATE acceptance_stage_runs SET status='CANCELLED' WHERE test_run_id=$1", [id]);
    expect(await jobs.claim("worker", new Date("2026-10-15T07:10:00Z"), 30_000)).toBeNull();
    const stored = await pool.query("SELECT state FROM v24_fixture_target_jobs WHERE test_run_id=$1", [id]);
    expect(stored.rows[0].state).toBe("QUEUED");
  });
});
