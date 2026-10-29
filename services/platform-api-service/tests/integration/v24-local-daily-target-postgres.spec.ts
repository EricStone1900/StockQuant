import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { PostgresV24LocalDailyTargetRepository } from "../../src/adapters/postgres-v24-local-daily-target-repository.js";
import { PostgresV24LocalOrderIntentRepository } from "../../src/adapters/postgres-v24-local-order-intent-repository.js";
import { prepareV24FixtureDailyTarget } from "../../src/application/v24-daily-target.js";

const url = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (!url || !/^sq-test-postgres-[a-f0-9]+$/u.test(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER ?? "")) throw new Error("Disposable PostgreSQL wrapper is required");
const pool = new Pool({ connectionString: url });
const targets = new PostgresV24LocalDailyTargetRepository(pool);
const intents = new PostgresV24LocalOrderIntentRepository(pool);
const root = resolve(import.meta.dirname, "../../../..");
const fixture = JSON.parse(readFileSync(resolve(root, "fixtures/v2/v2.4/c5-local-engineering-v1/input.json"), "utf8"));
const sha = "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea";

beforeAll(async () => { await new PostgresStageRunRepository(pool).migrate(); await targets.migrate(); await intents.migrate(); });
afterAll(async () => { await pool.end(); });

describe("isolated C5 multi-session target persistence", () => {
  it("keeps one immutable target per session, distinct order identities and owner/account isolation across reconnection", async () => {
    const testRunId = randomUUID();
    const scope = { ownerId: `c5-local-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
    await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','c5-local-engineering','1.0.0',$2,$3,'RUNNING',20260907,'[]',$4::jsonb)", [testRunId, scope.ownerId, scope.namespace, JSON.stringify({ accountId: scope.accountId })]);
    const input = (i: number) => {
      const session = fixture.sessions[i];
      return { clock: { now: () => new Date(`${session.date}T09:31:00+08:00`) }, sessionDate: session.date, expectedPriorSessions: session.expected.priorDates as [string, string], bars: fixture.sessions.slice(i - 2, i).map((bar: any) => ({ securityId: "600000.SH", sessionDate: bar.date, availableAt: bar.availableAt, close: bar.close })), account: { heldQuantity: i === 2 ? 0 : 100, sellableQuantity: i === 2 ? 0 : 100, settledCash: i === 2 ? "10000.0000" : "8970.0000" }, mandate: { validFrom: fixture.mandate.validFrom, expiresAt: fixture.mandate.expiresAt, paused: false }, referencePrice: session.expected.referencePrice };
    };
    const buyInput = input(2); const sellInput = input(3);
    const copies = await Promise.all([prepareV24FixtureDailyTarget(targets, scope, buyInput, sha, undefined, "LOCAL_SESSION"), prepareV24FixtureDailyTarget(targets, scope, buyInput, sha, undefined, "LOCAL_SESSION")]);
    expect(copies.filter((item) => item.created)).toHaveLength(1); expect(copies[0].target).toEqual(copies[1].target);
    const sell = await prepareV24FixtureDailyTarget(targets, scope, sellInput, sha, undefined, "LOCAL_SESSION");
    expect(copies[0].target.decision.action).toBe("BUY"); expect(sell.target.decision.action).toBe("SELL");
    expect(copies[0].target.clientOrderId).toBe(`v24-fixture-v2-${testRunId}-20240104`);
    expect(sell.target.clientOrderId).toBe(`v24-fixture-v2-${testRunId}-20240105`);
    const otherAccount = { ...scope, accountId: randomUUID() };
    await expect(prepareV24FixtureDailyTarget(targets, otherAccount, sellInput, sha, undefined, "LOCAL_SESSION")).rejects.toThrow("SCOPE_OR_IDENTITY_CONFLICT");
    await expect(prepareV24FixtureDailyTarget(targets, scope, { ...buyInput, referencePrice: "10.3000" }, sha, undefined, "LOCAL_SESSION")).rejects.toThrow("IMMUTABLE_CONFLICT");
    expect(await targets.find({ ...scope, ownerId: "foreign" }, sell.target.targetId)).toBeNull();
    const reopened = new Pool({ connectionString: url });
    try { expect(await new PostgresV24LocalDailyTargetRepository(reopened).find(scope, sell.target.targetId)).toEqual(sell.target); }
    finally { await reopened.end(); }
    const count = await pool.query("SELECT count(*)::int AS count FROM v24_local_daily_targets WHERE test_run_id=$1", [testRunId]);
    expect(count.rows[0].count).toBe(2);
  });
  it("persists a scoped immutable pre-execution intent before any broker order", async () => {
    const testRunId = randomUUID();
    const scope = { ownerId: `intent-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
    await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','c5-local-engineering','1.0.0',$2,$3,'RUNNING',20260907,'[]',$4::jsonb)", [testRunId, scope.ownerId, scope.namespace, JSON.stringify({ accountId: scope.accountId })]);
    const session = fixture.sessions[2];
    const input = { clock: { now: () => new Date("2024-01-04T09:31:00+08:00") }, sessionDate: session.date, expectedPriorSessions: session.expected.priorDates as [string, string], bars: fixture.sessions.slice(0, 2).map((bar: any) => ({ securityId: "600000.SH", sessionDate: bar.date, availableAt: bar.availableAt, close: bar.close })), account: { heldQuantity: 0, sellableQuantity: 0, settledCash: "10000.0000" }, mandate: { validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00", paused: false }, referencePrice: "10.2500" };
    const provenance = { sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionIds: ["bar-1", "bar-2"] as [string, string], calendarVersion: "c5-local-synthetic-sessions-1", asOf: "2024-01-04T09:31:00+08:00" };
    const target = (await prepareV24FixtureDailyTarget(targets, scope, input, sha, provenance, "LOCAL_SESSION")).target;
    const acceptedAt = "2024-01-04T09:31:00+08:00";
    const results = await Promise.all([intents.accept(scope, target.targetId, acceptedAt), intents.accept(scope, target.targetId, acceptedAt)]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results[0].intent).toMatchObject({ ...scope, targetId: target.targetId, clientOrderId: target.clientOrderId, status: "ACCEPTED_INTENT", side: "BUY", quantity: 100, acceptedAt: "2024-01-04T01:31:00.000Z" });
    expect(await intents.accept(scope, target.targetId, "2024-01-04T01:31:00.000Z")).toMatchObject({ created: false });
    await expect(intents.accept(scope, target.targetId, "2024-01-04T09:31:01+08:00")).rejects.toThrow("IMMUTABLE_CONFLICT");
    await expect(intents.accept(scope, target.targetId, "2024-01-04T09:35:00+08:00")).rejects.toThrow("WINDOW_INVALID");
    await expect(intents.accept({ ...scope, ownerId: "foreign" }, target.targetId, acceptedAt)).rejects.toThrow("TARGET_INVALID");
    expect(await intents.find({ ...scope, accountId: randomUUID() }, target.clientOrderId!)).toBeNull();
    const reopened = new Pool({ connectionString: url });
    try { expect(await new PostgresV24LocalOrderIntentRepository(reopened).find(scope, target.clientOrderId!)).toEqual(results[0].intent); } finally { await reopened.end(); }
    expect((await pool.query("SELECT count(*)::int AS count FROM v24_local_order_intents WHERE test_run_id=$1", [testRunId])).rows[0].count).toBe(1);
  });

});
