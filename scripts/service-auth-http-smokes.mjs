import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer as createNetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serviceAuthAdminEndpoint } from "./service-auth-admin-endpoint.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requirePg = createRequire(resolve(root, "services/decision-governance-service/package.json"));
const { Client } = requirePg("pg");
const adminUrl = serviceAuthAdminEndpoint(process.env.STOCKQUANT_AUTH_SMOKE_ADMIN_DATABASE_URL, process.env.STOCKQUANT_ISOLATED_PG_CONTAINER);

const databaseName = `stockquant_auth_smoke_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const tokens = {
  platform: randomBytes(48).toString("base64url"),
  replay: randomBytes(48).toString("base64url"),
  runner: randomBytes(48).toString("base64url"),
  trade: randomBytes(48).toString("base64url")
};
let historicalReplayModeReport = null;
const appEnv = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: "/tmp",
  NODE_ENV: "test",
  STOCKQUANT_BIND_HOST: "127.0.0.1",
  STOCKQUANT_DATABASE_URL: databaseUrl.toString(),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay,
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade,
  STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH: randomBytes(48).toString("base64url"),
  STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1",
  STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1",
  STOCKQUANT_GOVERNANCE_URL: "http://127.0.0.1:1",
  STOCKQUANT_QUANT_RESEARCH_URL: "http://127.0.0.1:1",
  QLIB_WORKER_URL: "http://127.0.0.1:1"
};

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function runService(serviceName, assertions) {
  const serviceDir = resolve(root, "services", serviceName);
  const port = await freePort();
  const child = spawn(process.execPath, [resolve(serviceDir, "dist/main.js")], {
    cwd: serviceDir,
    env: { ...appEnv, STOCKQUANT_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    if (output.length < 6000) output += chunk.toString().slice(0, 6000 - output.length);
  });
  const base = `http://127.0.0.1:${port}`;
  const request = (path, { caller, bearer, owner, actor, method = "GET", body } = {}) => fetch(`${base}${path}`, {
    method,
    headers: {
      ...(caller ? { "x-stockquant-service-id": caller } : {}),
      ...(owner ? { "x-stockquant-owner-id": owner } : {}),
      ...(actor ? { "x-stockquant-actor-id": actor } : {}),
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {})
    },
    ...(body !== undefined ? { body } : {}),
    signal: AbortSignal.timeout(3000)
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`${serviceName} exited before ready: ${output}`);
      try {
        const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { ready = true; break; }
      } catch { /* isolated process is still starting */ }
      await delay(100);
    }
    assert.equal(ready, true, `${serviceName} did not become ready: ${output}`);
    await assertions(request);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

const admin = new Client({ connectionString: adminUrl.toString() });
let created = false;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;

  await Promise.all([1, 2].map(() => runService("decision-governance-service", async (request) => {
    const ready = await request("/ready");
    assert.equal(ready.status, 200, "concurrent Governance startup must serialize and complete the schema baseline");
  })));

  await runService("decision-governance-service", async (request) => {
    const testDb = new Client({ connectionString: databaseUrl.toString() });
    await testDb.connect();
    try {
    const governanceMigrations = await testDb.query("SELECT version, description, count(*) OVER ()::text AS count FROM decision_governance_schema_migrations");
    assert.deepEqual(governanceMigrations.rows, [{
      version: 1,
      description: "V1 execution authorization, proposal, mandate, and strategy snapshot schema",
      count: "1"
    }], "Decision Governance startup must apply exactly one transactional V1 schema baseline");
    console.info(`[Decision Governance schema migration] ${JSON.stringify({ version: 1, count: governanceMigrations.rows[0].count, isolatedDatabase: databaseName })}`);
    const governanceRouteScopes = [
      { method: "GET", path: `/internal/v1/proposals/${randomUUID()}`, callers: ["platform-api-service", "trade-execution-service"] },
      { method: "GET", path: `/internal/v1/auto-mandates/${randomUUID()}/runs/${randomUUID()}`, callers: ["platform-api-service"] },
      { method: "GET", path: `/internal/v1/auto-mandates/${randomUUID()}/runs/${randomUUID()}/versions/1/budget`, callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/v12/strategy-snapshots", callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/authorizations", callers: ["historical-replay-worker"] },
      { method: "POST", path: `/internal/v1/proposals/${randomUUID()}/execution-authorizations`, callers: ["trade-execution-service"] },
      { method: "POST", path: `/internal/v1/proposals/${randomUUID()}/execution-authorizations/validate`, callers: ["trade-execution-service"] },
      { method: "POST", path: `/internal/v1/auto-mandates/${randomUUID()}/orders/authorize`, callers: ["trade-execution-service"] },
      { method: "POST", path: `/internal/v1/auto-mandates/reservations/${randomUUID()}/settle`, callers: ["trade-execution-service"] },
      { method: "POST", path: "/internal/v1/paper-authorizations", callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/paper-authorizations/revoke", callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/candidate-mandates/readiness", callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/proposals", callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/auto-mandates", callers: ["platform-api-service"] },
      { method: "POST", path: `/internal/v1/auto-mandates/${randomUUID()}/activate`, callers: ["platform-api-service"] },
      { method: "POST", path: `/internal/v1/auto-mandates/${randomUUID()}/pause`, callers: ["platform-api-service"] },
      { method: "POST", path: `/internal/v1/proposals/${randomUUID()}/approve`, callers: ["platform-api-service"] },
      { method: "POST", path: `/internal/v1/proposals/${randomUUID()}/reject`, callers: ["platform-api-service"] },
      { method: "POST", path: `/internal/v1/proposals/${randomUUID()}/revise`, callers: ["platform-api-service"] },
      { method: "POST", path: "/internal/v1/paper-authorizations/validate", callers: ["trade-execution-service"] },
      { method: "POST", path: "/internal/v1/authorizations/validate", callers: ["trade-execution-service"] }
    ];
    const governanceIdentities = [
      { id: "platform-api-service", token: tokens.platform },
      { id: "trade-execution-service", token: tokens.trade },
      { id: "historical-replay-worker", token: tokens.replay }
    ];
    const factTables = ["proposals", "proposal_versions", "proposal_decisions", "proposal_revisions", "proposal_execution_authorizations", "execution_authorizations", "auto_policy_mandates", "auto_policy_mandate_events", "auto_policy_budget_reservations", "governed_strategy_snapshots"];
    const governanceFacts = async () => Object.fromEntries(await Promise.all(factTables.map(async (table) => [table, (await testDb.query(`SELECT count(*)::text AS count FROM ${table}`)).rows[0].count])));
    const factsBeforeRouteProbes = await governanceFacts();
    let rejectedRouteProbes = 0;
    for (const route of governanceRouteScopes) {
      for (const identity of governanceIdentities.filter((item) => !route.callers.includes(item.id))) {
        const response = await request(route.path, { method: route.method, caller: identity.id, bearer: identity.token, body: route.method === "POST" ? "{" : undefined });
        assert.equal(response.status, 403, `wrong service ${identity.id} must be rejected before parsing ${route.method} ${route.path}`);
        rejectedRouteProbes += 1;
      }
      const allowedIdentity = governanceIdentities.find((item) => route.callers.includes(item.id));
      const wrongMethod = route.method === "GET" ? "POST" : "GET";
      const methodResponse = await request(route.path, { method: wrongMethod, caller: allowedIdentity.id, bearer: allowedIdentity.token, body: wrongMethod === "POST" ? "{" : undefined });
      assert.equal(methodResponse.status, 403, `wrong HTTP method must be rejected for ${route.path}`);
      rejectedRouteProbes += 1;
      const wrongBearer = await request(route.path, { method: route.method, caller: allowedIdentity.id, bearer: tokens.runner, body: route.method === "POST" ? "{" : undefined });
      assert.equal(wrongBearer.status, 403, `wrong Bearer must be rejected for ${route.method} ${route.path}`);
      rejectedRouteProbes += 1;
    }
    assert.deepEqual(await governanceFacts(), factsBeforeRouteProbes, "unauthorized route probes must not mutate Governance business facts");
    console.info(`[Decision Governance route-scope HTTP+PG matrix] ${JSON.stringify({ status: "PASS", admittedRoutes: governanceRouteScopes.length, identities: governanceIdentities.map((item) => item.id), rejectedRouteProbes, malformedPostRejectedBeforeParsing: true, businessFactsUnchanged: true })}`);
    const budgetOwner = `budget-owner-${randomUUID()}`;
    const budgetRun = randomUUID();
    const budgetMandate = randomUUID();
    const budgetAccount = randomUUID();
    const budgetCreatedAt = "2026-09-25T01:00:00.000Z";
    await testDb.query("INSERT INTO auto_policy_mandates(mandate_id,mandate_version,content_hash,owner_id,test_run_id,account_id,strategy_version,market,currency,security_scope,max_order_amount,max_total_amount,max_order_count,valid_from,expires_at,status,created_at) VALUES($1,1,$2,$3,$4,$5,'fixture-auto-policy-test-v1','CN_A','CNY','[\"600000.SH\"]'::jsonb,1000,3000,3,$6,$7,'ACTIVE',$6)", [budgetMandate, "a".repeat(64), budgetOwner, budgetRun, budgetAccount, budgetCreatedAt, "2026-09-25T07:00:00.000Z"]);
    for (const [status, amount] of [["RESERVED", "100.00"], ["CONSUMED", "200.00"], ["RELEASED", "50.00"]]) {
      await testDb.query("INSERT INTO auto_policy_budget_reservations(reservation_id,mandate_id,mandate_version,proposal_id,proposal_version,proposal_hash,client_order_id,command_hash,amount,status,created_at,updated_at) VALUES($1,$2,1,$3,1,$4,$5,$6,$7,$8,$9,$9)", [randomUUID(), budgetMandate, randomUUID(), "b".repeat(64), `client-${status}`, "c".repeat(64), amount, status, budgetCreatedAt]);
    }
    const budgetPath = `/internal/v1/auto-mandates/${budgetMandate}/runs/${budgetRun}/versions/1/budget`;
    const budgetRead = await request(budgetPath, { caller: "platform-api-service", bearer: tokens.platform, owner: budgetOwner });
    assert.equal(budgetRead.status, 200, "Platform identity with the exact owner/TestRun scope may independently read budget totals");
    assert.deepEqual(await budgetRead.json(), { mandateId: budgetMandate, mandateVersion: 1, ownerId: budgetOwner, testRunId: budgetRun, reservedAmount: "100.00", consumedAmount: "200.00", releasedAmount: "50.00", reservationCount: 3, consumedCount: 1, releasedCount: 1 });
    assert.equal((await request(budgetPath, { caller: "trade-execution-service", bearer: tokens.trade })).status, 403, "Trade identity cannot use the Platform-only budget read");
    const wrongOwnerBudget = await request(budgetPath, { caller: "platform-api-service", bearer: tokens.platform, owner: "wrong-owner" });
    assert.equal(wrongOwnerBudget.status, 404, "budget reads cannot cross owner scope");
    console.info(`[Decision Governance Mandate budget read] ${JSON.stringify({ status: "PASS", reservedAmount: "100.00", consumedAmount: "200.00", releasedAmount: "50.00", reservationCount: 3, ownerScoped: true, testRunScoped: true })}`);
    const mandateOwner = `mandate-boundary-${randomUUID()}`;
    const mandateRun = randomUUID();
    const mandateId = randomUUID();
    const mandatePath = "/internal/v1/auto-mandates";
    const mandateCommand = { mandateId, mandateVersion: 1, testRunId: mandateRun, accountId: randomUUID(), strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1000.00", maxTotalAmount: "2000.00", maxOrderCount: 2, validFrom: "2026-09-25T01:00:00.000Z", expiresAt: "2026-09-25T07:00:00.000Z", reason: "isolated mode-boundary smoke", now: "2026-09-25T01:00:00.000Z" };
    const injectedModes = [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]];
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request(mandatePath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify({ ...mandateCommand, environmentMode, brokerMode }) });
      assert.equal(rejected.status, 422, `AUTO Mandate create must reject injected ${environmentMode}/${brokerMode}`);
    }
    assert.equal((await testDb.query("SELECT count(*)::text AS count FROM auto_policy_mandates WHERE mandate_id=$1", [mandateId])).rows[0].count, "0", "mode-injected AUTO Mandate create attempts must not persist a Mandate");
    const mandateCreated = await request(mandatePath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify(mandateCommand) });
    assert.equal(mandateCreated.status, 201, "a valid owner-scoped PAPER/FAKE AUTO Mandate must persist");
    const mandateCreatedBody = await mandateCreated.json();
    const activationPath = `${mandatePath}/${mandateId}/activate`;
    const activationCommand = { mandateVersion: 1, testRunId: mandateRun, contentHash: mandateCreatedBody.contentHash, reason: "activate exact isolated Mandate", now: "2026-09-25T01:01:00.000Z" };
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request(activationPath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify({ ...activationCommand, environmentMode, brokerMode }) });
      assert.equal(rejected.status, 422, `AUTO Mandate activation must reject injected ${environmentMode}/${brokerMode}`);
    }
    assert.equal((await testDb.query("SELECT status FROM auto_policy_mandates WHERE mandate_id=$1", [mandateId])).rows[0].status, "PENDING", "mode-injected activation attempts must leave the Mandate pending");
    const activatedMandate = await request(activationPath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify(activationCommand) });
    const activatedMandateBody = await activatedMandate.json();
    assert.equal(activatedMandate.status, 200, `the exact valid activation must remain available after rejected injection attempts: ${JSON.stringify(activatedMandateBody)}`);
    const pausePath = `${mandatePath}/${mandateId}/pause`;
    const pauseCommand = { mandateVersion: 1, testRunId: mandateRun, reason: "pause exact isolated Mandate", now: "2026-09-25T01:02:00.000Z" };
    const pauseModeResults = [];
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request(pausePath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify({ ...pauseCommand, environmentMode, brokerMode }) });
      assert.equal(rejected.status, 422, `AUTO Mandate pause must reject injected ${environmentMode}/${brokerMode}`);
      pauseModeResults.push({ environmentMode, brokerMode, status: rejected.status });
    }
    const mandateAfterPauseInjection = await testDb.query("SELECT m.status,(SELECT count(*)::text FROM auto_policy_mandate_events e WHERE e.mandate_id=m.mandate_id) AS event_count FROM auto_policy_mandates m WHERE m.mandate_id=$1", [mandateId]);
    assert.deepEqual(mandateAfterPauseInjection.rows, [{ status: "ACTIVE", event_count: "2" }], "mode-injected pause attempts must leave the active mandate and event history unchanged");
    const mandateAuthPath = `${mandatePath}/${mandateId}/orders/authorize`;
    const reservationCountBeforeInjection = (await testDb.query("SELECT count(*)::text AS count FROM auto_policy_budget_reservations")).rows[0].count;
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request(mandateAuthPath, { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, owner: mandateOwner, body: JSON.stringify({ mandateVersion: 1, ownerId: mandateOwner, clientOrderId: `injected-${randomUUID()}`, commandHash: "e".repeat(64), proposal: {}, now: "2026-09-25T01:02:00.000Z", environmentMode, brokerMode }) });
      assert.equal(rejected.status, 422, `AUTO Mandate order authorization must reject injected ${environmentMode}/${brokerMode}`);
    }
    assert.equal((await testDb.query("SELECT count(*)::text AS count FROM auto_policy_budget_reservations")).rows[0].count, reservationCountBeforeInjection, "mode-injected AUTO order attempts must not reserve budget");
    const settlementPath = `/internal/v1/auto-mandates/reservations/${randomUUID()}/settle`;
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request(settlementPath, { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ outcome: "CONSUMED", now: "2026-09-25T01:03:00.000Z", environmentMode, brokerMode }) });
      assert.equal(rejected.status, 422, `AUTO budget settlement must reject injected ${environmentMode}/${brokerMode}`);
    }
    const validPause = await request(pausePath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: mandateOwner, actor: mandateOwner, body: JSON.stringify(pauseCommand) });
    assert.equal(validPause.status, 200, "valid Mandate pause must remain available after mode injection rejections");
    assert.equal((await testDb.query("SELECT status FROM auto_policy_mandates WHERE mandate_id=$1", [mandateId])).rows[0].status, "PAUSED");
    console.info(`[V1.3 AUTO Mandate mode-injection HTTP+PG] ${JSON.stringify({ status: "PASS", attemptedModes: injectedModes, createRowsAfterRejection: 0, activationRemainedPending: true, validCreateAndActivation: true, pauseModeResults, mandateUnchangedAfterPauseInjection: mandateAfterPauseInjection.rows[0].status === "ACTIVE" && mandateAfterPauseInjection.rows[0].event_count === "2", validPauseStatus: validPause.status, orderBudgetSideEffects: 0, settlementModeInjectionRejected: true })}`);
    const missing = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", body: "{" });
    const mismatched = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.trade, body: "{" });
    const forgedScope = await request("/internal/v1/authorizations", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: "{" });
    const requestAuthorized = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: "{" });
    const validateAuthorized = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: "{" });
    assert.equal(missing.status, 403);
    assert.equal(mismatched.status, 403);
    assert.equal(forgedScope.status, 403);
    assert.equal(requestAuthorized.status, 422, "valid replay identity must reach JSON validation without writing a row");
    assert.equal(validateAuthorized.status, 422, "valid execution identity must reach JSON validation without writing a row");

    const proposalId = randomUUID();
    const proposalGrantPath = `/internal/v1/proposals/${proposalId}/execution-authorizations`;
    const proposalValidatePath = `${proposalGrantPath}/validate`;
    assert.equal((await request(proposalGrantPath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, body: "{" })).status, 403, "Platform must not create a V1.3 execution grant");
    assert.equal((await request(proposalValidatePath, { method: "POST", caller: "platform-api-service", bearer: tokens.platform, body: "{" })).status, 403, "Platform must not validate a V1.3 execution grant");
    assert.equal((await request(proposalGrantPath, { method: "POST", caller: "trade-execution-service", bearer: tokens.platform, body: "{" })).status, 403, "Trade caller with another service's token must be rejected");
    assert.equal((await request(proposalGrantPath, { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: "{" })).status, 422, "authorized Trade request must reach V1.3 payload validation");
    assert.equal((await testDb.query("SELECT count(*)::text AS count FROM proposal_execution_authorizations")).rows[0].count, "0", "unauthorized and invalid V1.3 grant attempts must not persist rows");
    console.info(`[V1.3 Proposal execution authorization HTTP boundary] ${JSON.stringify({ status: "PASS", unauthorizedCallerRejected: true, mismatchedBearerRejected: true, malformedAuthorizedRequestRejected: true, persistedAuthorizationRows: 0 })}`);

    const proposalOwner = `proposal-owner-${randomUUID()}`;
    const proposalRun = randomUUID();
    const proposalAccount = randomUUID();
    const proposalNow = "2026-10-07T00:00:00.000Z";
    const proposalExpiry = "2026-10-08T00:00:00.000Z";
    const proposalCreate = await request("/internal/v1/proposals", {
      method: "POST", caller: "platform-api-service", bearer: tokens.platform,
      body: JSON.stringify({ ownerId: proposalOwner, testRunId: proposalRun, idempotencyKey: `auth-smoke-${randomUUID()}`, accountId: proposalAccount, strategyVersion: "fixture-manual-auth-smoke-v1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: proposalExpiry, legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] })
    });
    assert.equal(proposalCreate.status, 201, "Platform may create an isolated PAPER/FAKE Proposal for the TestRun");
    const proposal = await proposalCreate.json();
    const platformActor = `approver-${randomUUID()}`;
    const proposalModes = injectedModes;
    const proposalRevision = { expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, operation: "REBALANCE", expiresAt: proposalExpiry, legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }], reason: "mode-boundary smoke", now: proposalNow };
    const proposalMutationModeResults = [];
    for (const [environmentMode, brokerMode] of proposalModes) {
      const decisionResponse = await request(`/internal/v1/proposals/${proposal.proposalId}/approve`, {
        method: "POST", caller: "platform-api-service", bearer: tokens.platform, actor: platformActor,
        body: JSON.stringify({ expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, reason: "mode injection must be rejected", now: proposalNow, environmentMode, brokerMode })
      });
      assert.equal(decisionResponse.status, 422, `Proposal approval must reject injected ${environmentMode}/${brokerMode}`);
      const rejectionResponse = await request(`/internal/v1/proposals/${proposal.proposalId}/reject`, {
        method: "POST", caller: "platform-api-service", bearer: tokens.platform, actor: platformActor,
        body: JSON.stringify({ expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, reason: "mode injection must be rejected", now: proposalNow, environmentMode, brokerMode })
      });
      assert.equal(rejectionResponse.status, 422, `Proposal rejection must reject injected ${environmentMode}/${brokerMode}`);
      const revisionResponse = await request(`/internal/v1/proposals/${proposal.proposalId}/revise`, {
        method: "POST", caller: "platform-api-service", bearer: tokens.platform, owner: proposalOwner, actor: platformActor,
        body: JSON.stringify({ ...proposalRevision, environmentMode, brokerMode })
      });
      assert.equal(revisionResponse.status, 422, `Proposal revision must reject injected ${environmentMode}/${brokerMode}`);
      proposalMutationModeResults.push({ environmentMode, brokerMode, approvalStatus: decisionResponse.status, rejectionStatus: rejectionResponse.status, revisionStatus: revisionResponse.status });
    }
    const proposalAfterModeInjection = await testDb.query(`SELECT p.status,p.proposal_version,p.content_hash,
      (SELECT count(*)::text FROM proposal_decisions d WHERE d.proposal_id=p.proposal_id) AS decision_count,
      (SELECT count(*)::text FROM proposal_revisions r WHERE r.proposal_id=p.proposal_id) AS revision_count
      FROM proposals p WHERE p.proposal_id=$1`, [proposal.proposalId]);
    assert.deepEqual(proposalAfterModeInjection.rows, [{ status: "MANUAL_APPROVAL_PENDING", proposal_version: 1, content_hash: proposal.contentHash, decision_count: "0", revision_count: "0" }], "mode injection on approval/rejection/revision must not change proposal state or create decision/revision rows");
    const approvedResponse = await request(`/internal/v1/proposals/${proposal.proposalId}/approve`, {
      method: "POST", caller: "platform-api-service", bearer: tokens.platform, actor: platformActor,
      body: JSON.stringify({ expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, reason: "isolated authorization smoke approval", now: proposalNow })
    });
    assert.equal(approvedResponse.status, 200, "Platform approval must persist before Trade can request execution authorization");
    assert.equal((await approvedResponse.json()).status, "APPROVED_MANUAL");
    const proposalCommand = { proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, ownerId: proposalOwner, testRunId: proposalRun, accountId: proposalAccount, clientOrderId: `client-${randomUUID()}`, commandHash: "d".repeat(64), now: proposalNow };
    const rejectedProposalModes = proposalModes;
    for (const [scope, changedScope] of [
      ["owner", { ownerId: `wrong-owner-${randomUUID()}` }],
      ["TestRun", { testRunId: randomUUID() }],
      ["account", { accountId: randomUUID() }]
    ]) {
      const wrongScope = await request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations`, {
        method: "POST", caller: "trade-execution-service", bearer: tokens.trade,
        body: JSON.stringify({ ...proposalCommand, ...changedScope, clientOrderId: `wrong-${String(scope).toLowerCase()}-${randomUUID()}` })
      });
      assert.equal(wrongScope.status, 403, `Trade authorization must reject a Proposal ${scope} scope mismatch`);
    }
    for (const [environmentMode, brokerMode] of rejectedProposalModes) {
      const rejectedMode = await request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations`, {
        method: "POST", caller: "trade-execution-service", bearer: tokens.trade,
        body: JSON.stringify({ ...proposalCommand, environmentMode, brokerMode, clientOrderId: `wrong-mode-${environmentMode}-${brokerMode}-${randomUUID()}` })
      });
      assert.equal(rejectedMode.status, 422, `Proposal execution authorization must reject injected ${environmentMode}/${brokerMode}`);
    }
    assert.equal((await testDb.query("SELECT count(*)::text AS count FROM proposal_execution_authorizations")).rows[0].count, "0", "wrong owner/TestRun/account authorization attempts must not create grants");
    const grantResponse = await request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations`, {
      method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify(proposalCommand)
    });
    assert.equal(grantResponse.status, 200, "Trade may receive a grant only for the exact approved Proposal scope");
    const grant = await grantResponse.json();
    assert.equal(grant.status, "ACTIVE");
    for (const [environmentMode, brokerMode] of rejectedProposalModes) {
      const rejectedModeValidation = await request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations/validate`, {
        method: "POST", caller: "trade-execution-service", bearer: tokens.trade,
        body: JSON.stringify({ ...proposalCommand, authorizationId: grant.authorizationId, environmentMode, brokerMode })
      });
      assert.equal(rejectedModeValidation.status, 422, `Proposal execution validation must reject injected ${environmentMode}/${brokerMode}`);
    }
    const activeAfterModeInjection = await testDb.query("SELECT status FROM proposal_execution_authorizations WHERE authorization_id=$1", [grant.authorizationId]);
    assert.deepEqual(activeAfterModeInjection.rows, [{ status: "ACTIVE" }], "mode-injection validation attempts must not consume the execution grant");
    const changedCommand = await request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations/validate`, {
      method: "POST", caller: "trade-execution-service", bearer: tokens.trade,
      body: JSON.stringify({ ...proposalCommand, authorizationId: grant.authorizationId, commandHash: "e".repeat(64) })
    });
    assert.equal(changedCommand.status, 403, "changed command hash must not consume the Proposal grant");
    const validateProposal = () => request(`/internal/v1/proposals/${proposal.proposalId}/execution-authorizations/validate`, {
      method: "POST", caller: "trade-execution-service", bearer: tokens.trade,
      body: JSON.stringify({ ...proposalCommand, authorizationId: grant.authorizationId })
    });
    const proposalValidations = await Promise.all([validateProposal(), validateProposal()]);
    const proposalValidationResults = await Promise.all(proposalValidations.map(async (response) => ({ status: response.status, body: await response.json() })));
    assert.deepEqual(proposalValidationResults.map((result) => result.status).sort(), [200, 200], "exact Proposal command may safely retry an uncertain validation response");
    assert.equal(proposalValidationResults.filter((result) => result.body.replayed === false).length, 1, "exactly one validation consumes the Proposal authorization");
    assert.equal(proposalValidationResults.filter((result) => result.body.replayed === true).length, 1, "concurrent retry is reported as a replay");
    const proposalAuthorizationState = await testDb.query("SELECT status, owner_id, test_run_id, account_id, command_hash FROM proposal_execution_authorizations WHERE authorization_id=$1", [grant.authorizationId]);
    assert.deepEqual(proposalAuthorizationState.rows, [{ status: "CONSUMED", owner_id: proposalOwner, test_run_id: proposalRun, account_id: proposalAccount, command_hash: proposalCommand.commandHash }], "the persisted authorization is consumed once and remains bound to the exact owner/TestRun/account/command");
    assert.equal((await testDb.query("SELECT count(*)::text AS count FROM proposal_execution_authorizations")).rows[0].count, "1", "authorized retries must not create duplicate grant rows");
    console.info(`[V1.3 Proposal execution authorization HTTP+PG] ${JSON.stringify({ status: "PASS", proposalStatus: "APPROVED_MANUAL", proposalMutationModeResults, proposalUnchangedAfterModeInjection: proposalAfterModeInjection.rows[0].decision_count === "0" && proposalAfterModeInjection.rows[0].revision_count === "0" && proposalAfterModeInjection.rows[0].proposal_version === 1, grantStatus: grant.status, wrongOwnerRejected: true, wrongTestRunRejected: true, wrongAccountRejected: true, modeInjectionRejectedAtGrant: rejectedProposalModes, modeInjectionRejectedAtValidation: rejectedProposalModes, modeInjectionDidNotConsumeGrant: activeAfterModeInjection.rows[0].status === "ACTIVE", changedCommandRejected: true, concurrentValidationStatuses: proposalValidationResults.map((result) => result.body.replayed ? "REPLAYED" : "CONSUMED"), persistedStatus: proposalAuthorizationState.rows[0].status, ownerBound: true, testRunBound: true, accountBound: true, commandBound: true, authorizationRows: 1 })}`);

    const command = { namespace: `auth-smoke-${randomUUID()}`, accountId: randomUUID(), clientOrderId: `order-${randomUUID()}`, security: "600000.SH", requestedQuantity: 100, bar: { timestamp: "2026-09-25T01:32:00.000Z", open: "10.0000", volume: 1000 } };
    const replayAuthorizationRowsBeforeInjection = (await testDb.query("SELECT count(*)::text AS count FROM execution_authorizations")).rows[0].count;
    const replayModeResults = [];
    let injectedBacktestAuthorizationId;
    for (const [environmentMode, brokerMode] of injectedModes) {
      const rejected = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: command.namespace, accountId: command.accountId, command, environmentMode, brokerMode }) });
      const isAllowedReplayMode = environmentMode === "BACKTEST" && brokerMode === "FAKE";
      assert.equal(rejected.status, isAllowedReplayMode ? 200 : 422, `historical replay authorization mode ${environmentMode}/${brokerMode} has the wrong boundary result`);
      const result = isAllowedReplayMode ? await rejected.json() : undefined;
      if (isAllowedReplayMode) injectedBacktestAuthorizationId = result.authorizationId;
      replayModeResults.push({ environmentMode, brokerMode, status: rejected.status, authorizationId: result?.authorizationId });
    }
    const replayAuthorizationRowsAfterInjection = (await testDb.query("SELECT count(*)::text AS count FROM execution_authorizations")).rows[0].count;
    assert.equal(replayAuthorizationRowsAfterInjection, String(Number(replayAuthorizationRowsBeforeInjection) + 1), "only the valid BACKTEST/FAKE request may persist one replay authorization");
    const issuedResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: command.namespace, accountId: command.accountId, command, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(issuedResponse.status, 200, "valid replay command should receive a scoped one-time authorization");
    const { authorizationId } = await issuedResponse.json();
    assert.notEqual(authorizationId, injectedBacktestAuthorizationId, "a second valid BACKTEST/FAKE grant in the same namespace must rotate the authorization ID");
    const tampered = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command: { ...command, requestedQuantity: 101 } }) });
    assert.equal(tampered.status, 403, "changed command must not consume or validate the authorization");
    const replayedValidations = await Promise.all([1, 2].map(() => request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command }) })));
    const replayedResults = await Promise.all(replayedValidations.map(async (response) => ({ status: response.status, body: await response.json() })));
    assert.deepEqual(replayedResults.map((result) => result.status).sort(), [200, 200], "the same authorized command may safely retry validation after an uncertain response");
    assert.equal(replayedResults.filter((result) => result.body.replayed === false).length, 1, "exactly one concurrent validation must perform the first consumption");
    assert.equal(replayedResults.filter((result) => result.body.replayed === true).length, 1, "the other concurrent validation must be identified as an idempotent replay");
    const authorizationState = await testDb.query("SELECT status FROM execution_authorizations WHERE authorization_id=$1", [authorizationId]);
    assert.equal(authorizationState.rows[0]?.status, "CONSUMED", "concurrent validation must leave the authorization consumed exactly once");
    console.info(`[V1.3 historical replay mode boundary HTTP+PG] ${JSON.stringify({ status: "PASS", modeResults: replayModeResults, authorizationRowsBeforeInjection: replayAuthorizationRowsBeforeInjection, authorizationRowsAfterInjection: replayAuthorizationRowsAfterInjection, onlyValidBacktestFakePersisted: Number(replayAuthorizationRowsAfterInjection) === Number(replayAuthorizationRowsBeforeInjection) + 1, acceptedMode: "BACKTEST/FAKE", subsequentValidGrantRotatedAuthorization: authorizationId !== injectedBacktestAuthorizationId, consumedOnce: authorizationState.rows[0]?.status === "CONSUMED" })}`);

    const renewedCommand = { ...command, clientOrderId: `order-${randomUUID()}`, requestedQuantity: 50 };
    const renewedResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: command.namespace, accountId: command.accountId, command: renewedCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(renewedResponse.status, 200);
    const renewed = await renewedResponse.json();
    assert.notEqual(renewed.authorizationId, authorizationId, "re-issuing within the same namespace must rotate the authorization ID");
    const staleId = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command }) });
    assert.equal(staleId.status, 403, "prior authorization ID must remain invalid after namespace renewal");

    const expiredCommand = { ...command, namespace: `auth-smoke-expired-${randomUUID()}`, clientOrderId: `order-${randomUUID()}` };
    const expiredResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: expiredCommand.namespace, accountId: expiredCommand.accountId, command: expiredCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(expiredResponse.status, 200);
    const expired = await expiredResponse.json();
    await testDb.query("UPDATE execution_authorizations SET expires_at=now()-interval '1 second' WHERE authorization_id=$1", [expired.authorizationId]);
    const expiredValidation = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId: expired.authorizationId, accountId: expiredCommand.accountId, command: expiredCommand }) });
    assert.equal(expiredValidation.status, 403, "expired authorization must be rejected");
    } finally {
      await testDb.end();
    }
  });

  await Promise.all([1, 2].map(() => runService("historical-replay-worker", async (request) => {
    const ready = await request("/ready");
    assert.equal(ready.status, 200, "concurrent Replay startup must serialize and complete the schema baseline");
  })));

  await runService("historical-replay-worker", async (request) => {
    const runId = randomUUID();
    const missingPath = `/internal/v1/replays/${randomUUID()}`;
    const replayDb = new Client({ connectionString: databaseUrl.toString() });
    replayDb.on("error", () => {});
    await replayDb.connect();
    try {
    const replayMigrations = await replayDb.query("SELECT version, description, count(*) OVER ()::text AS count FROM historical_replay_schema_migrations");
    assert.deepEqual(replayMigrations.rows, [{
      version: 1,
      description: "V1 historical replay run and checkpoint schema",
      count: "1"
    }], "Historical Replay startup must apply exactly one transactional V1 schema baseline");
    console.info(`[Historical Replay schema migration] ${JSON.stringify({ version: 1, count: replayMigrations.rows[0].count, isolatedDatabase: databaseName })}`);
    const path = `/internal/v1/replays/${runId}`;
    const missing = await request(path, { caller: "platform-api-service" });
    const mismatched = await request(path, { caller: "platform-api-service", bearer: tokens.replay });
    const forged = await request(path, { caller: "unknown-service", bearer: tokens.platform });
    const allowedRead = await request(path, { caller: "platform-api-service", bearer: tokens.platform });
    assert.equal(missing.status, 403);
    assert.equal(mismatched.status, 403);
    assert.equal(forged.status, 403);
    assert.equal(allowedRead.status, 404, "authorized read should reach the exact run lookup");

    await replayDb.query("INSERT INTO replay_worker_runs (test_run_id,namespace,owner_id,scenario_id,request_hash,status,checkpoint,result) VALUES ($1,$2,$3,'normal',$4,'COMPLETED','{}'::jsonb,'{}'::jsonb)", [runId, `auth-smoke-${runId}`, "service-auth-smoke", "a".repeat(64)]);
    const persistedRead = await request(path, { caller: "platform-api-service", bearer: tokens.platform });
    const persistedRun = await persistedRead.json();
    assert.equal(persistedRead.status, 200, "authorized read returns an existing persisted replay run");
    assert.equal(persistedRun.testRunId, runId);
    assert.equal(Object.hasOwn(persistedRun, "requestHash"), false, "internal idempotency fingerprint must not leak through the public run response");
    const bodyInjectionResults = await Promise.all([
      ...["pause", "resume", "cancel"].map((action) => request(`${path}/${action}`, { caller: "platform-api-service", bearer: tokens.platform, method: "POST", body: JSON.stringify({ status: "CANCELLED", result: { status: "FILLED" } }) })),
      request(`${path}/recover-unknown`, { caller: "platform-api-service", bearer: tokens.platform, method: "POST", body: JSON.stringify({ status: "FILLED", orderId: "forged-order" }) })
    ]);
    assert.deepEqual(bodyInjectionResults.map((response) => response.status), [422, 422, 422, 422], "bodyless lifecycle/recovery commands must reject client-supplied service facts");
    const replayClientModes = [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]];
    const lifecycleModeResults = await Promise.all(["pause", "resume", "cancel", "recover-unknown"].flatMap((action) => replayClientModes.map(([environmentMode, brokerMode]) => request(`${path}/${action}`, { caller: "platform-api-service", bearer: tokens.platform, method: "POST", body: JSON.stringify({ environmentMode, brokerMode }) }))));
    assert.equal(lifecycleModeResults.length, 24);
    assert(lifecycleModeResults.every((response) => response.status === 422), "all six client mode pairs must be rejected by each bodyless Replay lifecycle/recovery route");
    const unchangedAfterBodyInjection = await replayDb.query("SELECT status,result FROM replay_worker_runs WHERE test_run_id=$1", [runId]);
    assert.equal(unchangedAfterBodyInjection.rows[0].status, "COMPLETED");
    assert.deepEqual(unchangedAfterBodyInjection.rows[0].result, {}, "rejected lifecycle/recovery payloads must not mutate persisted replay state");

    const platform = { caller: "platform-api-service", bearer: tokens.platform };
    const forbiddenCallers = [
      { caller: "runner-host", bearer: tokens.runner },
      { caller: platform.caller, bearer: tokens.replay }
    ];
    const writeCases = [
      ["single replay submit", "/internal/v1/replays", "POST"],
      ["multi replay submit", "/internal/v1/replays/multi", "POST"],
      ["async multi replay submit", "/internal/v1/replays/multi?async=true", "POST"],
      ["pause foreign run", `${path}/pause`, "POST"],
      ["resume foreign run", `${path}/resume`, "POST"],
      ["cancel foreign run", `${path}/cancel`, "POST"],
      ["recover foreign run", `${path}/recover-unknown`, "POST"]
    ];
    for (const [label, route, method] of writeCases) {
      for (const identity of forbiddenCallers) {
        const denied = await request(route, { ...identity, method, body: "{}" });
        assert.equal(denied.status, 403, `${label} must reject the foreign or mismatched service identity before reading or changing replay state`);
      }
    }

    const singleMalformed = await request("/internal/v1/replays", { ...platform, method: "POST", body: "{}" });
    const multiMalformed = await request("/internal/v1/replays/multi", { ...platform, method: "POST", body: "{}" });
    const asyncMalformed = await request("/internal/v1/replays/multi?async=true", { ...platform, method: "POST", body: "{}" });
    assert.deepEqual([singleMalformed.status, multiMalformed.status, asyncMalformed.status], [422, 422, 422], "authorized malformed submits must stop at input validation and create no run");
    const replaySubmission = { testRunId: randomUUID(), namespace: `mode-injection-${randomUUID()}`, ownerId: "service-auth-smoke", scenarioId: "normal", seed: 20260907, bar: { timestamp: "2024-01-02T09:31:00+08:00", open: "10.0000", volume: 1000 } };
    const { bar: replayBar, ...multiReplayBase } = replaySubmission;
    const submitRoutes = [
      { label: "single", path: "/internal/v1/replays", body: replaySubmission },
      { label: "multi", path: "/internal/v1/replays/multi", body: { ...multiReplayBase, bars: [replayBar] } },
      { label: "async-multi", path: "/internal/v1/replays/multi?async=true", body: { ...multiReplayBase, bars: [replayBar] } }
    ];
    const replayRunCountBeforeModes = Number((await replayDb.query("SELECT count(*)::int AS count FROM replay_worker_runs")).rows[0].count);
    const replaySubmissionModeResults = [];
    for (const route of submitRoutes) {
      for (const [environmentMode, brokerMode] of replayClientModes) {
        const rejected = await request(route.path, { ...platform, method: "POST", body: JSON.stringify({ ...route.body, environmentMode, brokerMode }) });
        assert.equal(rejected.status, 422, `${route.label} Replay submission must reject injected ${environmentMode}/${brokerMode}`);
        replaySubmissionModeResults.push({ route: route.label, environmentMode, brokerMode, status: rejected.status });
      }
    }
    const replayRunCountAfterModes = Number((await replayDb.query("SELECT count(*)::int AS count FROM replay_worker_runs")).rows[0].count);
    assert.equal(replayRunCountAfterModes, replayRunCountBeforeModes, "mode-injected synchronous and asynchronous submissions must not persist or dispatch replay runs");
    historicalReplayModeReport = {
      lifecycleModeStatuses: lifecycleModeResults.map((response) => response.status),
      submissionModeResults: replaySubmissionModeResults,
      persistedRunCountBeforeModeInjection: replayRunCountBeforeModes,
      persistedRunCountAfterModeInjection: replayRunCountAfterModes
    };
    console.info(`[V1.4 Historical Replay Worker mode-injection HTTP+PG] ${JSON.stringify({ status: "PASS", lifecycleModeAttempts: lifecycleModeResults.length, submissionModeAttempts: replaySubmissionModeResults.length, persistedRunCountBeforeModeInjection: replayRunCountBeforeModes, persistedRunCountAfterModeInjection: replayRunCountAfterModes, existingRunStateUnchanged: unchangedAfterBodyInjection.rows[0].status === "COMPLETED" })}`);
    const lifecycleMissing = await Promise.all(["pause", "resume", "cancel"].map((action) => request(`${missingPath}/${action}`, { ...platform, method: "POST" })));
    assert.deepEqual(lifecycleMissing.map((response) => response.status), [404, 404, 404], "authorized lifecycle operations on the isolated absent run must not create state");
    const recoveryMissing = await request(`${missingPath}/recover-unknown`, { ...platform, method: "POST" });
    assert.equal(recoveryMissing.status, 422, "authorized recovery of a run without original-order evidence must fail closed");
    await replayDb.query("DELETE FROM replay_worker_runs WHERE test_run_id=$1 AND namespace=$2", [runId, `auth-smoke-${runId}`]);
    } finally {
      await replayDb.end().catch(() => undefined);
    }
  });

  await runService("quant-research-service", async (request) => {
    const testDb = new Client({ connectionString: databaseUrl.toString() });
    await testDb.connect();
    try {
    const wrongToken = await request("/v1/qlib/probe", { caller: "platform-api-service", bearer: tokens.replay });
    const replayOutOfScope = await request("/v1/qlib/probe", { caller: "historical-replay-worker", bearer: tokens.replay });
    const allowedPlatformProbe = await request("/v1/qlib/probe", { caller: "platform-api-service", bearer: tokens.platform });
    const tokenDerivedPlatformProbe = await request("/v1/qlib/probe", { bearer: tokens.platform });
    const forgedPlatformClaim = await request("/v1/qlib/probe", { caller: "historical-replay-worker", bearer: tokens.platform });
    const allowedPlatformInvalidCandidate = await request("/v1/research/candidates", { method: "POST", caller: "platform-api-service", bearer: tokens.platform, body: "{}" });
    assert.equal(wrongToken.status, 403);
    assert.equal(replayOutOfScope.status, 403);
    assert.equal(allowedPlatformProbe.status, 200);
    assert.equal(tokenDerivedPlatformProbe.status, 200, "valid Bearer identity must work without the legacy service header");
    assert.equal(forgedPlatformClaim.status, 403, "an optional service header must agree with the Bearer identity");
    assert.equal(allowedPlatformInvalidCandidate.status, 422, "authorized request must reach input validation before any insert");
    const backtestRows = async () => testDb.query(`SELECT
      (SELECT count(*)::text FROM research_backtest_runs) AS runs,
      (SELECT count(*)::text FROM research_backtest_manifests) AS manifests`);
    const beforeModeInjection = await backtestRows();
    const injectedModes = [
      { environmentMode: "PAPER", brokerMode: "FAKE" },
      { environmentMode: "PAPER", brokerMode: "REAL" },
      { environmentMode: "BACKTEST", brokerMode: "FAKE" },
      { environmentMode: "BACKTEST", brokerMode: "REAL" },
      { environmentMode: "LIVE", brokerMode: "FAKE" },
      { environmentMode: "LIVE", brokerMode: "REAL" },
    ];
    const modeResults = [];
    for (const modes of injectedModes) {
      const response = await request("/v1/research/backtests/daily-fixture", {
        method: "POST", caller: "platform-api-service", bearer: tokens.platform,
        body: JSON.stringify({
          scenarioId: "normal", seed: 20260907, testRunId: randomUUID(),
          policy: { initialCashCents: 100_000, targetQuantity: 100, participationRateBasisPoints: 10_000, slippageBasisPoints: 0, fixedFeeCents: 100 },
          ...modes,
        }),
      });
      const payload = await response.json();
      assert.equal(response.status, 422, `Quant V1.4 route must reject injected ${modes.environmentMode}/${modes.brokerMode}`);
      assert.equal(payload.reason, "V1.4 request contains missing or unknown fields", "mode fields must be rejected by the Quant route contract");
      modeResults.push({ ...modes, status: response.status });
    }
    const afterModeInjection = await backtestRows();
    assert.deepEqual(afterModeInjection.rows, beforeModeInjection.rows, "rejected Quant V1.4 mode injection must not persist a BacktestRun or Manifest");
    console.info(`[V1.4 Quant backtest mode-injection HTTP+PG] ${JSON.stringify({ status: "PASS", attempts: modeResults, backtestRunsBefore: beforeModeInjection.rows[0].runs, backtestRunsAfter: afterModeInjection.rows[0].runs, manifestsBefore: beforeModeInjection.rows[0].manifests, manifestsAfter: afterModeInjection.rows[0].manifests, persistedSideEffects: 0 })}`);
    } finally {
      await testDb.end().catch(() => undefined);
    }
  });

  console.log(JSON.stringify({ status: "PASS", database: "temporary isolated database", services: ["decision-governance-service", "historical-replay-worker", "quant-research-service"], historicalReplayRoutes: { unauthorizedRouteProbes: 14, unauthorizedServiceIdentities: ["runner-host", "platform-api-service with replay-worker Bearer"], malformedAuthorizedSubmissions: 3, ...historicalReplayModeReport, stateUnchangedAfterBodyInjection: true, missingRunLifecycleActions: 3, missingRunRecovery: 1 }, governanceAuthorization: { commandBinding: "PASS", concurrentSingleUse: "PASS", namespaceRenewalRotatesId: "PASS", expiredAuthorization: "REJECTED", environmentMode: "BACKTEST", brokerMode: "FAKE" } }));
} finally {
  if (created) {
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    const remaining = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName]);
    assert.equal(remaining.rowCount, 0, "random service-auth smoke database must be dropped");
  }
  await admin.end();
}
