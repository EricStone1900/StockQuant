import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { isIsolatedPostgresTarget } from "./isolated-postgres-target.mjs";

const tradeDb = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const portfolioDb = process.env.PORTFOLIO_RISK_TEST_DATABASE_URL ?? "postgresql://portfolio_risk@127.0.0.1:5433/portfolio_risk_test";
const postgresContainer = process.env.STOCKQUANT_P57_ISOLATED_PG_CONTAINER ?? process.env.STOCKQUANT_ISOLATED_PG_CONTAINER;
const tradeUrl = new URL(tradeDb);
const portfolioUrl = new URL(portfolioDb);
const standardPair = tradeUrl.username === "trade_execution_test" && tradeUrl.pathname === "/trade_execution_test"
  && portfolioUrl.username === "portfolio_risk" && portfolioUrl.pathname === "/portfolio_risk_test";
const ephemeralTrade = tradeUrl.username === "postgres" && /^\/sq_v24_paper_trade_[a-f0-9]{32}$/u.test(tradeUrl.pathname);
const ephemeralPortfolio = portfolioUrl.username === "postgres" && /^\/sq_v24_paper_portfolio_[a-f0-9]{32}$/u.test(portfolioUrl.pathname);
const ephemeralPair = ephemeralTrade && ephemeralPortfolio && tradeUrl.pathname.slice("/sq_v24_paper_trade_".length) === portfolioUrl.pathname.slice("/sq_v24_paper_portfolio_".length);
const isolatedTradeTarget = isIsolatedPostgresTarget(tradeDb, postgresContainer, undefined, { username: tradeUrl.username, database: tradeUrl.pathname.slice(1) });
const isolatedPortfolioTarget = isIsolatedPostgresTarget(portfolioDb, postgresContainer, undefined, { username: portfolioUrl.username, database: portfolioUrl.pathname.slice(1) });
if ((!standardPair && !ephemeralPair) || !isolatedTradeTarget || !isolatedPortfolioTarget) throw new Error("P5.7 HTTP smoke requires a recognized test database pair in the same bounded disposable PostgreSQL container; shared Compose databases are forbidden");
const tradePool = new Pool({ connectionString: tradeDb });
const portfolioPool = new Pool({ connectionString: portfolioDb });
const { PostgresFakeBrokerRepository } = await import("../dist/adapters/postgres-fake-broker-repository.js");
const token = () => `p57-${randomUUID()}-${randomUUID()}`;
const tokens = { platform: token(), replay: token(), trade: token(), portfolioPlatform: token(), portfolioReplay: token(), governance: token() };
const baseEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test" };
const ownerId = `p57-owner-${randomUUID()}`;
const namespace = `p57-outbox-http/${randomUUID()}`;
const testRunId = randomUUID();
const clientOrderId = `p57-${randomUUID()}`;
const processes = [];
let proxy;
let portfolioServer;
let governance;
let tradeServer;
let accountId;
let reservationId;
let tradeMigrated = false;
let portfolioMigrated = false;
let lostResponseInjected = false;

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
  });
}

function launch(name, env, path) {
  const child = spawn(process.execPath, [path], { cwd: resolve(process.cwd(), "../../" + name), env, stdio: ["ignore", "pipe", "pipe"] });
  child.log = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (child.log.length < 10000) child.log += chunk.toString().slice(0, 10000 - child.log.length); });
  processes.push(child);
  return child;
}

async function waitReady(child, url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`service exited before ready: ${child.log}`);
    try { if ((await fetch(`${url}/ready`)).ok) return; } catch { /* wait for startup */ }
    await delay(100);
  }
  throw new Error(`service did not become ready: ${child.log}`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveClose) => child.once("close", resolveClose));
}

function headers(caller, bearer, json = true) {
  return { ...(json ? { "content-type": "application/json" } : {}), "x-stockquant-service-id": caller, authorization: `Bearer ${bearer}` };
}

try {
  await Promise.all([tradePool.query("SELECT 1"), portfolioPool.query("SELECT 1")]);
  const portfolioPort = await freePort();
  const portfolioUrl = `http://127.0.0.1:${portfolioPort}`;
  const portfolioEnv = {
    ...baseEnv,
    STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(portfolioPort), STOCKQUANT_DATABASE_URL: portfolioDb,
    STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.portfolioPlatform,
    STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade,
    STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.portfolioReplay,
    STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS: token()
  };
  portfolioServer = launch("services/portfolio-risk-service", portfolioEnv, resolve("../portfolio-risk-service/dist/main.js"));
  await waitReady(portfolioServer, portfolioUrl);
  portfolioMigrated = true;

  governance = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      const valid = request.method === "POST" && request.url === "/internal/v1/authorizations/validate"
        && request.headers["x-stockquant-service-id"] === "trade-execution-service"
        && request.headers.authorization === `Bearer ${tokens.trade}`;
      response.writeHead(valid ? 200 : 403, { "content-type": "application/json" });
      response.end(JSON.stringify({ valid, authorizationRequest: raw.length > 0 }));
    });
  });
  const governancePort = await freePort();
  await new Promise((resolveListen, reject) => { governance.once("error", reject); governance.listen(governancePort, "127.0.0.1", resolveListen); });

  // The first Portfolio POST commits successfully but its response is deliberately
  // dropped. On process restart the durable Outbox must retry the same Fill id.
  const proxyPort = await freePort();
  proxy = createServer(async (request, response) => {
    const bodyChunks = [];
    for await (const chunk of request) bodyChunks.push(chunk);
    const body = Buffer.concat(bodyChunks);
    try {
      const upstream = await fetch(`${portfolioUrl}${request.url}`, { method: request.method, headers: request.headers, body: body.length ? body : undefined });
      const upstreamBody = await upstream.text();
      if (!lostResponseInjected && request.method === "POST" && request.url.endsWith("/fills")) {
        lostResponseInjected = true;
        response.destroy();
        return;
      }
      response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
      response.end(upstreamBody);
    } catch {
      response.destroy();
    }
  });
  await new Promise((resolveListen, reject) => { proxy.once("error", reject); proxy.listen(proxyPort, "127.0.0.1", resolveListen); });

  const tradePort = await freePort();
  const tradeUrl = `http://127.0.0.1:${tradePort}`;
  const tradeEnv = {
    ...baseEnv,
    STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(tradePort), STOCKQUANT_DATABASE_URL: tradeDb,
    STOCKQUANT_PORTFOLIO_API_URL: `http://127.0.0.1:${proxyPort}`, STOCKQUANT_GOVERNANCE_URL: `http://127.0.0.1:${governancePort}`,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay,
    STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade
  };
  tradeServer = launch("services/trade-execution-service", tradeEnv, resolve("dist/main.js"));
  await waitReady(tradeServer, tradeUrl);
  tradeMigrated = true;

  const initialized = await fetch(`${portfolioUrl}/internal/v1/accounts/initialize`, {
    method: "POST", headers: headers("platform-api-service", tokens.portfolioPlatform),
    body: JSON.stringify({ fixtureAccountRef: "p5-7-outbox-http-smoke", ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace, testRunId, idempotencyKey: "p57-init" })
  });
  const initializedText = await initialized.text();
  assert.ok([200, 201].includes(initialized.status), `account initialization failed: ${initialized.status} ${initializedText}`);
  accountId = JSON.parse(initializedText).snapshot.accountId;
  const reserve = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/reservations`, {
    method: "POST", headers: headers("trade-execution-service", tokens.trade),
    body: JSON.stringify({ namespace, testRunId, ownerId, idempotencyKey: "p57-reserve", clientOrderId, side: "BUY", currency: "CNY", cashAmount: "2000.0000", security: null, quantity: null })
  });
  const reserveText = await reserve.text();
  assert.ok([200, 201].includes(reserve.status), `reservation failed: ${reserve.status} ${reserveText}`);
  reservationId = JSON.parse(reserveText).reservation.reservationId;

  const executeCommand = {
    namespace, accountId, clientOrderId, security: "600000.SH", requestedQuantity: 150, side: "BUY", currency: "CNY",
    reservation: { reservationId, ownerId, testRunId, clientOrderId },
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.0000", volume: 1000 }, authorizationId: randomUUID()
  };
  const firstResponse = await fetch(`${tradeUrl}/internal/v1/historical-orders/execute`, { method: "POST", headers: headers("historical-replay-worker", tokens.replay), body: JSON.stringify(executeCommand) });
  assert.equal(firstResponse.status, 422, "the intentionally lost Portfolio response leaves the execution call pending");
  assert.equal(lostResponseInjected, true);
  const pendingBeforeRestart = await tradePool.query(`SELECT o.status, x.event_id, x.status AS outbox_status, x.attempts FROM fake_broker_orders o JOIN fake_broker_outbox x USING (order_id) WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
  assert.deepEqual({ status: pendingBeforeRestart.rows[0].status, outbox_status: pendingBeforeRestart.rows[0].outbox_status, attempts: pendingBeforeRestart.rows[0].attempts }, { status: "LEDGER_PENDING", outbox_status: "PENDING", attempts: 1 });
  const eventId = pendingBeforeRestart.rows[0].event_id;
  // Stop the poller before exercising direct lease fencing so the same event
  // cannot race the test harness for its delivery claim.
  await stop(tradeServer);
  const workerOne = new PostgresFakeBrokerRepository(tradePool);
  const workerTwo = new PostgresFakeBrokerRepository(tradePool);
  const concurrentClaims = await Promise.all([workerOne.claimOutbox(eventId, 30), workerTwo.claimOutbox(eventId, 30)]);
  assert.equal(concurrentClaims.filter(Boolean).length, 1, "two worker instances must not claim one Outbox event concurrently");
  const originalClaim = concurrentClaims.find(Boolean);
  assert.ok(originalClaim);
  await tradePool.query("UPDATE fake_broker_outbox SET lease_until=now()-interval '1 second' WHERE event_id=$1", [eventId]);
  const takeover = await workerTwo.claimOutbox(eventId, 30);
  assert.ok(takeover);
  assert.notEqual(takeover.claim_token, originalClaim.claim_token, "expired claim must be fenced by a new token");
  await assert.rejects(workerOne.markFillDelivered(eventId, originalClaim.claim_token), /claim was lost/u);
  await workerOne.markFillDeliveryFailed(eventId, originalClaim.claim_token, "stale-worker-failure");
  const staleFailureCheck = await tradePool.query("SELECT status,claim_token,attempts FROM fake_broker_outbox WHERE event_id=$1", [eventId]);
  assert.deepEqual(staleFailureCheck.rows[0], { status: "DELIVERING", claim_token: takeover.claim_token, attempts: 1 }, "stale failure must not release the current lease or mutate the order retry count");
  await tradePool.query("UPDATE fake_broker_outbox SET status='PENDING',claim_token=NULL,lease_until=NULL WHERE event_id=$1 AND claim_token=$2", [eventId, takeover.claim_token]);
  // Restart the execution process over the same isolated database. Its retry loop
  // must replay the persisted Outbox event and Portfolio must idempotently accept it.
  tradeServer = launch("services/trade-execution-service", tradeEnv, resolve("dist/main.js"));
  await waitReady(tradeServer, tradeUrl);
  const orderIdRow = await tradePool.query("SELECT order_id, status FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2", [namespace, clientOrderId]);
  assert.equal(orderIdRow.rowCount, 1);
  assert.equal(orderIdRow.rows[0].status, "LEDGER_PENDING", "pending ledger state must survive the execution-service restart");
  const orderId = orderIdRow.rows[0].order_id;
  let outboxStatus;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await fetch(`${tradeUrl}/internal/v1/orders/${orderId}/outbox`, { headers: headers("historical-replay-worker", tokens.replay, false) });
    const value = await response.json();
    if (value.status === "DELIVERED") { outboxStatus = value; break; }
    await delay(250);
  }
  assert.equal(outboxStatus?.status, "DELIVERED", "Outbox must deliver after execution-service restart");
  const recoveredOrder = await tradePool.query("SELECT status FROM fake_broker_orders WHERE order_id=$1", [orderId]);
  assert.equal(recoveredOrder.rows[0].status, "PARTIALLY_FILLED", "successful ledger delivery must restore the confirmed FakeBroker fill status");

  const snapshots = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/snapshot`, { headers: { ...headers("platform-api-service", tokens.portfolioPlatform, false), "x-stockquant-owner-id": ownerId } });
  assert.equal(snapshots.status, 200);
  const snapshot = await snapshots.json();
  assert.equal(snapshot.ledgerEntryCount, 2, "the lost-response retry must not duplicate the Portfolio ledger entry");
  assert.equal(snapshot.cash.amount, "8997.9990");
  assert.equal(snapshot.positionCount, 1);

  const fillRow = await tradePool.query("SELECT external_fill_id,original_fee::text FROM fake_broker_fills WHERE order_id=$1", [orderId]);
  assert.equal(fillRow.rowCount, 1);
  const feeCorrectionPath = `/internal/v1/orders/${orderId}/fills/${fillRow.rows[0].external_fill_id}/fee-corrections`;
  const feeCorrection = { revision: 1, previousFee: fillRow.rows[0].original_fee, correctedFee: (Number(fillRow.rows[0].original_fee) + 1).toFixed(4), effectiveAt: "2026-09-25T01:45:00.000Z", evidenceRef: `smoke-fee-correction:${testRunId}` };
  let feeCorrectionResponse;
  try {
    feeCorrectionResponse = await fetch(`${tradeUrl}${feeCorrectionPath}`, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(feeCorrection) });
  } catch (error) {
    throw new Error(`fee correction request connection failed; Trade exited=${tradeServer.exitCode}; Trade log=${tradeServer.log}; Portfolio log=${portfolioServer.log}`, { cause: error });
  }
  const feeCorrectionText = await feeCorrectionResponse.text();
  assert.equal(feeCorrectionResponse.status, 202, feeCorrectionText);
  const feeCorrectionAccepted = JSON.parse(feeCorrectionText);
  const duplicateFeeCorrection = await fetch(`${tradeUrl}${feeCorrectionPath}`, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(feeCorrection) });
  assert.equal(duplicateFeeCorrection.status, 200, "exact fee correction retry must be idempotent");
  assert.equal((await duplicateFeeCorrection.json()).eventId, feeCorrectionAccepted.eventId);
  const deniedFeeCorrection = await fetch(`${tradeUrl}${feeCorrectionPath}`, { method: "POST", headers: headers("historical-replay-worker", tokens.replay), body: JSON.stringify({ ...feeCorrection, revision: 2, previousFee: feeCorrection.correctedFee, correctedFee: feeCorrection.previousFee }) });
  assert.equal(deniedFeeCorrection.status, 403, "historical replay cannot author FakeBroker fee corrections");
  let feeCorrectionDelivered = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await tradePool.query("SELECT status FROM fake_broker_outbox WHERE event_id=$1", [feeCorrectionAccepted.eventId]);
    if (state.rows[0]?.status === "DELIVERED") { feeCorrectionDelivered = true; break; }
    await delay(250);
  }
  assert.equal(feeCorrectionDelivered, true, "durable Trade Outbox must deliver the fee correction to Portfolio");
  const correctedSnapshotResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/snapshot`, { headers: { ...headers("platform-api-service", tokens.portfolioPlatform, false), "x-stockquant-owner-id": ownerId } });
  assert.equal(correctedSnapshotResponse.status, 200);
  const correctedSnapshot = await correctedSnapshotResponse.json();
  assert.equal(correctedSnapshot.cash.amount, "8996.9990");
  assert.equal(correctedSnapshot.ledgerEntryCount, 3, "Portfolio must persist one compensating fee ledger entry");
  const correctionFacts = await portfolioPool.query("SELECT f.fee::text,f.original_fee::text,f.fee_revision,(SELECT count(*)::int FROM fill_fee_corrections c WHERE c.external_fill_id=f.external_fill_id) AS corrections FROM recorded_fills f WHERE f.external_fill_id=$1", [fillRow.rows[0].external_fill_id]);
  assert.deepEqual(correctionFacts.rows[0], { fee: feeCorrection.correctedFee, original_fee: feeCorrection.previousFee, fee_revision: 1, corrections: 1 });

  const resolveUnknown = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/reservations/${reservationId}/resolve`, {
    method: "POST", headers: headers("trade-execution-service", tokens.trade),
    body: JSON.stringify({ namespace, testRunId, ownerId, outcome: "UNKNOWN", evidenceRef: "smoke:partial-order-still-unknown-after-restart" })
  });
  const unknownBody = await resolveUnknown.text();
  assert.equal(resolveUnknown.status, 200, unknownBody);
  assert.equal(JSON.parse(unknownBody).status, "UNKNOWN");
  const heldRemainder = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/reservations`, {
    method: "POST", headers: headers("trade-execution-service", tokens.trade),
    body: JSON.stringify({ namespace, testRunId, ownerId, idempotencyKey: "p57-over-reserved", clientOrderId: `p57-followup-${randomUUID()}`, side: "BUY", currency: "CNY", cashAmount: "8100.0000", security: null, quantity: null })
  });
  assert.equal(heldRemainder.status, 409, "UNKNOWN reservation remainder must remain unavailable");

  const raceClientOrderId = `p57-cancel-fill-race-${randomUUID()}`;
  const raceReservationResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/reservations`, {
    method: "POST", headers: headers("trade-execution-service", tokens.trade),
    body: JSON.stringify({ namespace, testRunId, ownerId, idempotencyKey: "p57-fill-cancel-race-reserve", clientOrderId: raceClientOrderId, side: "BUY", currency: "CNY", cashAmount: "1500.0000", security: null, quantity: null })
  });
  const raceReservationText = await raceReservationResponse.text();
  assert.ok([200, 201].includes(raceReservationResponse.status), raceReservationText);
  const raceReservationId = JSON.parse(raceReservationText).reservation.reservationId;
  const raceOrder = await new PostgresFakeBrokerRepository(tradePool).execute({
    namespace, accountId, clientOrderId: raceClientOrderId, security: "600000.SH", side: "BUY", currency: "CNY", requestedQuantity: 100,
    reservation: { reservationId: raceReservationId, ownerId, testRunId, clientOrderId: raceClientOrderId },
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 500 }
  });
  assert.equal(raceOrder.result.status, "PARTIALLY_FILLED");
  const raceOrderId = raceOrder.result.orderId;
  let initialRaceFillDelivered = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await tradePool.query("SELECT status FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [raceOrderId]);
    if (state.rows[0]?.status === "DELIVERED") { initialRaceFillDelivered = true; break; }
    await delay(250);
  }
  assert.equal(initialRaceFillDelivered, true);
  const cancelRequested = await fetch(`${tradeUrl}/internal/v1/orders/${raceOrderId}/cancel`, { method: "POST", headers: headers("platform-api-service", tokens.platform) });
  assert.equal(cancelRequested.status, 202);
  const cancelAccepted = await fetch(`${tradeUrl}/internal/v1/orders/${raceOrderId}/cancel-result`, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify({ outcome: "ACCEPTED", reason: "SIMULATED_FILL_DURING_CANCEL_THEN_ACCEPT", sequence: 2 }) });
  const bufferedCancelText = await cancelAccepted.text();
  assert.equal(cancelAccepted.status, 202, bufferedCancelText);
  const bufferedCancel = JSON.parse(bufferedCancelText);
  assert.equal(bufferedCancel.buffered, true);
  assert.equal(bufferedCancel.status, "CANCEL_REQUESTED", "HTTP reports the authoritative cancellation as buffered while sequence 1 is missing");
  assert.equal((await tradePool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [raceOrderId])).rows[0].count, 0, "a missing lower sequence cannot emit reservation resolution");
  await stop(tradeServer);
  tradeServer = launch("services/trade-execution-service", tradeEnv, resolve("dist/main.js"));
  await waitReady(tradeServer, tradeUrl);
  const simulatedFill = { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 75, price: "10.2000", fee: "0.0100", effectiveAt: "2026-09-25T01:32:00.000Z", evidenceRef: `fixed-fault:${testRunId}:fill-during-cancel` };
  const simulatedFillPath = `${tradeUrl}/internal/v1/orders/${raceOrderId}/simulated-fill-reports`;
  const simulatedFillResponse = await fetch(simulatedFillPath, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(simulatedFill) });
  const simulatedFillText = await simulatedFillResponse.text();
  assert.equal(simulatedFillResponse.status, 202, simulatedFillText);
  const simulatedFillResult = JSON.parse(simulatedFillText);
  assert.equal(simulatedFillResult.incrementalQuantity, 25);
  assert.equal(simulatedFillResult.buffered, false);
  assert.equal(simulatedFillResult.lastAppliedSequence, 2);
  const replaySimulatedFill = await fetch(simulatedFillPath, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(simulatedFill) });
  assert.equal(replaySimulatedFill.status, 200, "same simulated broker sequence replays idempotently");
  const forbiddenFillReport = await fetch(simulatedFillPath, { method: "POST", headers: headers("historical-replay-worker", tokens.replay), body: JSON.stringify({ ...simulatedFill, sequence: 2, externalFillId: randomUUID(), cumulativeQuantity: 80 }) });
  assert.equal(forbiddenFillReport.status, 403);
  const cancelReplayText = await (await fetch(`${tradeUrl}/internal/v1/orders/${raceOrderId}/cancel-result`, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify({ outcome: "ACCEPTED", reason: "SIMULATED_FILL_DURING_CANCEL_THEN_ACCEPT", sequence: 2 }) })).text();
  const cancelReplay = JSON.parse(cancelReplayText);
  assert.equal(cancelReplay.replayed, true, "identical cancellation replay returns the existing authoritative fact");
  let cancelledFillOutboxesDelivered = false;
  let cancelResolutionDelivered = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const fillStates = await tradePool.query("SELECT bool_and(status='DELIVERED') AS delivered FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [raceOrderId]);
    const resolutionState = await tradePool.query("SELECT status FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [raceOrderId]);
    cancelledFillOutboxesDelivered = fillStates.rows[0]?.delivered === true;
    cancelResolutionDelivered = resolutionState.rows[0]?.status === "DELIVERED";
    if (cancelledFillOutboxesDelivered && cancelResolutionDelivered) break;
    await delay(250);
  }
  assert.equal(cancelledFillOutboxesDelivered, true);
  assert.equal(cancelResolutionDelivered, true, "reservation release follows both the initial and in-cancel incremental Fill postings");
  const raceFillIds = await tradePool.query("SELECT external_fill_id FROM fake_broker_fills WHERE order_id=$1", [raceOrderId]);
  const raceLedger = await portfolioPool.query("SELECT count(*)::int AS fill_count,sum(quantity)::text AS total_quantity FROM recorded_fills WHERE account_id=$1 AND external_fill_id=ANY($2::text[])", [accountId, raceFillIds.rows.map((row) => row.external_fill_id)]);
  assert.deepEqual(raceLedger.rows[0], { fill_count: 2, total_quantity: "75" });
  const raceFacts = await tradePool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS fill_count,
    (SELECT sum(f.quantity)::text FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS total_quantity,
    (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST' AND x.status='DELIVERED') AS delivered_fill_events,
    (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='RESERVATION_RESOLVE' AND x.status='DELIVERED') AS delivered_resolutions
    FROM fake_broker_orders o WHERE o.order_id=$1`, [raceOrderId]);
  assert.deepEqual(raceFacts.rows[0], { status: "CANCELLED", fill_count: 2, total_quantity: "75", delivered_fill_events: 2, delivered_resolutions: 1 });
  const raceBrokerFills = await tradePool.query("SELECT quantity::text,price::text,fee::text FROM fake_broker_fills WHERE order_id=$1 ORDER BY broker_sequence NULLS FIRST", [raceOrderId]);
  assert.deepEqual(raceBrokerFills.rows, [
    { quantity: "50", price: "10.2200", fee: "0.5110" },
    { quantity: "25", price: "10.2000", fee: "0.0100" }
  ], "the first bar fill applies 10bp buy slippage and the later cumulative report adds only its 25-share delta");
  const raceSnapshotResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${accountId}/snapshot`, { headers: { ...headers("platform-api-service", tokens.portfolioPlatform, false), "x-stockquant-owner-id": ownerId } });
  assert.equal(raceSnapshotResponse.status, 200);
  const raceSnapshot = await raceSnapshotResponse.json();
  assert.equal(raceSnapshot.cash.amount, "8230.4780", "Portfolio cash reflects the 50-share slipped fill and 25-share authoritative increment exactly once");
  assert.equal(raceSnapshot.ledgerEntryCount, 5);
  const raceReservationLedger = await portfolioPool.query("SELECT status,captured_cash_amount::text FROM resource_reservations WHERE reservation_id=$1", [raceReservationId]);
  assert.deepEqual(raceReservationLedger.rows[0], { status: "RELEASED", captured_cash_amount: "766.5210" }, "cancel result captures both accepted fills then releases only the unfilled reservation remainder");

  const externalOrder = { namespace, externalOrderId: `external-${randomUUID()}`, clientOrderId: `external-client-${randomUUID()}`, security: "600000.SH", requestedQuantity: 100, status: "UNKNOWN", evidenceRef: `fixture:${testRunId}:independent-external-order`, observedAt: "2026-09-25T01:40:00.000Z" };
  const externalPath = `${tradeUrl}/internal/v1/fake-broker/external-orders`;
  const externalCreated = await fetch(externalPath, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(externalOrder) });
  assert.equal(externalCreated.status, 201);
  const externalReplay = await fetch(externalPath, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify(externalOrder) });
  assert.equal(externalReplay.status, 200);
  const externalConflict = await fetch(externalPath, { method: "POST", headers: headers("platform-api-service", tokens.platform), body: JSON.stringify({ ...externalOrder, status: "CANCELLED" }) });
  assert.equal(externalConflict.status, 409);
  const forbiddenExternalWrite = await fetch(externalPath, { method: "POST", headers: headers("historical-replay-worker", tokens.replay), body: JSON.stringify({ ...externalOrder, externalOrderId: `denied-${randomUUID()}` }) });
  assert.equal(forbiddenExternalWrite.status, 403);
  const externalSummaryResponse = await fetch(`${tradeUrl}/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, { headers: headers("platform-api-service", tokens.platform, false) });
  assert.equal(externalSummaryResponse.status, 200);
  const externalSummary = await externalSummaryResponse.json();
  assert.equal(externalSummary.externalOnlyOrderCount, 1);
  assert.deepEqual(externalSummary.discrepancies[0], { kind: "EXTERNAL_ORDER_MISSING_LOCALLY", externalOrderId: externalOrder.externalOrderId, clientOrderId: externalOrder.clientOrderId, security: externalOrder.security, requestedQuantity: 100, status: "UNKNOWN", evidenceRef: externalOrder.evidenceRef, observedAt: externalOrder.observedAt });

  const outbox = await tradePool.query("SELECT status, attempts, payload FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [orderId]);
  assert.equal(outbox.rowCount, 1);
  assert.equal(outbox.rows[0].status, "DELIVERED");
  assert.ok(outbox.rows[0].attempts >= 2, "the persisted event must include the initial failed delivery and at least one successful retry");
  assert.deepEqual({ side: outbox.rows[0].payload.side, currency: outbox.rows[0].payload.currency, reservation: outbox.rows[0].payload.reservation }, { side: "BUY", currency: "CNY", reservation: { reservationId, ownerId, testRunId, clientOrderId } });
  const ledger = await portfolioPool.query("SELECT count(*)::int AS fills FROM recorded_fills WHERE account_id=$1", [accountId]);
  assert.equal(ledger.rows[0].fills, 3, "one original and two cancellation-race Fill increments are posted exactly once");
  const capturedReservation = await portfolioPool.query("SELECT status, captured_cash_amount::text FROM resource_reservations WHERE reservation_id=$1 AND account_id=$2", [reservationId, accountId]);
  assert.deepEqual(capturedReservation.rows[0], { status: "UNKNOWN", captured_cash_amount: "1003.0010" });

  console.log(JSON.stringify({ status: "PASS", scenario: "Portfolio commits Fill, response is lost, execution service restarts and retries durable Outbox", testRunId, namespace, orderId, accountId, reservationId, firstPortfolioResponseLost: lostResponseInjected, pendingBeforeRestart: { status: pendingBeforeRestart.rows[0].status, outbox_status: pendingBeforeRestart.rows[0].outbox_status, attempts: pendingBeforeRestart.rows[0].attempts }, concurrentOutboxClaims: 1, expiredLeaseTakeover: true, staleAckFenced: true, staleFailureFenced: true, recoveredOrder: recoveredOrder.rows[0].status, outbox: outbox.rows[0].status, attempts: outbox.rows[0].attempts, portfolioFillCount: ledger.rows[0].fills, feeCorrection: { delivered: feeCorrectionDelivered, revision: 1, idempotentRetry: true, unauthorizedReplayRejected: true, originalFeePreserved: correctionFacts.rows[0].original_fee, correctedFee: correctionFacts.rows[0].fee }, fillDuringCancel: { cancelSequenceBufferedFirst: bufferedCancel.buffered, cancelStateWhileGapOpen: bufferedCancel.status, gapSurvivedTradeRestart: true, reservationHeldWhileGapOpen: true, fillSequenceDrainedThrough: simulatedFillResult.lastAppliedSequence, cancelReplayIdempotent: cancelReplay.replayed, simulatedCumulativeQuantity: 75, incrementalQuantity: 25, idempotentReplay: true, unauthorizedReplayRejected: true, finalOrder: raceFacts.rows[0].status, portfolioFills: raceLedger.rows[0], cashAfterBothFills: raceSnapshot.cash.amount, reservation: raceReservationLedger.rows[0] }, externalOrderReconciliation: { created: externalCreated.status, idempotentReplay: externalReplay.status, changedFactConflict: externalConflict.status, replayWriterDenied: forbiddenExternalWrite.status, externalOnlyOrderCount: externalSummary.externalOnlyOrderCount, discrepancyKind: externalSummary.discrepancies[0].kind }, reservationCapture: capturedReservation.rows[0], ledgerEntryCount: correctedSnapshot.ledgerEntryCount, cash: correctedSnapshot.cash.amount, brokerMode: "FAKE" }));
} finally {
  await stop(tradeServer);
  await stop(portfolioServer);
  if (proxy) await new Promise((resolveClose) => proxy.close(resolveClose));
  if (governance) await new Promise((resolveClose) => governance.close(resolveClose));
  if (portfolioMigrated && accountId) {
    const client = await portfolioPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM resource_reservations WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM fill_fee_corrections c USING recorded_fills f WHERE c.external_fill_id=f.external_fill_id AND f.account_id=$1", [accountId]);
      await client.query("DELETE FROM fill_fee_corrections c USING recorded_fills f WHERE c.external_fill_id=f.external_fill_id AND f.account_id=$1", [accountId]);
      await client.query("DELETE FROM recorded_fills WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM account_positions WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM ledger_entries WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM accounts WHERE account_id=$1 AND namespace=$2 AND test_run_id=$3 AND owner_id=$4", [accountId, namespace, testRunId, ownerId]);
      const remaining = await client.query("SELECT count(*)::int AS count FROM accounts WHERE account_id=$1", [accountId]);
      assert.equal(remaining.rows[0].count, 0);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  if (tradeMigrated) {
    await tradePool.query("DELETE FROM fake_broker_external_orders WHERE namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_simulated_reports r USING fake_broker_orders o WHERE r.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_fee_corrections c USING fake_broker_fills f, fake_broker_orders o WHERE c.external_fill_id=f.external_fill_id AND f.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_authoritative_event_inbox e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_order_event_sequences s USING fake_broker_orders o WHERE s.order_id=o.order_id AND o.namespace=$1", [namespace]);
    await tradePool.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
    const remaining = await tradePool.query("SELECT count(*)::int AS count FROM fake_broker_orders WHERE namespace=$1", [namespace]);
    assert.equal(remaining.rows[0].count, 0);
  }
  await Promise.all([tradePool.end(), portfolioPool.end()]);
}
