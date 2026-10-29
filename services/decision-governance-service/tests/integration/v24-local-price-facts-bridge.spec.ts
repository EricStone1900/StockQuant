import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresV24LocalDailyTargetRepository } from "../../../platform-api-service/src/adapters/postgres-v24-local-daily-target-repository.js";
import { PostgresV24LocalOrderIntentRepository } from "../../../platform-api-service/src/adapters/postgres-v24-local-order-intent-repository.js";
import { PostgresStageRunRepository } from "../../../platform-api-service/src/adapters/postgres-stage-run-repository.js";
import { V24LocalEvidenceController, type PlatformContainer } from "../../../platform-api-service/src/bootstrap/app.module.js";
import { prepareV24FixtureDailyTarget } from "../../../platform-api-service/src/application/v24-daily-target.js";
import { PostgresSnapshotSamplingRepository } from "../../../market-data-service/src/adapters/postgres-snapshot-sampling-repository.js";
import { PostgresV24LocalSnapshotBarrierRepository } from "../../../market-data-service/src/adapters/postgres-v24-local-snapshot-barrier-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "../../../market-data-service/src/adapters/postgres-sampling-task-lifecycle-repository.js";
import { parseV21SnapshotSamplingFixture } from "../../../market-data-service/src/application/v21-snapshot-sampling-fixture.js";
import { readV24LocalPriceEvidence } from "../../src/adapters/v24-local-price-facts-client.js";
import { PostgresAutoMandateRepository } from "../../src/adapters/postgres-auto-mandate-repository.js";
import { PostgresExecutionAuthorizationRepository } from "../../src/adapters/postgres-execution-authorization-repository.js";
import { migrateDecisionGovernanceSchema } from "../../src/adapters/postgres-schema-migrations.js";
import { createGovernanceServer } from "../../src/bootstrap/main.js";

const platformUrl = process.env.PLATFORM_API_TEST_DATABASE_URL;
const marketUrl = process.env.MARKET_DATA_TEST_DATABASE_URL;
const governanceUrl = process.env.GOVERNANCE_TEST_DATABASE_URL;
if (!platformUrl || !marketUrl || !governanceUrl || !process.env.STOCKQUANT_ISOLATED_PG_CONTAINER) throw new Error("Three-database isolated PostgreSQL wrapper is required");
const platformPool = new Pool({ connectionString: platformUrl });
const marketPool = new Pool({ connectionString: marketUrl });
const governancePool = new Pool({ connectionString: governanceUrl });
const targets = new PostgresV24LocalDailyTargetRepository(platformPool);
const intents = new PostgresV24LocalOrderIntentRepository(platformPool);
const sampling = new PostgresSnapshotSamplingRepository(marketPool);
const barrier = new PostgresV24LocalSnapshotBarrierRepository(marketPool);
const governanceToken = "g".repeat(40);
const platformToken = "p".repeat(40);
const executionToken = "e".repeat(40);
const replayToken = "r".repeat(40);
const governanceMandates = new PostgresAutoMandateRepository(governancePool);
const root = resolve(import.meta.dirname, "../../../..");
let marketServer: Server;
let platformServer: Server;
let governanceServer: Server;
let marketBaseUrl = "";
let platformBaseUrl = "";
let governanceBaseUrl = "";
let selectedAt: string;
let scope: { ownerId: string; accountId: string; namespace: string; testRunId: string };
let targetId: string;
let clientOrderId: string;
let mandateId: string;
let mandateContentHash: string;

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("HTTP test server did not bind a TCP port");
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}

beforeAll(async () => {
  await new PostgresStageRunRepository(platformPool).migrate(); await targets.migrate(); await intents.migrate();
  await sampling.migrate(); await new PostgresSamplingTaskLifecycleRepository(marketPool).migrate(); await barrier.migrate();
  marketServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://market.local");
      if (request.method !== "GET" || url.pathname !== "/v2/sampling/c5-local/selection" || request.headers.authorization !== `Bearer ${platformToken}`) { response.writeHead(403).end(); return; }
      const result = await barrier.select({ market: "CN_A", ...scope }, url.searchParams.get("sessionDate")!, url.searchParams.get("evaluatedAt")!);
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch { response.writeHead(500).end(); }
  });
  marketBaseUrl = await listen(marketServer);
  const container = { governanceServiceToken: governanceToken, portfolioToken: platformToken, marketDataUrl: marketBaseUrl,
    marketDataHeaders: () => ({ authorization: `Bearer ${platformToken}`, "x-stockquant-service-id": "platform-api-service" }),
    v24LocalDailyTargets: targets, v24LocalOrderIntents: intents } as unknown as PlatformContainer;
  const controller = new V24LocalEvidenceController(container);
  platformServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://platform.local");
      if (request.method !== "GET" || url.pathname !== "/internal/v1/c5-local/price-facts") { response.writeHead(404).end(); return; }
      const query = Object.fromEntries(url.searchParams.entries());
      const facts = await controller.facts(request.headers.authorization, request.headers["x-stockquant-service-id"] as string | undefined, query);
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(facts));
    } catch (error) {
      const status = typeof error === "object" && error !== null && "getStatus" in error && typeof error.getStatus === "function" ? error.getStatus() : 500;
      response.writeHead(status).end();
    }
  });
  platformBaseUrl = await listen(platformServer);

  await migrateDecisionGovernanceSchema(governancePool);
  governanceServer = createGovernanceServer({ repository: new PostgresExecutionAuthorizationRepository(governancePool), mandates: governanceMandates,
    tokens: { "platform-api-service": platformToken, "trade-execution-service": executionToken, "historical-replay-worker": replayToken },
    localPriceFacts: { platformUrl: platformBaseUrl, governanceToken } });
  governanceBaseUrl = await listen(governanceServer);

  const testRunId = randomUUID();
  scope = { ownerId: `c5-bridge-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
  await platformPool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','c5-local-engineering','1.0.0',$2,$3,'RUNNING',20260907,'[]',$4::jsonb)", [testRunId, scope.ownerId, scope.namespace, JSON.stringify({ accountId: scope.accountId })]);
  const fixture = JSON.parse(await readFile(resolve(root, "fixtures/v2/v2.4/c5-local-engineering-v1/input.json"), "utf8"));
  const session = fixture.sessions[2];
  const provenance = { sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionIds: ["bar-1", "bar-2"] as [string, string], calendarVersion: "c5-local-synthetic-sessions-1", asOf: "2024-01-04T09:31:00+08:00" };
  const target = (await prepareV24FixtureDailyTarget(targets, scope, { clock: { now: () => new Date(provenance.asOf) }, sessionDate: session.date, expectedPriorSessions: session.expected.priorDates, bars: fixture.sessions.slice(0, 2).map((bar: { date: string; close: string; availableAt: string }) => ({ securityId: "600000.SH", sessionDate: bar.date, close: bar.close, availableAt: bar.availableAt })), account: { heldQuantity: 0, sellableQuantity: 0, settledCash: "10000.0000" }, mandate: { validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00", paused: false }, referencePrice: "10.2500" }, "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea", provenance, "LOCAL_SESSION")).target;
  targetId = target.targetId; clientOrderId = target.clientOrderId!;
  await intents.accept(scope, targetId, "2024-01-04T09:31:00+08:00");

  mandateId = randomUUID();
  const created = await governanceMandates.create({ mandateId, mandateVersion: 1, ownerId: scope.ownerId, testRunId: scope.testRunId, accountId: scope.accountId,
    strategyVersion: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"],
    maxOrderAmount: "2000.00", maxTotalAmount: "2000.00", maxOrderCount: 1, validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00" }, scope.ownerId, "isolated C5 integration fixture", "2024-01-04T09:29:00+08:00");
  if (!created.contentHash) throw new Error("isolated C5 mandate creation failed");
  mandateContentHash = created.contentHash;
  await governanceMandates.activate({ mandateId, mandateVersion: 1, contentHash: mandateContentHash, ownerId: scope.ownerId, testRunId: scope.testRunId, actorId: scope.ownerId, reason: "isolated C5 integration fixture", now: "2024-01-04T09:30:00+08:00" });

  await barrier.createPlan({ market: "CN_A", ...scope }, "2024-01-04");
  const manifest = JSON.parse(await readFile(resolve(root, "fixtures/v2/v2.4/c5-local-snapshot-20240104/manifest.json"), "utf8"));
  const scheduledAt = "2024-01-04T01:31:10.000Z";
  const task = await sampling.record({ scheduledAt, intervalMinutes: 30, settingsVersion: 1, calendarVersion: "c5-local-synthetic-sessions-1", window: "morning", dataMode: "FIXTURE", sourceId: `fixture:${manifest.fixtureVersion}`, scope: { market: "CN_A", ...scope }, securityIds: ["600000.SH"], status: "QUEUED", fixtureVersion: manifest.fixtureVersion });
  const bytes = await readFile(resolve(root, manifest.files[0].path));
  const parsed = parseV21SnapshotSamplingFixture({ bytes, manifestVersion: manifest.fixtureVersion, manifestSha256: manifest.files[0].sha256, scheduledAt, calendarVersion: "c5-local-synthetic-sessions-1", securityIds: ["600000.SH"], ingestedAt: "2024-01-04T01:31:11.000Z", availableAt: "2024-01-04T01:31:11.000Z", maxAgeMinutes: 20 });
  await sampling.completeFixture(task.taskId, parsed.fixtureVersion, parsed.fixtureSha256, parsed.observations);
  selectedAt = "2024-01-04T09:31:50+08:00";
});

afterAll(async () => {
  if (platformServer) await close(platformServer);
  if (marketServer) await close(marketServer);
  if (governanceServer) await close(governanceServer);
  await Promise.all([platformPool.end(), marketPool.end(), governancePool.end()]);
});

describe("C5 local governance price facts across isolated domain databases", () => {
  it("waits for the persisted snapshot receipt, then resolves the same-run budget facts over service HTTP", async () => {
    const input = { platformUrl: platformBaseUrl, governanceToken, scope, targetId, clientOrderId, evaluatedAt: selectedAt };
    await expect(readV24LocalPriceEvidence(input)).rejects.toThrow("C5_PRICE_FACTS_UNAVAILABLE");
    await barrier.recordCompletion({ market: "CN_A", ...scope }, "2024-01-04");
    await expect(readV24LocalPriceEvidence(input)).resolves.toMatchObject({ targetId, clientOrderId, snapshotId: "fixture-c5-20240104-600000", price: "10.25", budgetAmount: "1030.00" });
    await expect(readV24LocalPriceEvidence({ ...input, scope: { ...scope, ownerId: "foreign" } })).rejects.toThrow();
    const count = await platformPool.query("SELECT count(*)::int AS count FROM v24_local_order_intents WHERE test_run_id=$1", [scope.testRunId]);
    expect(count.rows[0].count).toBe(1);
  });

  it("authorizes only the evidence-derived price and atomically reserves the active Mandate budget", async () => {
    const request = { mandateId, mandateVersion: 1, ...scope, targetId, clientOrderId, evaluatedAt: selectedAt };
    const call = async (body: unknown) => fetch(`${governanceBaseUrl}/internal/v1/c5-local/orders/authorize`, { method: "POST", headers: { authorization: `Bearer ${platformToken}`, "x-stockquant-service-id": "platform-api-service", "content-type": "application/json" }, body: JSON.stringify(body) });
    expect((await call({ ...request, price: "0.01", budgetAmount: "0.01" })).status).toBe(422);
    expect(await governanceMandates.readBudget(mandateId, 1, scope.ownerId, scope.testRunId)).toMatchObject({ reservedAmount: "0.00", reservationCount: 0 });
    await barrier.recordCompletion({ market: "CN_A", ...scope }, "2024-01-04");
    const first = await call(request);
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { decision: { status: string; reservedAmount: string }; reservationId: string; replayed: boolean; priceEvidence: { price: string; budgetAmount: string } };
    expect(firstBody).toMatchObject({ decision: { status: "AUTHORIZED", reservedAmount: "1030.00" }, replayed: false, priceEvidence: { price: "10.25", budgetAmount: "1030.00" } });
    expect(firstBody.reservationId).toBeTruthy();
    const replay = await call(request);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ decision: { status: "AUTHORIZED", reservedAmount: "1030.00" }, reservationId: firstBody.reservationId, replayed: true });
    expect(await governanceMandates.readBudget(mandateId, 1, scope.ownerId, scope.testRunId)).toMatchObject({ reservedAmount: "1030.00", reservationCount: 1 });
    expect(mandateContentHash).toMatch(/^[a-f0-9]{64}$/u);
  });
});
