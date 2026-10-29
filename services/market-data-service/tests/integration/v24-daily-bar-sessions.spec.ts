import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresDailyBarCompletionRepository } from "../../src/adapters/postgres-daily-bar-completion-repository.js";
import { validateDailyBarCompletion } from "../../src/application/v21-daily-bar-completion.js";

if (!process.env.STOCKQUANT_ISOLATED_PG_CONTAINER || !process.env.MARKET_DATA_DATABASE_URL) throw new Error("Isolated PostgreSQL is required for this test");

describe("C5 scoped point-in-time daily completions", () => {
  const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  const repository = new PostgresDailyBarCompletionRepository(pool);
  const scope = { market: "CN_A" as const, ownerId: "c5-isolated", accountId: randomUUID(), namespace: `c5-test-${randomUUID()}`, testRunId: randomUUID() };
  const dates: [string, string] = ["2026-10-14", "2026-10-15"];
  const query = { scope, sessionDates: dates, sourceId: "fixture:c5-daily", dataVersion: "c5-test-v1", dataMode: "FIXTURE" as const, asOf: "2026-10-16T01:31:00Z" };
  beforeAll(async () => { await repository.migrate(); await repository.migrateJobs(); await repository.migrateRealJobs(); });
  afterAll(async () => { await pool.end(); });

  async function complete(date: string, fixtureVersion: string, close: string) {
    const request = { scope, sourceId: query.sourceId, dataMode: "FIXTURE" as const, fixtureVersion, dataVersion: query.dataVersion, sessionDate: date,
      expectedSecurityIds: ["600000.SH"], bars: [{ securityId: "600000.SH", sessionDate: date, open: "10", high: "11", low: "9", close, volume: 100, amount: "1000" }],
      sessionCloseAt: `${date}T15:00:00+08:00`, completionRequestedAt: `${date}T15:01:00+08:00`, availableAt: `${date}T15:02:00+08:00` };
    const completion = validateDailyBarCompletion(request, { sourceAuthorized: false });
    const job = await repository.enqueue({ scope, fixtureVersion, fixtureSha256: "a".repeat(64) });
    const now = new Date("2026-10-16T01:31:00Z");
    const claim = await repository.claim("isolated-worker", now, 30_000);
    expect(claim?.taskId).toBe(job.task.taskId);
    await repository.complete(job.task.taskId, "isolated-worker", now, completion);
  }

  it("requires both exact sessions, respects availability and scope, and rejects ambiguous revisions", async () => {
    await complete(dates[0], "c5-older-1", "10");
    expect(await repository.findSessions(query)).toBeNull();
    await complete(dates[1], "c5-newer-1", "10.25");
    expect((await repository.findSessions(query))?.map((row) => row.sessionDate)).toEqual(dates);
    expect(await repository.findSessions({ ...query, asOf: "2026-10-15T07:01:00Z" })).toBeNull();
    expect(await repository.findSessions({ ...query, scope: { ...scope, testRunId: randomUUID() } })).toBeNull();
    expect(await repository.findSessions({ ...query, sourceId: "another-source" })).toBeNull();
    await expect(repository.findSessions({ ...query, sessionDates: [dates[1], dates[0]] })).rejects.toThrow("DAILY_BAR_SESSION_QUERY_INVALID");
    await complete(dates[1], "c5-newer-2", "10.30");
    await expect(repository.findSessions(query)).rejects.toThrow("DAILY_BAR_SESSION_AMBIGUOUS");
  });
});
