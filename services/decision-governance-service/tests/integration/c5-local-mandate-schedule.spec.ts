import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GovernanceApi } from "../../src/application/governance-api.js";
import { migrateAutoMandates, PostgresAutoMandateRepository } from "../../src/adapters/postgres-auto-mandate-repository.js";
import type { ExecutionAuthorizationRepository } from "../../src/ports/execution-authorization-repository.js";
import type { ApprovedRegistryClient } from "../../src/ports/approved-registry-client.js";

const url = process.env.GOVERNANCE_TEST_DATABASE_URL;
if (url) { const parsed = new URL(url); if (parsed.pathname !== "/governance_test" || parsed.username !== "governance_test") throw new Error("isolated governance_test database and role required"); }
const run = url ? describe : describe.skip;
const root = resolve(import.meta.dirname, "../../../..");
const inputBytes = readFileSync(resolve(root, "fixtures/v2/v2.4/c5-local-mandate-schedule-v1/schedule.json"));
const schedule = JSON.parse(inputBytes.toString("utf8"));
const manifest = JSON.parse(readFileSync(resolve(root, "fixtures/v2/v2.4/c5-local-mandate-schedule-v1/manifest.json"), "utf8"));
const base = JSON.parse(readFileSync(resolve(root, "fixtures/v2/v2.4/c5-local-engineering-v1/input.json"), "utf8"));

run("C5 isolated per-session governance lifecycle", () => {
  const pool = new Pool({ connectionString: url });
  const mandates = new PostgresAutoMandateRepository(pool);
  const tokens = { "platform-api-service": "p".repeat(40), "trade-execution-service": "t".repeat(40), "historical-replay-worker": "h".repeat(40) };
  const api = new GovernanceApi({} as ExecutionAuthorizationRepository, tokens, {} as ApprovedRegistryClient, undefined, mandates);
  const ownerId = `owner-${randomUUID()}`; const testRunId = randomUUID(); const accountId = randomUUID();
  const headers = { serviceId: "platform-api-service", authorization: `Bearer ${tokens["platform-api-service"]}`, ownerId, actorId: ownerId };
  const ids: string[] = [];
  const post = (pathname: string, body: unknown) => api.handle({ method: "POST", pathname, ...headers, rawBody: JSON.stringify(body) });
  beforeAll(async () => { const client = await pool.connect(); try { await migrateAutoMandates(client); } finally { client.release(); } });
  afterAll(async () => { if (ids.length) { await pool.query("DELETE FROM auto_policy_mandate_events WHERE mandate_id = ANY($1::uuid[])", [ids]); await pool.query("DELETE FROM auto_policy_mandates WHERE mandate_id = ANY($1::uuid[])", [ids]); } await pool.end(); });

  it("binds all five sessions to the frozen base and verifies creation, activation, scope and pause in PostgreSQL", async () => {
    expect(createHash("sha256").update(inputBytes).digest("hex")).toBe(manifest.files[0].sha256);
    expect(schedule.baseFixtureSha256).toBe("96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea");
    expect(schedule.sessions.map((s: { date: string }) => s.date)).toEqual(base.sessions.filter((s: { role: string }) => s.role === "EVALUATION").map((s: { date: string }) => s.date));
    let preceding: { id: string; pauseAt: string } | null = null;
    for (const session of schedule.sessions) {
      expect(Date.parse(session.expiresAt) - Date.parse(session.createAt)).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
      expect(Date.parse(session.createAt)).toBeLessThanOrEqual(Date.parse(session.validFrom));
      expect(Date.parse(session.activateAt)).toBeGreaterThanOrEqual(Date.parse(session.validFrom));
      expect(Date.parse(session.activateAt)).toBeLessThan(Date.parse(session.expiresAt));
      const id = randomUUID(); ids.push(id);
      const command = { mandateId: id, mandateVersion: 1, testRunId, accountId, strategyVersion: schedule.strategySha256, market: schedule.market, currency: schedule.currency, securityScope: schedule.securityScope, maxOrderAmount: schedule.maxOrderAmount, maxTotalAmount: schedule.maxTotalAmount, maxOrderCount: schedule.maxOrderCount, validFrom: session.validFrom, expiresAt: session.expiresAt, reason: "isolated local fixture", now: session.createAt };
      if (preceding) {
        expect(await post("/internal/v1/auto-mandates", command)).toMatchObject({ status: 409 });
        expect(await post(`/internal/v1/auto-mandates/${preceding.id}/pause`, { mandateVersion: 1, testRunId, reason: "end of session", now: preceding.pauseAt })).toMatchObject({ status: 200, body: { status: "PAUSED" } });
      }
      const created = await post("/internal/v1/auto-mandates", command);
      expect(created).toMatchObject({ status: 201, body: { status: "PENDING", replayed: false } });
      const hash = (created.body as { contentHash: string }).contentHash;
      expect(await post("/internal/v1/auto-mandates", command)).toMatchObject({ status: 200, body: { contentHash: hash, replayed: true } });
      expect(await post(`/internal/v1/auto-mandates/${id}/activate`, { mandateVersion: 1, testRunId, contentHash: "a".repeat(64), reason: "wrong hash", now: session.activateAt })).toMatchObject({ status: 422, body: { reasonCode: "CONTENT_HASH_MISMATCH" } });
      expect(await post(`/internal/v1/auto-mandates/${id}/activate`, { mandateVersion: 1, testRunId, contentHash: hash, reason: "fixture activation", now: session.activateAt })).toMatchObject({ status: 200, body: { status: "ACTIVE", contentHash: hash } });
      expect(await api.handle({ method: "GET", pathname: `/internal/v1/auto-mandates/${id}/runs/${testRunId}`, ...headers, ownerId: "foreign" })).toMatchObject({ status: 404 });
      preceding = { id, pauseAt: session.pauseAt };
    }
    expect(preceding).not.toBeNull();
    expect(await post(`/internal/v1/auto-mandates/${preceding!.id}/pause`, { mandateVersion: 1, testRunId, reason: "end of session", now: preceding!.pauseAt })).toMatchObject({ status: 200 });
    const facts = await pool.query("SELECT status, count(*)::int AS count FROM auto_policy_mandates WHERE mandate_id = ANY($1::uuid[]) GROUP BY status", [ids]);
    expect(facts.rows).toEqual([{ status: "PAUSED", count: 5 }]);
    const events = await pool.query("SELECT event,count(*)::int AS count FROM auto_policy_mandate_events WHERE mandate_id = ANY($1::uuid[]) GROUP BY event ORDER BY event", [ids]);
    expect(events.rows).toEqual([{ event: "ACTIVATED", count: 5 }, { event: "CREATED", count: 5 }, { event: "PAUSED", count: 5 }]);
  });
});
