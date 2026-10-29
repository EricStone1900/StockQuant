import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";
import { PostgresSimulationExecutionPolicyRepository } from "../dist/adapters/postgres-simulation-execution-policy-repository.js";
import { migrateTradeExecutionSchema } from "../dist/adapters/postgres-schema-migrations.js";
import { C5LocalPaperExecutionService } from "../dist/application/c5-local-paper-execution.js";
import { FillOutboxDelivery } from "../dist/application/fill-outbox-delivery.js";

const connectionString = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const parsed = new URL(connectionString);
const databaseName = parsed.pathname.replace(/^\//u, "");
if (databaseName === "trade_execution" || parsed.username === "trade_execution") {
  console.error("refusing to run FakeBroker persistence tests against the formal trade_execution database; use a dedicated test database");
  process.exit(2);
}

let pool = new Pool({ connectionString });
let databaseReady = false;
let namespaceMigrated = false;
let c5NamespaceForCleanup;
const namespace = `test-p5-idempotency-${randomUUID()}`;
const accountId = randomUUID();
const command = {
  namespace,
  accountId,
  clientOrderId: `order-${randomUUID()}`,
  security: "600000.SH",
  side: "SELL",
  currency: "CNY",
  initialAccountCash: "10000.0000",
  reservation: { reservationId: randomUUID(), ownerId: "test-owner", testRunId: randomUUID(), clientOrderId: `order-${randomUUID()}` },
  requestedQuantity: 100,
  bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 500 }
};
command.reservation.clientOrderId = command.clientOrderId;

try {
  await pool.query("SELECT 1");
  databaseReady = true;
  const repository = new PostgresFakeBrokerRepository(pool);
  await migrateTradeExecutionSchema(pool);
  const migrationState = await pool.query("SELECT version, description FROM trade_execution_schema_migrations");
  assert.deepEqual(migrationState.rows, [
    { version: 1, description: "V1 FakeBroker orders, fills, events, outbox, and simulation policy schema" },
    { version: 2, description: "OD-014 strict settled cash and Paper sell receivables" },
    { version: 3, description: "Persist unmapped Paper SELL receivables without releasing cash" },
  ]);
  await migrateTradeExecutionSchema(pool);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM trade_execution_schema_migrations")).rows[0].count, 3, "re-running migrations must preserve all ordered schema versions");
  // Fixed, independent FakeBroker opening position for the SELL persistence scenario.
  await pool.query(`INSERT INTO fake_broker_account_assets(namespace,account_id,owner_id,test_run_id,currency,initial_cash,current_cash)
    VALUES($1,$2,$3,$4,'CNY',$5::numeric,$5::numeric)`, [namespace, accountId, command.reservation.ownerId, command.reservation.testRunId, command.initialAccountCash]);
  await pool.query("INSERT INTO fake_broker_positions(namespace,account_id,security,quantity) VALUES($1,$2,'600000.SH',500)", [namespace, accountId]);
  await new PostgresSimulationExecutionPolicyRepository(pool).migrate();
  namespaceMigrated = true;
  const [first, concurrentReplay] = await Promise.all([repository.execute(command), repository.execute(command)]);
  assert.equal([first, concurrentReplay].filter((result) => !result.replayed).length, 1);
  assert.equal([first, concurrentReplay].filter((result) => result.replayed).length, 1);
  assert.equal(first.result.orderId, concurrentReplay.result.orderId, "the FakeBroker's externally returned orderId remains stable across concurrent clientOrderId retries");
  const original = first.replayed ? concurrentReplay : first;
  assert.equal(original.result.status, "PARTIALLY_FILLED");

  const unknownSettlementCommand = {
    ...command,
    accountId: randomUUID(),
    clientOrderId: `unknown-calendar-${randomUUID()}`,
    requestedQuantity: 10,
    bar: { timestamp: "2026-09-26T01:31:00.000Z", open: "10.0000", volume: 500 },
    reservation: { ...command.reservation, reservationId: randomUUID(), clientOrderId: "", testRunId: randomUUID() },
  };
  unknownSettlementCommand.reservation.clientOrderId = unknownSettlementCommand.clientOrderId;
  await pool.query(`INSERT INTO fake_broker_account_assets(namespace,account_id,owner_id,test_run_id,currency,initial_cash,current_cash)
    VALUES($1,$2,$3,$4,'CNY',$5::numeric,$5::numeric)`, [namespace, unknownSettlementCommand.accountId, unknownSettlementCommand.reservation.ownerId, unknownSettlementCommand.reservation.testRunId, unknownSettlementCommand.initialAccountCash]);
  await pool.query("INSERT INTO fake_broker_positions(namespace,account_id,security,quantity) VALUES($1,$2,'600000.SH',20)", [namespace, unknownSettlementCommand.accountId]);
  const unknownSettlementExecution = await repository.execute(unknownSettlementCommand);
  assert.equal(unknownSettlementExecution.result.status, "FILLED");
  const unknownSettlementFacts = await pool.query(`SELECT a.current_cash::text AS current_cash,p.quantity::text AS position,
      r.amount::text AS receivable_amount,r.trade_date::text AS trade_date,r.settlement_date::text AS settlement_date,
      r.settlement_error_code,r.status,x.payload->'settlement' AS outbox_settlement
    FROM fake_broker_account_assets a
    JOIN fake_broker_positions p ON p.namespace=a.namespace AND p.account_id=a.account_id AND p.security='600000.SH'
    JOIN fake_broker_sell_receivables r ON r.namespace=a.namespace AND r.account_id=a.account_id
    JOIN fake_broker_outbox x ON x.order_id=$3 AND x.event_type='FILL_POST'
    WHERE a.namespace=$1 AND a.account_id=$2`, [namespace, unknownSettlementCommand.accountId, unknownSettlementExecution.result.orderId]);
  assert.deepEqual(unknownSettlementFacts.rows[0], {
    current_cash: "10000.0000", position: "10", receivable_amount: "99.8001", trade_date: "2026-09-26",
    settlement_date: null, settlement_error_code: "SETTLEMENT_CALENDAR_UNAVAILABLE", status: "PENDING",
    outbox_settlement: { tradeDate: "2026-09-26", settlementDate: null, calendarVersion: "v1.4-synthetic-settlement-3", settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" },
  }, "unknown calendar dates must retain the durable FakeBroker Fill and pending receivable without releasing cash");
  const unknownSettlementReplay = await repository.execute(unknownSettlementCommand);
  assert.equal(unknownSettlementReplay.replayed, true);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM fake_broker_sell_receivables WHERE namespace=$1 AND account_id=$2", [namespace, unknownSettlementCommand.accountId])).rows[0].count, 1);
  console.log(`[FakeBroker unknown settlement calendar] ${JSON.stringify({ orderId: unknownSettlementExecution.result.orderId, fillId: unknownSettlementExecution.result.fill.externalFillId, cash: unknownSettlementFacts.rows[0].current_cash, receivable: unknownSettlementFacts.rows[0].receivable_amount, settlementDate: unknownSettlementFacts.rows[0].settlement_date, errorCode: unknownSettlementFacts.rows[0].settlement_error_code, outboxPayloadMatches: true, idempotentReplay: unknownSettlementReplay.replayed })}`);

  await assert.rejects(repository.execute({ ...command, requestedQuantity: 99 }), (error) => error?.statusCode === 409);
  await assert.rejects(repository.execute({ ...command, bar: { ...command.bar, open: "10.2100" } }), (error) => error?.statusCode === 409);
  const legacyClientOrderId = `legacy-${randomUUID()}`;
  await pool.query(`INSERT INTO fake_broker_orders (order_id,namespace,account_id,client_order_id,security,requested_quantity,status)
    VALUES ($1,$2,$3,$4,$5,$6,'FILLED')`, [randomUUID(), namespace, accountId, legacyClientOrderId, command.security, command.requestedQuantity]);
  await assert.rejects(repository.execute({ ...command, clientOrderId: legacyClientOrderId, reservation: { ...command.reservation, clientOrderId: legacyClientOrderId } }), (error) => error?.statusCode === 409);
  const rows = await pool.query(`SELECT count(*)::int AS orders,
    (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS fills,
    (SELECT count(*)::int FROM fake_broker_order_events e JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS outbox
    FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
  assert.deepEqual(rows.rows[0], { orders: 3, fills: 2, events: 2, outbox: 2 });
  const outbox = await pool.query("SELECT payload FROM fake_broker_outbox WHERE order_id=$1", [original.result.orderId]);
  assert.deepEqual({ side: outbox.rows[0].payload.side, currency: outbox.rows[0].payload.currency, settlement: outbox.rows[0].payload.settlement, reservation: outbox.rows[0].payload.reservation }, { side: "SELL", currency: "CNY", settlement: { tradeDate: "2026-09-25", settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-3", settlementErrorCode: null }, reservation: command.reservation });

  const partialFillBeforeCancel = await pool.query(`SELECT o.status, f.quantity::text AS quantity,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id) AS outbox
    FROM fake_broker_orders o JOIN fake_broker_fills f USING (order_id) WHERE o.order_id=$1`, [original.result.orderId]);
  assert.equal(partialFillBeforeCancel.rows[0].status, "PARTIALLY_FILLED");
  assert.ok(BigInt(partialFillBeforeCancel.rows[0].quantity) < BigInt(command.requestedQuantity));
  const cancelRace = await Promise.all([repository.cancel(original.result.orderId), repository.cancel(original.result.orderId)]);
  assert.deepEqual(cancelRace.map((result) => result?.status), ["CANCEL_REQUESTED", "CANCEL_REQUESTED"], "concurrent duplicate cancel requests must serialize idempotently");
  assert.equal((await repository.cancel(original.result.orderId))?.status, "CANCEL_REQUESTED", "a retry while awaiting acknowledgement must not manufacture a cancellation acknowledgement");
  const partialFillAfterCancel = await pool.query(`SELECT o.status, f.quantity::text AS quantity,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id) AS outbox,
    x.payload->>'externalFillId' AS outbox_fill_id
    FROM fake_broker_orders o JOIN fake_broker_fills f USING (order_id)
    JOIN fake_broker_outbox x ON x.order_id=o.order_id WHERE o.order_id=$1`, [original.result.orderId]);
  assert.deepEqual(partialFillAfterCancel.rows[0], {
    status: "CANCEL_REQUESTED", quantity: partialFillBeforeCancel.rows[0].quantity,
    events: partialFillBeforeCancel.rows[0].events + 1, outbox: partialFillBeforeCancel.rows[0].outbox,
    outbox_fill_id: original.result.fill.externalFillId,
  }, "cancel request and acknowledgement must preserve the authoritative partial Fill and its pending outbox event");
  const acceptedCancel = await repository.resolveCancellation(original.result.orderId, "ACCEPTED", "SIMULATED_FAKEBROKER_CANCEL_ACCEPTED", 1);
  assert.equal(acceptedCancel?.status, "CANCELLED", "an authoritative accepted cancellation closes the unfilled remainder after a partial Fill");
  const acceptedCancelEvidence = await pool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id) AS outbox,
    e.reason
    FROM fake_broker_orders o JOIN LATERAL (SELECT reason FROM fake_broker_order_events WHERE order_id=o.order_id ORDER BY occurred_at DESC LIMIT 1) e ON true
    WHERE o.order_id=$1`, [original.result.orderId]);
  assert.deepEqual(acceptedCancelEvidence.rows[0], {
    status: "CANCELLED", events: partialFillBeforeCancel.rows[0].events + 2,
    outbox: partialFillBeforeCancel.rows[0].outbox, reason: "CANCEL_ACCEPTED: SIMULATED_FAKEBROKER_CANCEL_ACCEPTED:SEQUENCE_1",
  }, "accepted cancel result and event commit together while preserving the Fill outbox");

  const lateFillClientOrderId = `late-fill-${randomUUID()}`;
  const lateFillCommand = {
    ...command,
    clientOrderId: lateFillClientOrderId,
    reservation: { ...command.reservation, reservationId: randomUUID(), clientOrderId: lateFillClientOrderId },
  };
  const lateFillStarted = await repository.execute(lateFillCommand);
  assert.equal(lateFillStarted.result.status, "PARTIALLY_FILLED");
  const lateFillInitial = await pool.query("SELECT COALESCE(SUM(quantity),0)::int AS quantity FROM fake_broker_fills WHERE order_id=$1", [lateFillStarted.result.orderId]);
  assert.ok(lateFillInitial.rows[0].quantity > 0 && lateFillInitial.rows[0].quantity < lateFillCommand.requestedQuantity);
  assert.equal((await repository.cancel(lateFillStarted.result.orderId))?.status, "CANCEL_REQUESTED");
  const lateFill = await repository.recordSimulatedFillReport(lateFillStarted.result.orderId, {
    externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: lateFillCommand.requestedQuantity,
    price: "10.2000", fee: "0.0000", effectiveAt: "2026-09-25T01:32:00.000Z", evidenceRef: "fixture:fill-reported-after-cancel-request",
  });
  assert.equal(lateFill.lastAppliedSequence, 1);
  const lateCancelResolution = await repository.resolveCancellation(lateFillStarted.result.orderId, "ACCEPTED", "SIMULATED_LATE_FULL_FILL_WON", 2);
  assert.equal(lateCancelResolution?.status, "FILLED", "a full authoritative Fill arriving after cancel request but before cancel result wins the race");
  const lateFillRaceState = await pool.query(`SELECT o.status,COALESCE(SUM(f.quantity),0)::int AS filled_quantity,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id) AS event_count,
    (SELECT last_applied_sequence FROM fake_broker_order_event_sequences WHERE order_id=o.order_id) AS last_sequence
    FROM fake_broker_orders o LEFT JOIN fake_broker_fills f USING (order_id) WHERE o.order_id=$1 GROUP BY o.order_id`, [lateFillStarted.result.orderId]);
  assert.deepEqual(lateFillRaceState.rows[0], { status: "FILLED", filled_quantity: lateFillCommand.requestedQuantity, event_count: 4, last_sequence: "2" });
  console.log(`[FakeBroker cancel/fill race] ${JSON.stringify({ orderId: lateFillStarted.result.orderId, initialFillQuantity: lateFillInitial.rows[0].quantity, cancelRequestedBeforeLateFill: true, lateFillCumulativeQuantity: lateFillCommand.requestedQuantity, cancelResult: "ACCEPTED", finalStatus: lateFillRaceState.rows[0].status, finalFilledQuantity: lateFillRaceState.rows[0].filled_quantity, lastAppliedSequence: lateFillRaceState.rows[0].last_sequence })}`);

  assert.equal((await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [original.result.orderId])).rows[0].count, 0, "reservation resolution must wait for the already-persisted Fill to post to Portfolio");
  const fillOutbox = await repository.pendingOutbox();
  const eventRow = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [original.result.orderId]);
  assert.ok(fillOutbox.some((event) => event.event_id === eventRow.rows[0].event_id));
  const fillClaim = await repository.claimOutbox(eventRow.rows[0].event_id);
  assert.ok(fillClaim);
  await repository.markFillDelivered(eventRow.rows[0].event_id, fillClaim.claim_token);
  await pool.query(`INSERT INTO fake_broker_account_assets(namespace,account_id,owner_id,test_run_id,currency,initial_cash,current_cash)
    VALUES($1,$2,'test-owner',$3,'CNY',10000,10000) ON CONFLICT(namespace,account_id) DO NOTHING`, [namespace, accountId, command.reservation.testRunId]);
  const correction1 = { externalFillId: original.result.fill.externalFillId, revision: 1, previousFee: original.result.fill.fee,
    correctedFee: (Number(original.result.fill.fee) + 1).toFixed(4), effectiveAt: "2026-09-25T01:40:00.000Z", evidenceRef: `fixture-fee:${original.result.fill.externalFillId}:1` };
  const recordedCorrection = await repository.recordFeeCorrection(original.result.orderId, correction1);
  assert.equal(recordedCorrection.replayed, false);
  assert.equal(recordedCorrection.status, "PENDING");
  assert.equal((await repository.recordFeeCorrection(original.result.orderId, correction1)).replayed, true, "identical correction command replays idempotently");
  await assert.rejects(repository.recordFeeCorrection(original.result.orderId, { ...correction1, correctedFee: (Number(correction1.correctedFee) + 1).toFixed(4) }), /FEE_CORRECTION_IDEMPOTENCY_CONFLICT/u);
  const correction2 = { ...correction1, revision: 2, previousFee: correction1.correctedFee, correctedFee: original.result.fill.fee,
    effectiveAt: "2026-09-25T01:41:00.000Z", evidenceRef: `fixture-fee:${original.result.fill.externalFillId}:2` };
  await assert.rejects(repository.recordFeeCorrection(original.result.orderId, correction2), /FEE_CORRECTION_DELIVERY_PENDING/u,
    "next correction waits until the prior fee event is acknowledged");
  const correctionClaim1 = await repository.claimFeeCorrectionOutbox(recordedCorrection.eventId);
  assert.ok(correctionClaim1);
  assert.equal(correctionClaim1.payload.correctedFee, correction1.correctedFee);
  await repository.markFeeCorrectionDelivered(recordedCorrection.eventId, correctionClaim1.claim_token);
  const recordedCorrection2 = await repository.recordFeeCorrection(original.result.orderId, correction2);
  const correctionClaim2 = await repository.claimFeeCorrectionOutbox(recordedCorrection2.eventId);
  assert.ok(correctionClaim2);
  await repository.markFeeCorrectionDelivered(recordedCorrection2.eventId, correctionClaim2.claim_token);
  const correctionState = await pool.query(`SELECT fee::text,original_fee::text,fee_revision FROM fake_broker_fills WHERE external_fill_id=$1`, [original.result.fill.externalFillId]);
  assert.deepEqual(correctionState.rows[0], { fee: correction2.correctedFee, original_fee: original.result.fill.fee, fee_revision: 2 },
    "fee corrections update current FakeBroker fee while retaining original Fill facts");
  const resolutionEvent = await pool.query("SELECT event_id,status,payload FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [original.result.orderId]);
  assert.equal(resolutionEvent.rowCount, 1, "Fill acknowledgement durably enqueues cancellation release only after Portfolio Fill posting");
  assert.equal(resolutionEvent.rows[0].payload.outcome, "CANCELLED");
  assert.equal(resolutionEvent.rows[0].payload.evidenceRef, `fakebroker-cancel:${original.result.orderId}`);
  const resolutionClaim = await repository.claimReservationResolutionOutbox(resolutionEvent.rows[0].event_id);
  assert.ok(resolutionClaim);
  await repository.markReservationResolutionDelivered(resolutionEvent.rows[0].event_id, resolutionClaim.claim_token);
  assert.equal((await pool.query("SELECT status FROM fake_broker_outbox WHERE event_id=$1", [resolutionEvent.rows[0].event_id])).rows[0].status, "DELIVERED");

  const rejectedCommand = { ...command, clientOrderId: `reject-${randomUUID()}`, reservation: { ...command.reservation, reservationId: randomUUID() } };
  rejectedCommand.reservation.clientOrderId = rejectedCommand.clientOrderId;
  const rejectedOrder = await repository.execute(rejectedCommand);
  assert.equal((await repository.cancel(rejectedOrder.result.orderId))?.status, "CANCEL_REQUESTED");
  const rejectedCancel = await repository.resolveCancellation(rejectedOrder.result.orderId, "REJECTED", "SIMULATED_FAKEBROKER_CANCEL_REJECTED", 1);
  assert.equal(rejectedCancel?.status, "PARTIALLY_FILLED", "a rejected cancel restores the working partial-fill state");
  await assert.rejects(repository.resolveCancellation(rejectedOrder.result.orderId, "ACCEPTED", "LATE_DUPLICATE", 1), /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u, "changed facts at a consumed sequence are rejected");

  const competingCommand = { ...command, clientOrderId: `competing-${randomUUID()}`, reservation: { ...command.reservation, reservationId: randomUUID() } };
  competingCommand.reservation.clientOrderId = competingCommand.clientOrderId;
  const competingOrder = await repository.execute(competingCommand);
  await repository.cancel(competingOrder.result.orderId);
  const competingResults = await Promise.allSettled([
    repository.resolveCancellation(competingOrder.result.orderId, "ACCEPTED", "RACE_ACCEPTED", 1),
    repository.resolveCancellation(competingOrder.result.orderId, "REJECTED", "RACE_REJECTED", 1),
  ]);
  assert.equal(competingResults.filter((result) => result.status === "fulfilled").length, 1, "only one payload may claim an authoritative event sequence");
  assert.equal(competingResults.filter((result) => result.status === "rejected" && /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u.test(result.reason?.message ?? "")).length, 1, "different facts at one sequence are fenced as a conflict");
  const competingState = await pool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id AND reason LIKE 'CANCEL_%') AS terminal_cancel_results,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='RESERVATION_RESOLVE') AS reservation_resolutions,
    (SELECT reason FROM fake_broker_order_events WHERE order_id=o.order_id AND reason LIKE 'CANCEL_%' ORDER BY occurred_at DESC LIMIT 1) AS winning_reason
    FROM fake_broker_orders o WHERE o.order_id=$1`, [competingOrder.result.orderId]);
  const competed = competingState.rows[0];
  assert.ok(["CANCELLED", "PARTIALLY_FILLED"].includes(competed.status));
  assert.equal(competed.terminal_cancel_results, 1, "the order history must contain exactly one authoritative cancellation outcome");
  assert.equal(competed.reservation_resolutions, 0, "cancel resolution waits for its still-pending Fill outbox in either race outcome");
  assert.ok(["CANCEL_ACCEPTED: RACE_ACCEPTED:SEQUENCE_1", "CANCEL_REJECTED: RACE_REJECTED:SEQUENCE_1"].includes(competed.winning_reason));
  assert.equal(competed.status, competed.winning_reason.startsWith("CANCEL_ACCEPTED:") ? "CANCELLED" : "PARTIALLY_FILLED", "the persisted order state must match the sole winning authoritative result");

  const fillRaceCommand = { ...command, clientOrderId: `fill-cancel-race-${randomUUID()}`, reservation: { ...command.reservation, reservationId: randomUUID() } };
  fillRaceCommand.reservation.clientOrderId = fillRaceCommand.clientOrderId;
  const fillRaceOrder = await repository.execute(fillRaceCommand);
  const fillRaceFillEvent = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [fillRaceOrder.result.orderId]);
  const fillRaceClaim = await repository.claimOutbox(fillRaceFillEvent.rows[0].event_id);
  await repository.markFillDelivered(fillRaceFillEvent.rows[0].event_id, fillRaceClaim.claim_token);
  await repository.cancel(fillRaceOrder.result.orderId);
  const simulatedReport = { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 75, price: "10.2000", fee: "0.0100", effectiveAt: "2026-09-25T01:32:00.000Z", evidenceRef: `fixed-fault:${fillRaceOrder.result.orderId}:fill-during-cancel` };
  const cancelBeforeEarlierFill = await repository.resolveCancellation(fillRaceOrder.result.orderId, "ACCEPTED", "SIMULATED_FAKEBROKER_CANCEL_ACCEPTED_RACE", 2);
  assert.equal(cancelBeforeEarlierFill?.buffered, true, "sequence 2 cancellation arriving first is durably buffered");
  assert.equal(cancelBeforeEarlierFill?.status, "CANCEL_REQUESTED", "a gap cannot advance order state");
  const unresolvedGap = await pool.query(`SELECT s.last_applied_sequence,e.event_type,e.applied_at,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE') AS reservation_resolutions
    FROM fake_broker_order_event_sequences s JOIN fake_broker_authoritative_event_inbox e USING(order_id)
    WHERE s.order_id=$1 AND e.broker_sequence=2`, [fillRaceOrder.result.orderId]);
  assert.deepEqual(unresolvedGap.rows[0], { last_applied_sequence: "0", event_type: "CANCEL_RESULT", applied_at: null, reservation_resolutions: 0 }, "a durable gap neither advances the cursor nor releases resources");
  const cancelReplayWhileBuffered = await repository.resolveCancellation(fillRaceOrder.result.orderId, "ACCEPTED", "SIMULATED_FAKEBROKER_CANCEL_ACCEPTED_RACE", 2);
  assert.equal(cancelReplayWhileBuffered?.replayed, true);
  assert.equal(cancelReplayWhileBuffered?.buffered, true, "identical retry remains pending until the missing event arrives");
  await assert.rejects(repository.resolveCancellation(fillRaceOrder.result.orderId, "REJECTED", "CHANGED_FACTS", 2), /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u);
  const raceFillResult = await repository.recordSimulatedFillReport(fillRaceOrder.result.orderId, simulatedReport);
  assert.equal(raceFillResult.buffered, false);
  assert.equal(raceFillResult.lastAppliedSequence, 2, "arrival of sequence 1 drains both events in sequence order");
  const finalRaceOrder = await pool.query("SELECT status FROM fake_broker_orders WHERE order_id=$1", [fillRaceOrder.result.orderId]);
  assert.equal(finalRaceOrder.rows[0].status, "CANCELLED");
  const drainedGap = await pool.query(`SELECT s.last_applied_sequence,count(*) FILTER (WHERE e.applied_at IS NULL)::int AS pending
    FROM fake_broker_order_event_sequences s JOIN fake_broker_authoritative_event_inbox e USING(order_id)
    WHERE s.order_id=$1 GROUP BY s.last_applied_sequence`, [fillRaceOrder.result.orderId]);
  assert.deepEqual(drainedGap.rows[0], { last_applied_sequence: "2", pending: 0 }, "the cursor advances only after both contiguous events commit");
  const raceFillState = await pool.query(`SELECT count(*)::int AS fills,COALESCE(sum(quantity),0)::text AS quantity,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST') AS fill_events
    FROM fake_broker_fills WHERE order_id=$1`, [fillRaceOrder.result.orderId]);
  assert.deepEqual(raceFillState.rows[0], { fills: 2, quantity: "75", fill_events: 2 }, "earlier authoritative Fill is applied before the later cancellation regardless of arrival order");
  assert.equal(raceFillResult.totalFilledQuantity, 75);
  assert.equal(raceFillResult.incrementalQuantity, 25);
  assert.equal((await repository.recordSimulatedFillReport(fillRaceOrder.result.orderId, simulatedReport)).replayed, true, "same broker report replay is idempotent");
  await assert.rejects(repository.recordSimulatedFillReport(fillRaceOrder.result.orderId, { ...simulatedReport, fee: "0.0200" }), /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u);

  const causalTestRunId = randomUUID(); const causalAccountId = randomUUID(); const causalClientOrderId = `causal-fill-order-${randomUUID()}`;
  const causalCommand = {
    proposalId: randomUUID(), proposalVersion: 1, contentHash: "a".repeat(64), ownerId: "test-owner", testRunId: causalTestRunId,
    accountId: causalAccountId, strategyVersion: "fixture-manual-test-v1", approvalMode: "MANUAL_APPROVAL", namespace,
    clientOrderId: causalClientOrderId, security: "600000.SH", side: "BUY", quantity: 200, currency: "CNY", price: "10.0000",
    fee: "5.0000", reservedCash: "2005.0000", effectiveAt: "2026-09-25T01:34:00.000Z", commandHash: "b".repeat(64), executionMode: "SEQUENCED",
    reservation: { reservationId: randomUUID(), ownerId: "test-owner", testRunId: causalTestRunId, clientOrderId: causalClientOrderId },
  };
  const causalOrder = await repository.executeV13ManualPaper(causalCommand);
  assert.equal(causalOrder.result.status, "ACCEPTED", "the sequenced FakeBroker order starts working without inventing a Fill");
  assert.equal(causalOrder.result.fill, undefined);
  const expiryClientOrderId = `expiry-order-${randomUUID()}`;
  const expiryCommand = { ...causalCommand, accountId: randomUUID(), clientOrderId: expiryClientOrderId,
    reservation: { ...causalCommand.reservation, reservationId: randomUUID(), clientOrderId: expiryClientOrderId } };
  const expiryOrder = await repository.executeV13ManualPaper(expiryCommand);
  assert.equal((await repository.transition(expiryOrder.result.orderId, "EXPIRED", "DAY_WINDOW_CLOSED"))?.status, "EXPIRED");
  const expiryState = await pool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_order_events WHERE order_id=o.order_id AND status='EXPIRED' AND reason='DAY_WINDOW_CLOSED') AS expiry_events,
    x.payload->>'outcome' AS resolution_outcome,x.payload->>'reservationId' AS reservation_id
    FROM fake_broker_orders o LEFT JOIN fake_broker_outbox x ON x.order_id=o.order_id AND x.event_type='RESERVATION_RESOLVE'
    WHERE o.order_id=$1`, [expiryOrder.result.orderId]);
  assert.deepEqual(expiryState.rows[0], { status: "EXPIRED", expiry_events: 1, resolution_outcome: "EXPIRED", reservation_id: expiryCommand.reservation.reservationId },
    "confirmed expiry commits its event and scoped reservation-resolution outbox atomically");
  const partialExpiryClientOrderId = `partial-expiry-order-${randomUUID()}`;
  const partialExpiryCommand = { ...causalCommand, accountId: randomUUID(), clientOrderId: partialExpiryClientOrderId,
    reservation: { ...causalCommand.reservation, reservationId: randomUUID(), clientOrderId: partialExpiryClientOrderId } };
  const partialExpiryOrder = await repository.executeV13ManualPaper(partialExpiryCommand);
  await repository.recordSimulatedFillReport(partialExpiryOrder.result.orderId, { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 75,
    price: "10.0000", fee: "2.5000", effectiveAt: "2026-09-25T01:34:01.000Z", evidenceRef: `fixed-fault:${partialExpiryOrder.result.orderId}:partial-before-expiry` });
  await repository.transition(partialExpiryOrder.result.orderId, "EXPIRED", "DAY_WINDOW_CLOSED");
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [partialExpiryOrder.result.orderId])).rows[0].count, 0,
    "expiry cannot release reservation while a partial Fill remains pending Portfolio posting");
  const pendingExpiryFill = await repository.pendingFill(partialExpiryOrder.result.orderId);
  const claimedExpiryFill = await repository.claimOutbox(pendingExpiryFill.event_id);
  await repository.markFillDelivered(pendingExpiryFill.event_id, claimedExpiryFill.claim_token);
  const deferredExpiryResolution = await pool.query("SELECT payload->>'outcome' AS outcome FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [partialExpiryOrder.result.orderId]);
  assert.deepEqual(deferredExpiryResolution.rows, [{ outcome: "EXPIRED" }], "expiry release is enqueued only after every partial Fill posts");
  const unknownClientOrderId = `unknown-order-${randomUUID()}`;
  const unknownCommand = { ...causalCommand, accountId: randomUUID(), clientOrderId: unknownClientOrderId,
    reservation: { ...causalCommand.reservation, reservationId: randomUUID(), clientOrderId: unknownClientOrderId } };
  const unknownOrder = await repository.executeV13ManualPaper(unknownCommand);
  await repository.transition(unknownOrder.result.orderId, "UNKNOWN", "VENUE_TIMEOUT");
  assert.equal(await repository.transition(unknownOrder.result.orderId, "EXPIRED", "DAY_WINDOW_CLOSED"), null,
    "UNKNOWN orders cannot be expired to release a reservation without querying the original order");
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [unknownOrder.result.orderId])).rows[0].count, 0);
  const sequence2Fill = { externalFillId: randomUUID(), sequence: 2, cumulativeQuantity: 150, price: "10.0000", fee: "2.5000", effectiveAt: "2026-09-25T01:34:02.000Z", evidenceRef: `fixed-fault:${causalOrder.result.orderId}:fill-sequence-2` };
  const bufferedSequence2 = await repository.recordSimulatedFillReport(causalOrder.result.orderId, sequence2Fill);
  assert.equal(bufferedSequence2.buffered, true, "sequence 2 cumulative Fill is durably buffered while sequence 1 is missing");
  assert.equal(bufferedSequence2.totalFilledQuantity, null, "buffered sequence 2 has not been applied to the cumulative ledger");
  for (let replay = 0; replay < 10; replay += 1) {
    const result = await repository.recordSimulatedFillReport(causalOrder.result.orderId, sequence2Fill);
    assert.equal(result.replayed, true, `sequence 2 replay ${replay + 1} is idempotent`);
    assert.equal(result.buffered, true);
  }
  const sequence1Fill = { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 100, price: "10.0000", fee: "2.5000", effectiveAt: "2026-09-25T01:34:01.000Z", evidenceRef: `fixed-fault:${causalOrder.result.orderId}:fill-sequence-1` };
  const drainedFillSequence = await repository.recordSimulatedFillReport(causalOrder.result.orderId, sequence1Fill);
  assert.equal(drainedFillSequence.lastAppliedSequence, 2, "sequence 1 arrival drains both Fill events in causal order");
  assert.equal(drainedFillSequence.totalFilledQuantity, 100, "sequence 1 keeps its own cumulative report while sequence 2 is applied immediately afterward");
  assert.equal(drainedFillSequence.incrementalQuantity, 100, "sequence 1 applies the authoritative 100-share cumulative Fill");
  const causalState = await pool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=o.order_id) AS fills,
    (SELECT COALESCE(sum(quantity),0)::text FROM fake_broker_fills WHERE order_id=o.order_id) AS quantity,
    (SELECT COALESCE(sum(quantity * price + fee),0)::text FROM fake_broker_fills WHERE order_id=o.order_id) AS fill_cash,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='FILL_POST') AS fill_events,
    s.last_applied_sequence,
    (SELECT count(*)::int FROM fake_broker_authoritative_event_inbox WHERE order_id=o.order_id AND applied_at IS NULL) AS pending
    FROM fake_broker_orders o JOIN fake_broker_order_event_sequences s USING(order_id) WHERE o.order_id=$1`, [causalOrder.result.orderId]);
  const causalFillRows = await pool.query("SELECT quantity::int,price::text,fee::text,broker_sequence FROM fake_broker_fills WHERE order_id=$1 ORDER BY broker_sequence NULLS FIRST", [causalOrder.result.orderId]);
  assert.deepEqual(causalFillRows.rows, [
    { quantity: 100, price: "10.0000", fee: "2.5000", broker_sequence: "1" },
    { quantity: 50, price: "10.0000", fee: "2.5000", broker_sequence: "2" },
  ], "causal reduction applies sequence 1's 100-share Fill before sequence 2's 50-share increment");
  const money4 = (value) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0")); };
  const expectedCashMinor = causalFillRows.rows.reduce((total, fill) => total + BigInt(fill.quantity) * money4(fill.price) + money4(fill.fee), 0n);
  const expectedCausalCash = `${expectedCashMinor / 10000n}.${(expectedCashMinor % 10000n).toString().padStart(4, "0")}`;
  assert.deepEqual(causalState.rows[0], { status: "LEDGER_PENDING", fills: 2, quantity: "150", fill_cash: expectedCausalCash, fill_events: 2, last_applied_sequence: "2", pending: 0 }, "durable Facts and Fill Outbox cash agree exactly with the authoritative 100 + 50 Fill facts");
  const causalReports = await pool.query("SELECT broker_sequence,cumulative_quantity::int,incremental_quantity::int FROM fake_broker_simulated_reports WHERE order_id=$1 ORDER BY broker_sequence", [causalOrder.result.orderId]);
  assert.deepEqual(causalReports.rows, [{ broker_sequence: "1", cumulative_quantity: 100, incremental_quantity: 100 }, { broker_sequence: "2", cumulative_quantity: 150, incremental_quantity: 50 }]);
  assert.equal((await repository.recordSimulatedFillReport(causalOrder.result.orderId, sequence1Fill)).replayed, true);
  assert.equal((await repository.recordSimulatedFillReport(causalOrder.result.orderId, sequence2Fill)).replayed, true);
  const causalReplayState = await pool.query(`SELECT count(*)::int AS fills,COALESCE(sum(quantity),0)::text AS quantity,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST') AS fill_events
    FROM fake_broker_fills WHERE order_id=$1`, [causalOrder.result.orderId]);
  assert.deepEqual(causalReplayState.rows[0], { fills: 2, quantity: "150", fill_events: 2 }, "post-application replay of both causal reports cannot duplicate ledger events");
  const causalAssets = await repository.independentAssetSnapshot(namespace, causalAccountId);
  assert.equal(causalAssets.current_cash, "8495.0000", "FakeBroker independent cash posts exactly 150 shares at CNY 10 plus CNY 5 total fees");
  assert.deepEqual(causalAssets.positions, [{ security: "600000.SH", quantity: 150 }]);
  assert.equal(causalAssets.fill_event_count, 2);
  const causalReadback = await repository.findByNamespaceClientOrderId(namespace, causalClientOrderId);
  assert.equal(causalReadback.payload.proposalId, causalCommand.proposalId);
  assert.equal(causalReadback.fills.length, 2, "owner/TestRun authorization metadata and all fills remain readable after sequencing");

  // Seeded, real PostgreSQL event-arrival matrix. Each seed drives the actual
  // arrival order injected into the repository; no fault sequence is inferred.
  const seededArrivalMatrix = [];
  const seededPermutation = (seed, values) => {
    let state = seed >>> 0;
    const random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  };
  for (let offset = 0; offset < 24; offset += 1) {
    const seed = 20260907 + offset;
    const testRunId = randomUUID();
    const clientOrderId = `seeded-causal-${seed}-${randomUUID()}`;
    const seededCommand = {
      ...causalCommand,
      proposalId: randomUUID(), testRunId, accountId: randomUUID(), clientOrderId,
      security: "600000.SH", quantity: 200, price: "10.0000", fee: "5.0000", reservedCash: "2005.0000",
      commandHash: seed.toString(16).padStart(64, "0"),
      reservation: { ...causalCommand.reservation, reservationId: randomUUID(), testRunId, clientOrderId },
    };
    const seededOrder = await repository.executeV13ManualPaper(seededCommand);
    assert.equal(seededOrder.result.status, "ACCEPTED");
    const reports = [50, 125, 200].map((cumulativeQuantity, index) => ({
      externalFillId: randomUUID(), sequence: index + 1, cumulativeQuantity, price: "10.0000", fee: "1.2500",
      effectiveAt: `2026-09-25T01:35:0${index + 1}.000Z`,
      evidenceRef: `seeded-fault:${seed}:${seededOrder.result.orderId}:sequence-${index + 1}`,
    }));
    const arrivalOrder = seededPermutation(seed, [1, 2, 3]);
    const observed = [];
    for (const sequence of arrivalOrder) {
      observed.push(sequence);
      await repository.recordSimulatedFillReport(seededOrder.result.orderId, reports[sequence - 1]);
    }
    assert.deepEqual(observed, arrivalOrder, "record the exact sequence injected for this seed");
    const sequenceState = await pool.query(`SELECT s.last_applied_sequence,
      (SELECT count(*)::int FROM fake_broker_authoritative_event_inbox WHERE order_id=$1 AND applied_at IS NULL) AS pending,
      (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=$1) AS fills,
      (SELECT COALESCE(sum(quantity),0)::int FROM fake_broker_fills WHERE order_id=$1) AS quantity,
      (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST') AS fill_events
      FROM fake_broker_order_event_sequences s WHERE s.order_id=$1`, [seededOrder.result.orderId]);
    assert.deepEqual(sequenceState.rows[0], { last_applied_sequence: "3", pending: 0, fills: 3, quantity: 200, fill_events: 3 },
      `seed ${seed} must drain all authoritative events into exactly-once Fill facts`);
    const seededAssets = await repository.independentAssetSnapshot(namespace, seededCommand.accountId);
    assert.equal(seededAssets.current_cash, "7996.2500", `seed ${seed} must debit exactly USD/CNY 2000 plus three 1.25 fees`);
    assert.deepEqual(seededAssets.positions, [{ security: "600000.SH", quantity: 200 }]);
    assert.equal(seededAssets.fill_event_count, 3);
    for (const report of reports) assert.equal((await repository.recordSimulatedFillReport(seededOrder.result.orderId, report)).replayed, true);
    await assert.rejects(repository.recordSimulatedFillReport(seededOrder.result.orderId, { ...reports[0], fee: "1.2600" }), /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u);
    const afterReplay = await pool.query(`SELECT count(*)::int AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST') AS fill_events
      FROM fake_broker_fills WHERE order_id=$1`, [seededOrder.result.orderId]);
    assert.deepEqual(afterReplay.rows[0], { fills: 3, fill_events: 3 }, `seed ${seed} replay/conflict cannot duplicate facts`);
    seededArrivalMatrix.push({ seed, injectedArrivalSequence: observed, orderId: seededOrder.result.orderId, cursor: sequenceState.rows[0].last_applied_sequence });
  }
  assert.equal(new Set(seededArrivalMatrix.map((run) => run.injectedArrivalSequence.join(""))).size, 6,
    "the 24 deterministic seeds exercise all six three-event arrival permutations");
  // Seeded mixed Fill/cancellation arrivals exercise the same durable reducer
  // with heterogeneous event types. The exact injection sequence is retained
  // in the output so a failure can be reproduced from its seed.
  const seededMixedArrivalMatrix = [];
  for (let offset = 0; offset < 24; offset += 1) {
    const seed = 20261001 + offset;
    const testRunId = randomUUID();
    const clientOrderId = `seeded-fill-cancel-${seed}-${randomUUID()}`;
    const seededCommand = {
      ...causalCommand,
      proposalId: randomUUID(), testRunId, accountId: randomUUID(), clientOrderId,
      security: "600000.SH", quantity: 200, price: "10.0000", fee: "5.0000", reservedCash: "2005.0000",
      commandHash: seed.toString(16).padStart(64, "0"),
      reservation: { ...causalCommand.reservation, reservationId: randomUUID(), testRunId, clientOrderId },
    };
    const seededOrder = await repository.executeV13ManualPaper(seededCommand);
    assert.equal(seededOrder.result.status, "ACCEPTED");
    assert.equal((await repository.cancel(seededOrder.result.orderId))?.status, "CANCEL_REQUESTED");
    const mixedReports = [
      { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 50, price: "10.0000", fee: "1.2500",
        effectiveAt: "2026-09-25T01:36:01.000Z", evidenceRef: `seeded-fill-cancel:${seed}:${seededOrder.result.orderId}:fill-1` },
      { externalFillId: randomUUID(), sequence: 2, cumulativeQuantity: 125, price: "10.0000", fee: "1.2500",
        effectiveAt: "2026-09-25T01:36:02.000Z", evidenceRef: `seeded-fill-cancel:${seed}:${seededOrder.result.orderId}:fill-2` },
    ];
    const mixedEvents = [
      { sequence: 1, eventType: "FILL_REPORT", apply: () => repository.recordSimulatedFillReport(seededOrder.result.orderId, mixedReports[0]) },
      { sequence: 2, eventType: "FILL_REPORT", apply: () => repository.recordSimulatedFillReport(seededOrder.result.orderId, mixedReports[1]) },
      { sequence: 3, eventType: "CANCEL_RESULT", apply: () => repository.resolveCancellation(seededOrder.result.orderId, "ACCEPTED", `SEEDED_ACCEPTED_CANCEL_${seed}`, 3) },
    ];
    const arrivalOrder = seededPermutation(seed, mixedEvents);
    const observed = [];
    for (const event of arrivalOrder) {
      const result = await event.apply();
      observed.push({ sequence: event.sequence, eventType: event.eventType });
      if (event.eventType === "CANCEL_RESULT" && observed.length < mixedEvents.length) {
        assert.equal(result.buffered, true, `seed ${seed} buffers cancellation when prior Fill events are missing`);
        assert.equal(result.status, "CANCEL_REQUESTED", `seed ${seed} cannot apply cancellation across an event gap`);
      }
    }
    const mixedState = await pool.query(`SELECT o.status,
      (SELECT last_applied_sequence FROM fake_broker_order_event_sequences WHERE order_id=o.order_id) AS last_sequence,
      (SELECT count(*)::int FROM fake_broker_authoritative_event_inbox WHERE order_id=o.order_id AND applied_at IS NULL) AS pending,
      (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=o.order_id) AS fills,
      (SELECT COALESCE(sum(quantity),0)::int FROM fake_broker_fills WHERE order_id=o.order_id) AS filled_quantity,
      (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='FILL_POST') AS fill_events,
      (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='RESERVATION_RESOLVE') AS reservation_resolutions
      FROM fake_broker_orders o WHERE o.order_id=$1`, [seededOrder.result.orderId]);
    assert.deepEqual(mixedState.rows[0], { status: "CANCELLED", last_sequence: "3", pending: 0, fills: 2, filled_quantity: 125, fill_events: 2, reservation_resolutions: 0 },
      `seed ${seed} must causally apply both partial Fills before the accepted cancellation and hold reservation release`);
    const seededAssets = await repository.independentAssetSnapshot(namespace, seededCommand.accountId);
    assert.equal(seededAssets.current_cash, "8747.5000", `seed ${seed} must debit exactly 125 shares and two fees`);
    assert.deepEqual(seededAssets.positions, [{ security: "600000.SH", quantity: 125 }]);
    assert.equal(seededAssets.fill_event_count, 2);

    for (const event of mixedEvents) assert.equal((await event.apply()).replayed, true, `seed ${seed} replay of sequence ${event.sequence} is idempotent`);
    await assert.rejects(repository.resolveCancellation(seededOrder.result.orderId, "REJECTED", `CONFLICTING_CANCEL_${seed}`, 3), /FAKEBROKER_EVENT_SEQUENCE_CONFLICT/u,
      `seed ${seed} rejects a different event reusing the accepted cancellation sequence`);
    const afterReplay = await pool.query(`SELECT o.status,
      (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=o.order_id) AS fills,
      (SELECT COALESCE(sum(quantity),0)::int FROM fake_broker_fills WHERE order_id=o.order_id) AS quantity,
      (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='FILL_POST') AS fill_events
      FROM fake_broker_orders o WHERE o.order_id=$1`, [seededOrder.result.orderId]);
    assert.deepEqual(afterReplay.rows[0], { status: "CANCELLED", fills: 2, quantity: 125, fill_events: 2 },
      `seed ${seed} event replay/conflict cannot duplicate business facts`);
    seededMixedArrivalMatrix.push({ seed, injectedArrivalSequence: observed, orderId: seededOrder.result.orderId, status: mixedState.rows[0].status, cursor: mixedState.rows[0].last_sequence });
  }
  assert.equal(new Set(seededMixedArrivalMatrix.map((run) => run.injectedArrivalSequence.map((event) => event.sequence).join(""))).size, 6,
    "the 24 deterministic mixed-event seeds exercise all six Fill/Fill/cancellation arrival permutations");
  console.log(`[FakeBroker seeded Fill/cancellation arrivals] ${JSON.stringify({ runs: seededMixedArrivalMatrix.length, permutations: [...new Set(seededMixedArrivalMatrix.map((run) => run.injectedArrivalSequence.map((event) => event.sequence).join("")))].sort(), injections: seededMixedArrivalMatrix })}`);
  const reportFirstCommand = { ...command, clientOrderId: `report-before-cancel-ack-${randomUUID()}`, reservation: { ...command.reservation, reservationId: randomUUID() } };
  reportFirstCommand.reservation.clientOrderId = reportFirstCommand.clientOrderId;
  const reportFirstOrder = await repository.execute(reportFirstCommand);
  const reportFirstBase = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [reportFirstOrder.result.orderId]);
  const reportFirstBaseClaim = await repository.claimOutbox(reportFirstBase.rows[0].event_id);
  await repository.markFillDelivered(reportFirstBase.rows[0].event_id, reportFirstBaseClaim.claim_token);
  await repository.cancel(reportFirstOrder.result.orderId);
  const reportFirstInput = { externalFillId: randomUUID(), sequence: 1, cumulativeQuantity: 75, price: "10.2000", fee: "0.0100", effectiveAt: "2026-09-25T01:33:00.000Z", evidenceRef: `fixed-fault:${reportFirstOrder.result.orderId}:fill-before-cancel-ack` };
  const reportBeforeAck = await repository.recordSimulatedFillReport(reportFirstOrder.result.orderId, reportFirstInput);
  assert.equal(reportBeforeAck.totalFilledQuantity, 75, "a cumulative broker report received while cancellation is pending must convert to the exact new increment");
  assert.equal(reportBeforeAck.incrementalQuantity, 25);
  await assert.rejects(repository.recordSimulatedFillReport(reportFirstOrder.result.orderId, { ...reportFirstInput, sequence: 2, externalFillId: randomUUID(), cumulativeQuantity: 70 }), /SIMULATED_FILL_CUMULATIVE_REGRESSION/u);
  await assert.rejects(repository.recordSimulatedFillReport(reportFirstOrder.result.orderId, { ...reportFirstInput, sequence: 2, externalFillId: randomUUID(), cumulativeQuantity: 101 }), /SIMULATED_FILL_EXCEEDS_REMAINING/u);
  const noDeltaReport = await repository.recordSimulatedFillReport(reportFirstOrder.result.orderId, { ...reportFirstInput, sequence: 2, externalFillId: randomUUID(), cumulativeQuantity: 75 });
  assert.equal(noDeltaReport.incrementalQuantity, 0, "repeated cumulative quantity is recorded without producing a duplicate Fill or outbox side effect");
  assert.equal(noDeltaReport.eventId, null);
  const reportBeforeAckCancel = await repository.resolveCancellation(reportFirstOrder.result.orderId, "ACCEPTED", "SIMULATED_FAKEBROKER_CANCEL_ACCEPTED_AFTER_FILL", 3);
  assert.equal(reportBeforeAckCancel?.status, "CANCELLED");
  const reportBeforeAckFills = await pool.query("SELECT count(*)::int AS fills,COALESCE(sum(quantity),0)::text AS quantity FROM fake_broker_fills WHERE order_id=$1", [reportFirstOrder.result.orderId]);
  assert.deepEqual(reportBeforeAckFills.rows[0], { fills: 2, quantity: "75" });
  const reportReplay = await repository.recordSimulatedFillReport(reportFirstOrder.result.orderId, reportFirstInput);
  assert.equal(reportReplay.replayed, true, "cumulative correction reports replay by stable external fill ID");
  const reportFirstEvents = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND status='PENDING' ORDER BY created_at", [reportFirstOrder.result.orderId]);
  for (const event of reportFirstEvents.rows) {
    const claim = await repository.claimOutbox(event.event_id);
    assert.ok(claim);
    await repository.markFillDelivered(event.event_id, claim.claim_token);
  }
  const reportFirstResolution = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [reportFirstOrder.result.orderId]);
  assert.equal(reportFirstResolution.rowCount, 1, "remainder release follows all fill acknowledgements");
  const reportFirstResolutionClaim = await repository.claimReservationResolutionOutbox(reportFirstResolution.rows[0].event_id);
  assert.ok(reportFirstResolutionClaim);
  await repository.markReservationResolutionDelivered(reportFirstResolution.rows[0].event_id, reportFirstResolutionClaim.claim_token);

  const pendingRaceFillEvents = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND status='PENDING' ORDER BY created_at", [fillRaceOrder.result.orderId]);
  for (const event of pendingRaceFillEvents.rows) {
    const claim = await repository.claimOutbox(event.event_id);
    assert.ok(claim);
    await repository.markFillDelivered(event.event_id, claim.claim_token);
  }
  const raceResolution = await pool.query("SELECT event_id,payload FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [fillRaceOrder.result.orderId]);
  assert.equal(raceResolution.rowCount, 1, "accepted cancel produces one durable reservation release after every authoritative Fill posts");
  assert.equal(raceResolution.rows[0].payload.outcome, "CANCELLED");
  const raceResolutionClaim = await repository.claimReservationResolutionOutbox(raceResolution.rows[0].event_id);
  assert.ok(raceResolutionClaim);
  await repository.markReservationResolutionDelivered(raceResolution.rows[0].event_id, raceResolutionClaim.claim_token);

  await pool.end();
  pool = new Pool({ connectionString });
  const reopened = new PostgresFakeBrokerRepository(pool);
  const replayAfterReconnect = await reopened.execute(command);
  assert.equal(replayAfterReconnect.replayed, true);
  assert.equal(replayAfterReconnect.result.status, "CANCELLED");
  assert.deepEqual(replayAfterReconnect.result.fill, original.result.fill, "replay after cancel must retain the original authoritative partial Fill");
  const externalOnly = { namespace, externalOrderId: `fixture-external-${randomUUID()}`, clientOrderId: `fixture-client-${randomUUID()}`, security: "600000.SH", requestedQuantity: 100, status: "UNKNOWN", evidenceRef: "fixture:independent-external-order:missing-local", observedAt: "2026-09-25T01:40:00.000Z" };
  assert.equal((await reopened.recordSimulatedExternalOrder(externalOnly)).replayed, false);
  assert.equal((await reopened.recordSimulatedExternalOrder(externalOnly)).replayed, true, "same external order observation is idempotent");
  await assert.rejects(reopened.recordSimulatedExternalOrder({ ...externalOnly, status: "CANCELLED" }), /SIMULATED_EXTERNAL_ORDER_CONFLICT/u);
  const discrepancy = await reopened.reconciliationSummary(namespace);
  assert.equal(discrepancy.externalOnlyOrderCount, 1, "independent broker-side order missing locally is reconciled as a discrepancy");
  assert.equal(discrepancy.discrepancies[0].kind, "EXTERNAL_ORDER_MISSING_LOCALLY");
  assert.equal(discrepancy.discrepancies[0].externalOrderId, externalOnly.externalOrderId);
  const c5RunId=randomUUID(),c5AccountId=randomUUID(),c5OwnerId=`c5-owner-${randomUUID()}`,c5Namespace=`v24-paper-v2-${c5RunId}`,c5ClientOrderId=`v24-fixture-v2-${c5RunId}-20240104`,c5MandateId=randomUUID(),c5MandateReservationId=randomUUID(),c5ResourceReservationId=randomUUID(); c5NamespaceForCleanup=c5Namespace;
  const c5Auth={mandateId:c5MandateId,mandateVersion:1,ownerId:c5OwnerId,accountId:c5AccountId,namespace:c5Namespace,testRunId:c5RunId,targetId:"c5-target-20240104",clientOrderId:c5ClientOrderId,evaluatedAt:"2024-01-04T09:31:50+08:00",commandHash:"a".repeat(64),reservationId:c5MandateReservationId,proposal:{proposalId:randomUUID(),proposalVersion:1,contentHash:"b".repeat(64),ownerId:c5OwnerId,testRunId:c5RunId,accountId:c5AccountId,strategyVersion:"2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8",operation:"REBALANCE",market:"CN_A",currency:"CNY",legs:[{securityId:"600000.SH",side:"BUY",quantity:100,limitPrice:"10.25",estimatedFee:"5.00"}]},priceEvidence:{targetId:"c5-target-20240104",clientOrderId:c5ClientOrderId,snapshotId:"c5-snapshot-20240104",side:"BUY",quantity:100,price:"10.25",fee:"5.00",budgetAmount:"1030.00",quoteAgeSeconds:15,deviationBps:0,observedAt:"2024-01-04T09:31:35+08:00"}};
  const c5LedgerFills=[];
  const c5Portfolio={reserveAccountResources:async()=>({reservation:{reservationId:c5ResourceReservationId},replayed:true}),resolveAccountReservation:async()=>({reservationId:c5ResourceReservationId}),recordAccountFill:async(account,fill)=>{c5LedgerFills.push({account,fill});return {replayed:false};}};
  const c5Mandates={authorizeOrder:async()=>({status:200,body:{decision:{status:"AUTHORIZED",reservedAmount:"1030.00"},reservationId:c5MandateReservationId}}),settleReservation:async(_id,body)=>({status:200,body:{status:body.outcome}})};
  const c5Service=new C5LocalPaperExecutionService(reopened,c5Portfolio,c5Mandates,new FillOutboxDelivery(reopened,c5Portfolio));
  const c5First=await c5Service.execute({authorization:c5Auth}),c5Replay=await c5Service.execute({authorization:c5Auth});
  assert.equal(c5First.status,"FILLED"); assert.equal(c5First.replayed,false); assert.equal(c5Replay.replayed,true); assert.equal(c5First.order.orderId,c5Replay.order.orderId);
  assert.equal(c5LedgerFills.length,1,"replayed C5 execution must not post the Fill twice"); assert.equal(c5LedgerFills[0].account,c5AccountId);
  const c5Assets=await reopened.independentAssetSnapshot(c5Namespace,c5AccountId); assert.equal(c5Assets.current_cash,"8970.0000"); assert.deepEqual(c5Assets.positions,[{security:"600000.SH",quantity:100}]);
  const c5Counts=await pool.query(`SELECT (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1) AS orders,(SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1) AS fills,(SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1) AS outbox`,[c5Namespace]); assert.deepEqual(c5Counts.rows[0],{orders:1,fills:1,outbox:1}); assert.equal(c5Replay.outbox.status,"DELIVERED");
  console.log(JSON.stringify({ concurrentSameKey: "one order/fill/event/outbox", stableFakeBrokerOrderId: { publicField: "orderId", firstResult: first.result.orderId, concurrentRetryResult: concurrentReplay.result.orderId, reconnectRetryResult: replayAfterReconnect.result.orderId, identicalAcrossRetries: first.result.orderId === concurrentReplay.result.orderId && first.result.orderId === replayAfterReconnect.result.orderId }, changedQuantity: "409, no side effect", changedPrice: "409, no side effect", legacyRowWithoutFingerprint: "409, no side effect", outboxReservationBinding: "side/currency/reservation persisted", partialFillCancellation: "duplicate requests idempotent; accepted result closes remainder; rejected result restores PARTIALLY_FILLED; late result ignored; fill/outbox preserved", competingCancelResults: { sameSequenceConflict: true, exactlyOnePayloadAccepted: true, reservationReleaseWaitsForFill: true }, cancellationReservationOutbox: "durable CANCELLED resolution enqueued only after every partial Fill delivery; claim and acknowledgement delivered", fillDuringCancelRace: { laterCancelArrivesBeforeEarlierFill: true, bufferedWithoutStateChange: true, missingSequenceArrivalDrainsInOrder: true, postAckFillFenced: true, cumulativeToIncremental: true, cumulativeRegressionRejected: true, overfillRejected: true, noDeltaReportNoFill: true, idempotentReportReplay: true, reservationReleaseWaitsForAllFills: true }, fillCausalSequence: { testRunId: causalCommand.reservation.testRunId, orderId: causalOrder.result.orderId, sequence2Buffered: true, replayed10Times: true, sequence1DrainsBoth: true, cumulativeFrom100To150: true, incrementalSequence1: 0, incrementalSequence2: 50, authoritativeCashCny: expectedCausalCash, fillFactsAndOutboxExactlyOnce: true }, seededFillCausalMatrix: { runs: seededArrivalMatrix.length, permutations: [...new Set(seededArrivalMatrix.map((run) => run.injectedArrivalSequence.join("")))].sort(), injections: seededArrivalMatrix }, feeCorrection: "sequential revisions, idempotent replay, pending barrier, durable delivery, original Fill immutable", externalOrderReconciliation: "independent durable broker-side observation, replay conflict isolation, missing-local discrepancy surfaced", reconnectReplay: "current CANCELLED state plus original partial Fill", brokerMode: "FAKE" }, null, 2));
} catch (error) {
  if (!databaseReady) {
    console.error(error instanceof Error ? error.message : error);
    console.error("isolated trade-execution test database is unreachable; start the local PostgreSQL test service or set TRADE_EXECUTION_TEST_DATABASE_URL");
    process.exitCode = 2;
  } else {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
} finally {
  if (databaseReady && namespaceMigrated) {
    try {
      await pool.query("DELETE FROM fake_broker_external_orders WHERE namespace=$1", [namespace]);
      await pool.query(`DELETE FROM fake_broker_simulated_reports r USING fake_broker_orders o WHERE r.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_fee_corrections c USING fake_broker_fills f, fake_broker_orders o WHERE c.external_fill_id=f.external_fill_id AND f.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query("DELETE FROM fake_broker_sell_receivables WHERE namespace=$1", [namespace]);
      await pool.query(`DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_authoritative_event_inbox e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_order_event_sequences s USING fake_broker_orders o WHERE s.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
      if(c5NamespaceForCleanup){
        await pool.query("DELETE FROM fake_broker_external_orders WHERE namespace=$1",[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query("DELETE FROM fake_broker_sell_receivables WHERE namespace=$1",[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_asset_events e USING fake_broker_orders o WHERE e.namespace=o.namespace AND e.account_id=o.account_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_authoritative_event_inbox e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query(`DELETE FROM fake_broker_order_event_sequences s USING fake_broker_orders o WHERE s.order_id=o.order_id AND o.namespace=$1`,[c5NamespaceForCleanup]);
        await pool.query("DELETE FROM fake_broker_orders WHERE namespace=$1",[c5NamespaceForCleanup]);
        await pool.query("DELETE FROM fake_broker_positions WHERE namespace=$1",[c5NamespaceForCleanup]);
        await pool.query("DELETE FROM fake_broker_account_assets WHERE namespace=$1",[c5NamespaceForCleanup]);
      }
    } catch (error) {
      console.error("isolated FakeBroker test namespace cleanup failed", error);
      process.exitCode = 1;
    }
  }
  await pool.end().catch((error) => { console.error("test database connection close failed", error); process.exitCode = 1; });
}
