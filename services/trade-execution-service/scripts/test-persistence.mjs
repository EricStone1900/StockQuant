import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";

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
const namespace = `test-p5-idempotency-${randomUUID()}`;
const accountId = randomUUID();
const command = {
  namespace,
  accountId,
  clientOrderId: `order-${randomUUID()}`,
  security: "600000.SH",
  side: "SELL",
  currency: "CNY",
  reservation: { reservationId: randomUUID(), ownerId: "test-owner", testRunId: randomUUID(), clientOrderId: `order-${randomUUID()}` },
  requestedQuantity: 100,
  bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 500 }
};
command.reservation.clientOrderId = command.clientOrderId;

try {
  await pool.query("SELECT 1");
  databaseReady = true;
  const repository = new PostgresFakeBrokerRepository(pool);
  await repository.migrate();
  namespaceMigrated = true;
  const [first, concurrentReplay] = await Promise.all([repository.execute(command), repository.execute(command)]);
  assert.equal([first, concurrentReplay].filter((result) => !result.replayed).length, 1);
  assert.equal([first, concurrentReplay].filter((result) => result.replayed).length, 1);
  const original = first.replayed ? concurrentReplay : first;
  assert.equal(original.result.status, "PARTIALLY_FILLED");
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
  assert.deepEqual(rows.rows[0], { orders: 2, fills: 1, events: 1, outbox: 1 });
  const outbox = await pool.query("SELECT payload FROM fake_broker_outbox WHERE order_id=$1", [original.result.orderId]);
  assert.deepEqual({ side: outbox.rows[0].payload.side, currency: outbox.rows[0].payload.currency, reservation: outbox.rows[0].payload.reservation }, { side: "SELL", currency: "CNY", reservation: command.reservation });

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
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [original.result.orderId])).rows[0].count, 0, "reservation resolution must wait for the already-persisted Fill to post to Portfolio");
  const fillOutbox = await repository.pendingOutbox();
  const eventRow = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST'", [original.result.orderId]);
  assert.ok(fillOutbox.some((event) => event.event_id === eventRow.rows[0].event_id));
  const fillClaim = await repository.claimOutbox(eventRow.rows[0].event_id);
  assert.ok(fillClaim);
  await repository.markFillDelivered(eventRow.rows[0].event_id, fillClaim.claim_token);
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
  console.log(JSON.stringify({ concurrentSameKey: "one order/fill/event/outbox", changedQuantity: "409, no side effect", changedPrice: "409, no side effect", legacyRowWithoutFingerprint: "409, no side effect", outboxReservationBinding: "side/currency/reservation persisted", partialFillCancellation: "duplicate requests idempotent; accepted result closes remainder; rejected result restores PARTIALLY_FILLED; late result ignored; fill/outbox preserved", competingCancelResults: { sameSequenceConflict: true, exactlyOnePayloadAccepted: true, reservationReleaseWaitsForFill: true }, cancellationReservationOutbox: "durable CANCELLED resolution enqueued only after every partial Fill delivery; claim and acknowledgement delivered", fillDuringCancelRace: { laterCancelArrivesBeforeEarlierFill: true, bufferedWithoutStateChange: true, missingSequenceArrivalDrainsInOrder: true, postAckFillFenced: true, cumulativeToIncremental: true, cumulativeRegressionRejected: true, overfillRejected: true, noDeltaReportNoFill: true, idempotentReportReplay: true, reservationReleaseWaitsForAllFills: true }, feeCorrection: "sequential revisions, idempotent replay, pending barrier, durable delivery, original Fill immutable", externalOrderReconciliation: "independent durable broker-side observation, replay conflict isolation, missing-local discrepancy surfaced", reconnectReplay: "current CANCELLED state plus original partial Fill", brokerMode: "FAKE" }, null, 2));
} catch (error) {
  if (!databaseReady) {
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
      await pool.query(`DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_authoritative_event_inbox e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_order_event_sequences s USING fake_broker_orders o WHERE s.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
    } catch (error) {
      console.error("isolated FakeBroker test namespace cleanup failed", error);
      process.exitCode = 1;
    }
  }
  await pool.end().catch((error) => { console.error("test database connection close failed", error); process.exitCode = 1; });
}
