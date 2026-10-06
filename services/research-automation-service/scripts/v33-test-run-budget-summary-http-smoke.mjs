import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { PgBudgetLedger } from "../dist/adapters/pg-budget-ledger.js";

const databaseUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (!databaseUrl || decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) !== "research_automation_test") throw new Error("V3.3 TestRun budget HTTP smoke requires the isolated research_automation_test database");
const token = randomBytes(48).toString("base64url");
const runnerToken = randomBytes(48).toString("base64url");
const testRunId = randomUUID();
const roundBudgetTestRunId = randomUUID();
const capReductionTestRunId = randomUUID();
const experimentIds = [];
const capReductionExperimentIds = [];
const idempotencyKeys = [randomUUID(), randomUUID()].map((id) => `v33-summary-${id}`);
const servicePort = await new Promise((resolvePort, reject) => {
  const server = createNetServer(); server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
});
const app = spawn(process.execPath, [resolve("dist/bootstrap/main.js")], { cwd: process.cwd(), env: {
  PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(servicePort),
  STOCKQUANT_DATABASE_URL: databaseUrl, STOCKQUANT_RESEARCH_ARTIFACT_ROOT: "/tmp/stockquant-v33-budget-summary-artifacts",
  STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true", STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
}, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
for (const stream of [app.stdout, app.stderr]) stream.on("data", (chunk) => { if (output.length < 6000) output += chunk.toString().slice(0, 6000 - output.length); });
const base = `http://127.0.0.1:${servicePort}`;
const pool = new Pool({ connectionString: databaseUrl });
const ledger = new PgBudgetLedger(pool, 3000, 1000, 80);
async function request(path, { bearer = token, caller = "platform-api-service", body, method = "GET" } = {}) {
  return fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${bearer}`, ...(caller ? { "x-stockquant-service-id": caller } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
}
async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (app.exitCode !== null) throw new Error(`Research Automation exited before ready: ${output}`);
    try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* booting */ }
    await delay(100);
  }
  throw new Error(`Research Automation did not become ready: ${output}`);
}
try {
  await waitReady();
  const capCommand = { schemaVersion: "v3.3-test-run-budget-limit-command-v1", testRunId: roundBudgetTestRunId, budgetCents: 80 };
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { bearer: "", method: "POST", body: capCommand })).status, 401);
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { bearer: runnerToken, caller: "runner-host", method: "POST", body: capCommand })).status, 403);
  const capResponse = await request("/v1/runner/budgets/test-run/limit", { method: "POST", body: capCommand });
  assert.equal(capResponse.status, 200, JSON.stringify(await capResponse.clone().json()));
  assert.deepEqual(await capResponse.json(), { schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId: roundBudgetTestRunId, budgetCents: 80, status: "CONFIGURED" });
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { method: "POST", body: capCommand })).status, 200, "same cap replay is idempotent");
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { method: "POST", body: { ...capCommand, budgetCents: 81 } })).status, 409, "a different cap conflicts");
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { method: "POST", body: { ...capCommand, extra: true } })).status, 422, "unknown properties are rejected");
  for (const [index] of [0, 1].entries()) {
    const created = await request("/v1/experiments", { method: "POST", body: {
      fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: index + 1, budgetCurrency: "USD", budgetCents: index === 0 ? 80 : 120,
      environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: idempotencyKeys[index], testRunId,
    } });
    assert.equal(created.status, 202);
    const body = await created.json();
    assert.equal(body.testRunId, testRunId);
    experimentIds.push(body.experimentId);
  }
  const roundBudgetExperimentResponse = await request("/v1/experiments", { method: "POST", body: {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 2, budgetCurrency: "USD", budgetCents: 80,
    environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v33-round-budget-${randomUUID()}`, testRunId: roundBudgetTestRunId,
  } });
  assert.equal(roundBudgetExperimentResponse.status, 202);
  const roundBudgetExperiment = await roundBudgetExperimentResponse.json();
  const roundBudgetExperimentId = roundBudgetExperiment.experimentId;
  const roundOverCapResponse = await request("/v1/experiments", { method: "POST", body: {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 1,
    environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v33-round-over-cap-${randomUUID()}`, testRunId: roundBudgetTestRunId,
  } });
  assert.equal(roundOverCapResponse.status, 422, "the immutable 80-cent per-TestRun cap rejects the 81st committed cent");
  const roundOverCapBody = await roundOverCapResponse.json();
  assert.match(roundOverCapBody.error, /TestRun budget exhausted/u);
  assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM research_experiments WHERE test_run_id=$1", [roundBudgetTestRunId])).rows[0].count, 1, "over-cap rejection creates no Experiment");
  assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM research_budget_allocations WHERE stage_id='V3.1' AND test_run_id=$1", [roundBudgetTestRunId])).rows[0].count, 1, "over-cap rejection creates no budget allocation");
  const capReductionExperimentResponse = await request("/v1/experiments", { method: "POST", body: {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 40,
    environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v33-cap-reduction-${randomUUID()}`, testRunId: capReductionTestRunId,
  } });
  assert.equal(capReductionExperimentResponse.status, 202);
  const capReductionExperiment = await capReductionExperimentResponse.json();
  capReductionExperimentIds.push(capReductionExperiment.experimentId);
  assert.equal((await request("/v1/runner/budgets/test-run/limit", { method: "POST", body: { ...capCommand, testRunId: capReductionTestRunId, budgetCents: 30 } })).status, 409, "a proposed cap below an existing reservation is rejected");
  assert.equal((await pool.query("SELECT budget_cents FROM research_budget_test_run_limits WHERE stage_id='V3.1' AND test_run_id=$1", [capReductionTestRunId])).rowCount, 0, "rejected cap reduction creates no cap row");
  assert.equal((await ledger.get(capReductionExperiment.experimentId)).reservedCents, 40, "rejected cap reduction leaves the existing reservation untouched");
  const overRunCap = await request("/v1/experiments", { method: "POST", body: {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 801,
    environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `over-run-cap-${testRunId}`, testRunId,
  } });
  assert.equal(overRunCap.status, 422, "the cumulative TestRun reservation cap must reject before experiment persistence");
  const rows = await pool.query("SELECT experiment_id::text FROM research_experiments WHERE test_run_id=$1", [testRunId]);
  const ids = experimentIds;
  assert.equal(ids.length, 2);
  assert.deepEqual(new Set(rows.rows.map((row) => row.experiment_id)), new Set(ids));
  for (const id of ids) {
    const allocation = await ledger.get(id);
    assert.ok(allocation);
  }
  await ledger.reserveModelCall(ids[0], "attempt-one", "a".repeat(64), 60);
  await ledger.dispatchModelCall(ids[0], "attempt-one");
  await ledger.settleModelCall(ids[0], "attempt-one", 40);
  await ledger.reserveModelCall(ids[0], "retry-one", "b".repeat(64), 15);
  await ledger.dispatchModelCall(ids[0], "retry-one");
  await ledger.markModelCallUnknown(ids[0], "retry-one");

  assert.equal((await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}`, { bearer: "" })).status, 401);
  assert.equal((await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}`, { bearer: runnerToken, caller: "runner-host" })).status, 403);
  assert.equal((await request("/v1/runner/budgets/test-run?testRunId=bad")).status, 422);
  const firstResponse = await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}&offset=0&limit=1`);
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();
  assert.equal(first.schemaVersion, "v3.3-test-run-budget-summary-v1");
  assert.equal(first.rows.length, 1);
  assert.equal(first.hasMore, true);
  assert.equal(first.afterCursor, null);
  assert.equal(typeof first.nextAfterCursor, "string");
  assert.deepEqual(first.totals, { experiments: 2, requestedCents: 200, reservedCents: 200, settledCents: 40, unknownReservedCents: 15, modelCallCount: 2 });
  const secondResponse = await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}&offset=1&limit=1`);
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();
  assert.equal(second.rows.length, 1);
  assert.equal(second.hasMore, false);
  const cursorResponse = await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}&limit=1&afterCursor=${encodeURIComponent(first.nextAfterCursor)}`);
  assert.equal(cursorResponse.status, 200);
  const cursorSecond = await cursorResponse.json();
  assert.equal(cursorSecond.afterCursor, first.nextAfterCursor);
  assert.equal(cursorSecond.rows[0].experimentId, second.rows[0].experimentId);
  assert.equal(cursorSecond.totals, null, "cursor pages must avoid reaggregating the complete TestRun");
  assert.equal((await request(`/v1/runner/budgets/test-run?testRunId=${testRunId}&offset=1&limit=1&afterCursor=${encodeURIComponent(first.nextAfterCursor)}`)).status, 422);
  const all = [...first.rows, ...second.rows];
  assert.equal(new Set(all.map((row) => row.experimentId)).size, 2, "each Experiment appears once even when its model-call attempts include retries");
  const firstExperiment = all.find((row) => row.experimentId === ids[0]);
  assert.deepEqual({ rounds: firstExperiment.rounds, requestedCents: firstExperiment.requestedCents, settledCents: firstExperiment.settledCents, unknownReservedCents: firstExperiment.unknownReservedCents, modelCallCount: firstExperiment.modelCallCount }, { rounds: 1, requestedCents: 80, settledCents: 40, unknownReservedCents: 15, modelCallCount: 2 });
  assert.deepEqual(firstExperiment.roundBudget, [{ roundIndex: 1, allocatedCents: 80, usedCents: 55, unknownReservedCents: 15 }]);
  assert.equal(first.stageBudgetControl, "TEST_RUN_AND_ROUND_CAP_ENFORCED");
  const roundOne = await request("/v1/model-gateway/fixture-call", { method: "POST", body: { experimentId: roundBudgetExperimentId, modelRunId: "v33-round-1", requestedCents: 40, roundIndex: 1, scenario: "COMPLETED" } });
  const roundTwo = await request("/v1/model-gateway/fixture-call", { method: "POST", body: { experimentId: roundBudgetExperimentId, modelRunId: "v33-round-2", requestedCents: 40, roundIndex: 2, scenario: "COMPLETED" } });
  assert.equal(roundOne.status, 200, JSON.stringify(await roundOne.clone().json()));
  assert.equal(roundTwo.status, 200, JSON.stringify(await roundTwo.clone().json()));
  const roundOneEvidence = await roundOne.json();
  const roundTwoEvidence = await roundTwo.json();
  assert.deepEqual([roundOneEvidence.status, roundOneEvidence.actualCostCents, roundOneEvidence.modelCalls], ["COMPLETED", 23, "NO_EXTERNAL_CALL"]);
  assert.deepEqual([roundTwoEvidence.status, roundTwoEvidence.actualCostCents, roundTwoEvidence.modelCalls], ["COMPLETED", 23, "NO_EXTERNAL_CALL"]);
  const settledRounds = await request(`/v1/experiments/${roundBudgetExperimentId}/budget/settle`, { method: "POST", body: { spentCents: 46 } });
  assert.equal(settledRounds.status, 200, JSON.stringify(await settledRounds.clone().json()));
  const roundSummaryResponse = await request(`/v1/runner/budgets/test-run?testRunId=${roundBudgetTestRunId}`);
  assert.equal(roundSummaryResponse.status, 200);
  const roundSummary = await roundSummaryResponse.json();
  assert.equal(roundSummary.rows.length, 1);
  assert.deepEqual(roundSummary.rows[0].roundBudget, [
    { roundIndex: 1, allocatedCents: 40, usedCents: 23, unknownReservedCents: 0 },
    { roundIndex: 2, allocatedCents: 40, usedCents: 23, unknownReservedCents: 0 },
  ]);
  assert.deepEqual({ status: roundSummary.rows[0].status, settledCents: roundSummary.rows[0].settledCents, unknownReservedCents: roundSummary.rows[0].unknownReservedCents }, { status: "SETTLED", settledCents: 46, unknownReservedCents: 0 });
  console.log(JSON.stringify({ status: "PASS", scope: "owner-scoped TestRun summary with cumulative TestRun and independent round caps, immutable per-TestRun caps, UNKNOWN retention, offset/keyset pagination, and exact two-round Fixture settlement", testRunId, experimentCount: first.totals.experiments, uniqueExperimentsAcrossPages: new Set(all.map((row) => row.experimentId)).size, totals: first.totals, firstExperimentRoundBudget: firstExperiment.roundBudget, unknownRetryRetained: firstExperiment.unknownReservedCents === 15, overRunCapRejected: overRunCap.status === 422, perTestRunCap: { configuredCents: 80, sameValueReplay: "IDEMPOTENT", differentValue: 409, overCapExperiment: roundOverCapResponse.status, noExperimentOrAllocation: true, capReductionBelowExistingHold: 409, oldReservationUnchanged: true }, cursorPagination: { nextCursorIssued: true, cursorMatchesOffsetPage: true, cursorAndNonzeroOffsetRejected: true }, twoRoundFixtureSettlement: { testRunId: roundBudgetTestRunId, experimentId: roundBudgetExperimentId, roundIndices: [1, 2], allocatedCentsPerRound: [40, 40], settledCentsPerRound: [roundOneEvidence.actualCostCents, roundTwoEvidence.actualCostCents], experimentSettlement: settledRounds.status, summary: roundSummary.rows[0].roundBudget }, auth: { anonymous: 401, runnerHost: 403, invalidQuery: 422 }, externalModelCalls: 0, paperCalls: 0, stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }));
} finally {
  const cleanupExperimentIds = [...experimentIds, ...capReductionExperimentIds, ...(typeof roundBudgetExperimentId === "string" ? [roundBudgetExperimentId] : [])];
  await pool.query("DELETE FROM research_budget_test_run_limits WHERE stage_id='V3.1' AND test_run_id=ANY($1::uuid[])", [[roundBudgetTestRunId, capReductionTestRunId]]).catch(() => {});
  await pool.query("DELETE FROM research_model_call_budgets WHERE experiment_id=ANY($1::text[])", [cleanupExperimentIds]).catch(() => {});
  await pool.query("DELETE FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=ANY($1::text[])", [cleanupExperimentIds]).catch(() => {});
  await pool.query("DELETE FROM research_experiments WHERE experiment_id=ANY($1::uuid[])", [cleanupExperimentIds]).catch(() => {});
  if (app.exitCode === null) { app.kill("SIGTERM"); await Promise.race([new Promise((resolveExit) => app.once("exit", resolveExit)), delay(5000)]); if (app.exitCode === null) app.kill("SIGKILL"); }
  await pool.end();
}
