import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { PostgresV24DailyTargetRepository } from "../../src/adapters/postgres-v24-daily-target-repository.js";
import { loadV24DailyDirectionFixture } from "../../src/adapters/v24-daily-direction-fixture.js";
import { prepareV24FixtureDailyTarget } from "../../src/application/v24-daily-target.js";

const url = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (!url || !/^sq-test-postgres-[a-f0-9]+$/u.test(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER ?? "")) throw new Error("Disposable PostgreSQL wrapper is required for C5 daily target integration");
const pool = new Pool({ connectionString: url });
const repository = new PostgresV24DailyTargetRepository(pool);
const seed = async () => {
  const testRunId = randomUUID();
  const scope = { ownerId: `c5-target-owner-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
  await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','normal','2.2.0',$2,$3,'RUNNING',20260907,'[]','{}')", [scope.testRunId, scope.ownerId, scope.namespace]);
  const fixture = await loadV24DailyDirectionFixture();
  return { scope, sha256: fixture.sha256, input: { ...fixture.input, clock: { now: () => new Date("2026-10-16T09:49:00+08:00") } } };
};
beforeAll(async () => { await new PostgresStageRunRepository(pool).migrate(); await repository.migrate(); });
afterAll(async () => { await pool.end(); });

describe("C5 immutable daily target in real isolated PostgreSQL", () => {
  it("concurrent duplicate evaluations persist one target and one order identity", async () => {
    const { scope, input, sha256 } = await seed();
    const results = await Promise.all([prepareV24FixtureDailyTarget(repository, scope, input, sha256), prepareV24FixtureDailyTarget(repository, scope, input, sha256)]);
    expect(results.filter((x) => x.created)).toHaveLength(1);
    expect(results[0].target).toEqual(results[1].target);
    const count = await pool.query("SELECT count(*)::int AS count FROM v24_fixture_daily_targets WHERE test_run_id=$1", [scope.testRunId]);
    expect(count.rows[0].count).toBe(1);
    expect(results[0].target.decision).toMatchObject({ action: "BUY", quantity: 100 });
    expect(results[0].target.clientOrderId).toBe(`v24-fixture-v2-${scope.testRunId}`);
  });
  it("new connection recovers the original target and refuses changed input under the same identity", async () => {
    const { scope, input, sha256 } = await seed();
    const first = await prepareV24FixtureDailyTarget(repository, scope, input, sha256);
    const reopened = new Pool({ connectionString: url });
    try {
      const reader = new PostgresV24DailyTargetRepository(reopened);
      expect(await reader.find(scope, first.target.targetId)).toEqual(first.target);
      expect((await prepareV24FixtureDailyTarget(reader, scope, input, sha256)).created).toBe(false);
      await expect(prepareV24FixtureDailyTarget(reader, scope, { ...input, bars: input.bars.map((bar, i) => i === 1 ? { ...bar, close: "9.0000" } : bar) }, sha256)).rejects.toThrow("IMMUTABLE_CONFLICT");
      expect(await reader.find(scope, first.target.targetId)).toEqual(first.target);
    } finally { await reopened.end(); }
  });
  it("foreign owner, account, namespace, and TestRun cannot read or overwrite the target", async () => {
    const { scope, input, sha256 } = await seed();
    const first = await prepareV24FixtureDailyTarget(repository, scope, input, sha256);
    for (const other of [{ ...scope, ownerId: "foreign" }, { ...scope, accountId: randomUUID() }, { ...scope, namespace: "foreign" }, { ...scope, testRunId: randomUUID() }]) expect(await repository.find(other, first.target.targetId)).toBeNull();
    await expect(repository.save({ ...first.target, ownerId: "foreign" })).rejects.toThrow("SCOPE_OR_IDENTITY_CONFLICT");
    await expect(prepareV24FixtureDailyTarget(repository, { ...scope, accountId: randomUUID() }, input, sha256)).rejects.toThrow("SCOPE_OR_IDENTITY_CONFLICT");
    await expect(repository.save({ ...first.target, dataMode: "REAL" } as never)).rejects.toThrow("FIXTURE_REQUIRED");
    expect(await repository.find(scope, first.target.targetId)).toEqual(first.target);
  });
  it("HOLD and paused decisions persist no order identity", async () => {
    const hold = await seed(); hold.input.account.heldQuantity = 100;
    const held = await prepareV24FixtureDailyTarget(repository, hold.scope, hold.input, hold.sha256);
    expect(held.target).toMatchObject({ targetQuantity: 100, clientOrderId: null, decision: { action: "HOLD" } });
    const paused = await seed(); paused.input.mandate.paused = true;
    const blocked = await prepareV24FixtureDailyTarget(repository, paused.scope, paused.input, paused.sha256);
    expect(blocked.target).toMatchObject({ targetQuantity: null, clientOrderId: null, decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" } });
  });
});
