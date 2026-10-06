import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";
import type { FakeBrokerOutboxPort } from "../ports/fake-broker-outbox.js";
import { calculateHistoricalExecution, historicalExecutionFingerprint, IdempotencyConflictError, validateExecutionReservation, type HistoricalExecutionCommand, type HistoricalExecutionResult, type SnapshotPaperExecutionCommand } from "../domain/historical-execution.js";
import { acceptFakeBrokerEvent, type FakeBrokerEventSequenceState } from "../domain/fake-broker-event-sequencer.js";

export class PostgresFakeBrokerRepository implements FakeBrokerOutboxPort {
  constructor(private readonly pool: Pool) {}
  async migrate() { await this.pool.query(`
    CREATE TABLE IF NOT EXISTS fake_broker_orders (
        order_id UUID PRIMARY KEY, namespace TEXT NOT NULL, account_id UUID NOT NULL, client_order_id TEXT NOT NULL,
        security TEXT NOT NULL, requested_quantity BIGINT NOT NULL, status TEXT NOT NULL, rejection_reason TEXT,
        request_fingerprint TEXT, cancel_prior_status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(namespace, client_order_id)
    );
    CREATE TABLE IF NOT EXISTS fake_broker_external_orders (
      external_order_id TEXT NOT NULL, namespace TEXT NOT NULL, client_order_id TEXT,
      security TEXT NOT NULL, requested_quantity BIGINT NOT NULL CHECK (requested_quantity > 0),
      status TEXT NOT NULL, evidence_ref TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL,
      fingerprint TEXT NOT NULL, PRIMARY KEY(namespace, external_order_id)
    );
      ALTER TABLE fake_broker_orders ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;
      ALTER TABLE fake_broker_orders ADD COLUMN IF NOT EXISTS cancel_prior_status TEXT;
    CREATE TABLE IF NOT EXISTS fake_broker_fills (
      external_fill_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id), quantity BIGINT NOT NULL,
      price NUMERIC(20,4) NOT NULL, fee NUMERIC(20,4) NOT NULL DEFAULT 0, original_fee NUMERIC(20,4), fee_revision INTEGER NOT NULL DEFAULT 0,
      effective_at TIMESTAMPTZ NOT NULL, UNIQUE(order_id)
    );
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS fee NUMERIC(20,4) NOT NULL DEFAULT 0;
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS original_fee NUMERIC(20,4);
    UPDATE fake_broker_fills SET original_fee=fee WHERE original_fee IS NULL;
    ALTER TABLE fake_broker_fills ALTER COLUMN original_fee SET NOT NULL;
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS fee_revision INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE fake_broker_fills DROP CONSTRAINT IF EXISTS fake_broker_fills_order_id_key;
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS broker_sequence BIGINT;
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS report_fingerprint TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS fake_broker_fills_order_sequence_unique ON fake_broker_fills(order_id,broker_sequence) WHERE broker_sequence IS NOT NULL;
    CREATE TABLE IF NOT EXISTS fake_broker_order_events (
      event_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id), status TEXT NOT NULL,
      reason TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS fake_broker_outbox (
      event_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id),
      event_type TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERING','DELIVERED','COMPENSATION_REQUIRED')),
      attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      delivered_at TIMESTAMPTZ, claim_token UUID, lease_until TIMESTAMPTZ, UNIQUE(order_id,event_type)
    );
    ALTER TABLE fake_broker_outbox DROP CONSTRAINT IF EXISTS fake_broker_outbox_order_id_event_type_key;
    CREATE UNIQUE INDEX IF NOT EXISTS fake_broker_outbox_resolution_unique ON fake_broker_outbox(order_id) WHERE event_type='RESERVATION_RESOLVE';
    ALTER TABLE fake_broker_outbox ADD COLUMN IF NOT EXISTS claim_token UUID;
    ALTER TABLE fake_broker_outbox ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
    ALTER TABLE fake_broker_outbox DROP CONSTRAINT IF EXISTS fake_broker_outbox_status_check;
    ALTER TABLE fake_broker_outbox ADD CONSTRAINT fake_broker_outbox_status_check CHECK (status IN ('PENDING','DELIVERING','DELIVERED','COMPENSATION_REQUIRED'));
    CREATE TABLE IF NOT EXISTS fake_broker_simulated_reports (
      external_fill_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id),
      broker_sequence BIGINT NOT NULL, cumulative_quantity BIGINT NOT NULL, incremental_quantity BIGINT NOT NULL,
      report_fingerprint TEXT NOT NULL, evidence_ref TEXT NOT NULL, effective_at TIMESTAMPTZ NOT NULL,
      event_id UUID UNIQUE REFERENCES fake_broker_outbox(event_id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(order_id,broker_sequence)
    );
    CREATE TABLE IF NOT EXISTS fake_broker_order_event_sequences (
      order_id UUID PRIMARY KEY REFERENCES fake_broker_orders(order_id),
      last_applied_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_applied_sequence >= 0)
    );
    INSERT INTO fake_broker_order_event_sequences(order_id,last_applied_sequence)
      SELECT order_id,MAX(broker_sequence) FROM fake_broker_simulated_reports GROUP BY order_id
      ON CONFLICT(order_id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS fake_broker_authoritative_event_inbox (
      order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id), broker_sequence BIGINT NOT NULL CHECK (broker_sequence > 0),
      event_type TEXT NOT NULL CHECK (event_type IN ('FILL_REPORT','CANCEL_RESULT')),
      payload JSONB NOT NULL, fingerprint TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_at TIMESTAMPTZ, PRIMARY KEY(order_id,broker_sequence)
    );
    INSERT INTO fake_broker_authoritative_event_inbox(order_id,broker_sequence,event_type,payload,fingerprint,created_at,applied_at)
      SELECT order_id,broker_sequence,'FILL_REPORT',jsonb_build_object('externalFillId',external_fill_id,'sequence',broker_sequence,
        'cumulativeQuantity',cumulative_quantity,'effectiveAt',effective_at,'evidenceRef',evidence_ref),report_fingerprint,created_at,created_at
      FROM fake_broker_simulated_reports ON CONFLICT(order_id,broker_sequence) DO NOTHING;
    CREATE TABLE IF NOT EXISTS fake_broker_fee_corrections (
      external_fill_id UUID NOT NULL REFERENCES fake_broker_fills(external_fill_id), revision INTEGER NOT NULL CHECK (revision > 0),
      previous_fee NUMERIC(20,4) NOT NULL, corrected_fee NUMERIC(20,4) NOT NULL, effective_at TIMESTAMPTZ NOT NULL,
      evidence_ref TEXT NOT NULL, event_id UUID NOT NULL UNIQUE REFERENCES fake_broker_outbox(event_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(external_fill_id,revision)
    );
  `); }
  async execute(command: HistoricalExecutionCommand): Promise<{ result: HistoricalExecutionResult; replayed: boolean }> {
    validateExecutionReservation(command);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [command.namespace, command.clientOrderId]);
      const requestFingerprint = historicalExecutionFingerprint(command);
      const existing = await client.query<any>(`SELECT o.order_id, o.status, o.rejection_reason, o.request_fingerprint, f.external_fill_id, f.quantity, f.price::text, f.original_fee::text AS fee, f.effective_at
        FROM fake_broker_orders o LEFT JOIN LATERAL (SELECT * FROM fake_broker_fills WHERE order_id=o.order_id ORDER BY effective_at,external_fill_id LIMIT 1) f ON true WHERE o.namespace=$1 AND o.client_order_id=$2 FOR UPDATE OF o`, [command.namespace, command.clientOrderId]);
      if (existing.rowCount === 1) {
        const row = existing.rows[0];
        if (row.request_fingerprint !== requestFingerprint) throw new IdempotencyConflictError();
        await client.query("COMMIT");
        return { replayed: true, result: row.external_fill_id ? { orderId: row.order_id, status: row.status, brokerMode: "FAKE", fill: { externalFillId: row.external_fill_id, quantity: Number(row.quantity), price: row.price, fee: row.fee, effectiveAt: row.effective_at.toISOString() } } : { orderId: row.order_id, status: row.status, brokerMode: "FAKE", rejectionReason: row.rejection_reason } as HistoricalExecutionResult };
      }
      const result = calculateHistoricalExecution(command, { orderId: randomUUID(), externalFillId: randomUUID() });
      await client.query(`INSERT INTO fake_broker_orders (order_id,namespace,account_id,client_order_id,security,requested_quantity,status,rejection_reason,request_fingerprint)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [result.orderId, command.namespace, command.accountId, command.clientOrderId, command.security, command.requestedQuantity, result.status, result.rejectionReason ?? null, requestFingerprint]);
      if (result.fill) await client.query(`INSERT INTO fake_broker_fills (external_fill_id,order_id,quantity,price,fee,original_fee,effective_at) VALUES ($1,$2,$3,$4,$5,$5,$6)`, [result.fill.externalFillId, result.orderId, result.fill.quantity, result.fill.price, result.fill.fee, result.fill.effectiveAt]);
      await client.query("INSERT INTO fake_broker_order_events (event_id,order_id,status,reason) VALUES ($1,$2,$3,$4)", [randomUUID(), result.orderId, result.status, result.rejectionReason ?? null]);
      if (result.fill) await client.query(`INSERT INTO fake_broker_outbox (event_id,order_id,event_type,payload) VALUES ($1,$2,'FILL_POST', $3::jsonb)`, [randomUUID(), result.orderId, JSON.stringify({ ...result.fill, accountId: command.accountId, namespace: command.namespace, security: command.security, side: command.side ?? "BUY", currency: command.currency ?? "CNY", ...(command.reservation ? { reservation: command.reservation, ...(result.status === "FILLED" ? { reservationOutcome: "FILLED" } : {}) } : {}) })]);
      await client.query("COMMIT"); return { result, replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async executeSnapshotPaper(command: SnapshotPaperExecutionCommand): Promise<{ result: HistoricalExecutionResult; replayed: boolean }> {
    validateExecutionReservation({ ...command, bar: { timestamp: command.effectiveAt, open: command.price, volume: command.requestedQuantity } });
    if (!command.namespace || !command.accountId || !command.clientOrderId || !/^[A-Z0-9.]{3,20}$/u.test(command.security) ||
        !Number.isSafeInteger(command.requestedQuantity) || command.requestedQuantity <= 0 ||
        !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.price) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.fee) ||
        !/^[A-Z]{3}$/u.test(command.currency) || !command.snapshotId || command.fixtureVersion !== "2.0.0" ||
        !/(?:Z|[+-]\d{2}:\d{2})$/u.test(command.effectiveAt) || !command.policyVersion) throw new Error("INVALID_SNAPSHOT_PAPER_EXECUTION");
    const fingerprint = createHash("sha256").update(JSON.stringify({ ...command, reservation: { ...command.reservation } })).digest("hex");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [command.namespace, command.clientOrderId]);
      const existing = await client.query<any>(`SELECT o.order_id,o.status,o.request_fingerprint,o.requested_quantity,f.external_fill_id,f.quantity,f.price::text,f.original_fee::text AS fee,f.effective_at
        FROM fake_broker_orders o LEFT JOIN LATERAL (SELECT * FROM fake_broker_fills WHERE order_id=o.order_id ORDER BY effective_at,external_fill_id LIMIT 1) f ON true WHERE o.namespace=$1 AND o.client_order_id=$2 FOR UPDATE OF o`, [command.namespace, command.clientOrderId]);
      if (existing.rowCount === 1) {
        const row = existing.rows[0];
        if (row.request_fingerprint !== fingerprint) throw new IdempotencyConflictError();
        await client.query("COMMIT");
        return { replayed: true, result: row.external_fill_id ? { orderId: row.order_id, status: Number(row.quantity) >= Number(row.requested_quantity) ? "FILLED" : "PARTIALLY_FILLED", brokerMode: "FAKE", fill: { externalFillId: row.external_fill_id, quantity: Number(row.quantity), price: row.price, fee: row.fee, effectiveAt: row.effective_at.toISOString() } } : { orderId: row.order_id, status: row.status, brokerMode: "FAKE" } as HistoricalExecutionResult };
      }
      const orderId = randomUUID();
      const externalFillId = randomUUID();
      const result: HistoricalExecutionResult = { orderId, status: "FILLED", brokerMode: "FAKE", fill: { externalFillId, quantity: command.requestedQuantity, price: command.price, fee: command.fee, effectiveAt: command.effectiveAt } };
      await client.query(`INSERT INTO fake_broker_orders(order_id,namespace,account_id,client_order_id,security,requested_quantity,status,request_fingerprint)
        VALUES($1,$2,$3,$4,$5,$6,'LEDGER_PENDING',$7)`, [orderId, command.namespace, command.accountId, command.clientOrderId, command.security, command.requestedQuantity, fingerprint]);
      await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,'ACCEPTED','SNAPSHOT_PAPER_ORDER')", [randomUUID(), orderId]);
      await client.query("INSERT INTO fake_broker_fills(external_fill_id,order_id,quantity,price,fee,original_fee,effective_at) VALUES($1,$2,$3,$4,$5,$5,$6)", [externalFillId, orderId, command.requestedQuantity, command.price, command.fee, command.effectiveAt]);
      await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,'LEDGER_PENDING','FIRST_QUALIFYING_SNAPSHOT')", [randomUUID(), orderId]);
      await client.query("INSERT INTO fake_broker_outbox(event_id,order_id,event_type,payload) VALUES($1,$2,'FILL_POST',$3::jsonb)", [randomUUID(), orderId, JSON.stringify({ accountId: command.accountId, namespace: command.namespace, security: command.security, externalFillId, quantity: command.requestedQuantity, price: command.price, fee: command.fee, effectiveAt: command.effectiveAt, side: "BUY", currency: command.currency, reservation: command.reservation, reservationOutcome: "FILLED", snapshotId: command.snapshotId, policyVersion: command.policyVersion, fixtureVersion: command.fixtureVersion, quoteAgeSeconds: command.quoteAgeSeconds, deviationBps: command.deviationBps, testRunId: command.testRunId, ownerId: command.ownerId, mandateId: command.mandateId, mandateVersion: command.mandateVersion, strategyVersion: command.strategyVersion })]);
      await client.query("COMMIT");
      return { result, replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async recordSimulatedFillReport(orderId: string, input: { externalFillId: string; sequence: number; cumulativeQuantity: number; price: string; fee: string; effectiveAt: string; evidenceRef: string }) {
    if (!/^[0-9a-f-]{36}$/iu.test(input.externalFillId) || !Number.isSafeInteger(input.sequence) || input.sequence < 1 ||
      !Number.isSafeInteger(input.cumulativeQuantity) || input.cumulativeQuantity <= 0 ||
      !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(input.price) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(input.fee) ||
      !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.effectiveAt) || !Number.isFinite(Date.parse(input.effectiveAt)) ||
      !input.evidenceRef || input.evidenceRef.length > 512) throw new Error("INVALID_SIMULATED_FILL_REPORT");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<any>("SELECT * FROM fake_broker_orders WHERE order_id=$1 FOR UPDATE", [orderId]);
      const order = selected.rows[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");
      const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      await client.query("INSERT INTO fake_broker_order_event_sequences(order_id,last_applied_sequence) VALUES($1,0) ON CONFLICT(order_id) DO NOTHING", [orderId]);
      const prior = await client.query<any>("SELECT event_type,fingerprint,applied_at FROM fake_broker_authoritative_event_inbox WHERE order_id=$1 AND broker_sequence=$2", [orderId, input.sequence]);
      if (prior.rowCount && (prior.rows[0].event_type !== "FILL_REPORT" || prior.rows[0].fingerprint !== fingerprint)) throw new Error("FAKEBROKER_EVENT_SEQUENCE_CONFLICT");
      if (!prior.rowCount && !["ACCEPTED", "PARTIALLY_FILLED", "CANCEL_REQUESTED", "LEDGER_PENDING"].includes(order.status)) throw new Error("SIMULATED_FILL_ORDER_NOT_WORKING");
      const reusedFillId = await client.query("SELECT 1 FROM fake_broker_authoritative_event_inbox WHERE order_id=$1 AND event_type='FILL_REPORT' AND payload->>'externalFillId'=$2 AND broker_sequence<>$3", [orderId, input.externalFillId, input.sequence]);
      if (reusedFillId.rowCount) throw new Error("SIMULATED_FILL_IDEMPOTENCY_CONFLICT");
      const requestedSequence = input.sequence;
      const sequencing = await this.acceptAndReduceAuthoritativeEvent(client, order, input.sequence, "FILL_REPORT", input, fingerprint);
      const report = await client.query<any>("SELECT cumulative_quantity,incremental_quantity,event_id FROM fake_broker_simulated_reports WHERE order_id=$1 AND broker_sequence=$2", [orderId, requestedSequence]);
      await client.query("COMMIT");
      return { replayed: sequencing.replayed, buffered: sequencing.buffered, orderId, externalFillId: input.externalFillId,
        totalFilledQuantity: report.rowCount ? Number(report.rows[0].cumulative_quantity) : null,
        incrementalQuantity: report.rowCount ? Number(report.rows[0].incremental_quantity) : null,
        eventId: report.rows[0]?.event_id ?? null, lastAppliedSequence: sequencing.lastAppliedSequence };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  private async acceptAndReduceAuthoritativeEvent(client: import("pg").PoolClient, order: any, sequence: number, eventType: "FILL_REPORT" | "CANCEL_RESULT", payload: any, fingerprint: string) {
    await client.query("INSERT INTO fake_broker_order_event_sequences(order_id,last_applied_sequence) VALUES($1,0) ON CONFLICT(order_id) DO NOTHING", [order.order_id]);
    const cursorRow = await client.query<any>("SELECT last_applied_sequence FROM fake_broker_order_event_sequences WHERE order_id=$1 FOR UPDATE", [order.order_id]);
    const rows = await client.query<any>("SELECT broker_sequence,event_type,payload,fingerprint,applied_at FROM fake_broker_authoritative_event_inbox WHERE order_id=$1 ORDER BY broker_sequence", [order.order_id]);
    const pending = new Map<number, { sequence: number; fingerprint: string; payload: { eventType: "FILL_REPORT" | "CANCEL_RESULT"; payload: any } }>();
    const fingerprints = new Map<number, string>();
    for (const row of rows.rows) {
      const eventSequence = Number(row.broker_sequence);
      fingerprints.set(eventSequence, row.fingerprint);
      if (row.applied_at === null && eventSequence > Number(cursorRow.rows[0].last_applied_sequence)) {
        pending.set(eventSequence, { sequence: eventSequence, fingerprint: row.fingerprint, payload: { eventType: row.event_type, payload: row.payload } });
      }
    }
    const accepted = acceptFakeBrokerEvent({ lastAppliedSequence: Number(cursorRow.rows[0].last_applied_sequence), pending, fingerprints },
      { sequence, fingerprint, payload: { eventType, payload } });
    if (!accepted.replayed) await client.query(`INSERT INTO fake_broker_authoritative_event_inbox(order_id,broker_sequence,event_type,payload,fingerprint)
      VALUES($1,$2,$3,$4::jsonb,$5)`, [order.order_id, sequence, eventType, JSON.stringify(payload), fingerprint]);
    for (const event of accepted.applied) {
      if (event.payload.eventType === "FILL_REPORT") await this.applySequencedFillReport(client, order, event.payload.payload, event.fingerprint);
      else if (event.payload.eventType === "CANCEL_RESULT") await this.applySequencedCancellation(client, order, event.payload.payload);
      else throw new Error("FAKEBROKER_EVENT_INBOX_CORRUPT");
      await client.query("UPDATE fake_broker_authoritative_event_inbox SET applied_at=now() WHERE order_id=$1 AND broker_sequence=$2 AND applied_at IS NULL", [order.order_id, event.sequence]);
      await client.query("UPDATE fake_broker_order_event_sequences SET last_applied_sequence=$2 WHERE order_id=$1", [order.order_id, event.sequence]);
    }
    return { replayed: accepted.replayed, buffered: accepted.state.pending.has(sequence), lastAppliedSequence: accepted.state.lastAppliedSequence };
  }

  private async applySequencedFillReport(client: import("pg").PoolClient, order: any, input: any, fingerprint: string) {
    if (!["ACCEPTED", "PARTIALLY_FILLED", "CANCEL_REQUESTED", "LEDGER_PENDING"].includes(order.status)) throw new Error("SIMULATED_FILL_ORDER_NOT_WORKING");
    const prior = await client.query<any>("SELECT report_fingerprint FROM fake_broker_simulated_reports WHERE external_fill_id=$1 AND order_id=$2", [input.externalFillId, order.order_id]);
    if (prior.rowCount) {
      if (prior.rows[0].report_fingerprint !== fingerprint) throw new Error("SIMULATED_FILL_IDEMPOTENCY_CONFLICT");
      throw new Error("FAKEBROKER_EVENT_INBOX_CORRUPT");
    }
    const filled = await client.query<any>("SELECT COALESCE(SUM(quantity),0)::bigint AS quantity FROM fake_broker_fills WHERE order_id=$1", [order.order_id]);
    const previousCumulative = BigInt(filled.rows[0].quantity);
    const cumulativeQuantity = BigInt(input.cumulativeQuantity);
    if (cumulativeQuantity < previousCumulative) throw new Error("SIMULATED_FILL_CUMULATIVE_REGRESSION");
    if (cumulativeQuantity > BigInt(order.requested_quantity)) throw new Error("SIMULATED_FILL_EXCEEDS_REMAINING");
    const incrementalQuantity = cumulativeQuantity - previousCumulative;
    let eventId: string | null = null;
    if (incrementalQuantity > 0n) {
      const fillStatus = cumulativeQuantity >= BigInt(order.requested_quantity) ? "FILLED" : "PARTIALLY_FILLED";
      const baseOutbox = await client.query<any>("SELECT payload FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' ORDER BY created_at LIMIT 1", [order.order_id]);
      if (baseOutbox.rowCount !== 1) throw new Error("SIMULATED_FILL_CONTEXT_MISSING");
      eventId = randomUUID();
      await client.query(`INSERT INTO fake_broker_fills(external_fill_id,order_id,quantity,price,fee,original_fee,effective_at,broker_sequence,report_fingerprint)
        VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8)`, [input.externalFillId, order.order_id, Number(incrementalQuantity), input.price, input.fee, input.effectiveAt, input.sequence, fingerprint]);
      const basePayload = baseOutbox.rows[0].payload;
      const payload = { accountId: order.account_id, namespace: order.namespace, security: order.security, externalFillId: input.externalFillId,
        quantity: Number(incrementalQuantity), price: input.price, fee: input.fee, effectiveAt: input.effectiveAt,
        side: basePayload.side, currency: basePayload.currency, ...(basePayload.reservation ? { reservation: basePayload.reservation } : {}),
        ...(fillStatus === "FILLED" && basePayload.reservation ? { reservationOutcome: "FILLED" } : {}),
        simulatedReport: true, brokerSequence: input.sequence, cumulativeQuantity: input.cumulativeQuantity, evidenceRef: input.evidenceRef };
      await client.query("INSERT INTO fake_broker_outbox(event_id,order_id,event_type,payload) VALUES($1,$2,'FILL_POST',$3::jsonb)", [eventId, order.order_id, JSON.stringify(payload)]);
    }
    await client.query(`INSERT INTO fake_broker_simulated_reports(external_fill_id,order_id,broker_sequence,cumulative_quantity,incremental_quantity,report_fingerprint,evidence_ref,effective_at,event_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [input.externalFillId, order.order_id, input.sequence, input.cumulativeQuantity, Number(incrementalQuantity), fingerprint, input.evidenceRef, input.effectiveAt, eventId]);
    const reportStatus = order.status === "CANCEL_REQUESTED" ? order.status : incrementalQuantity > 0n ? "LEDGER_PENDING" : order.status;
    await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,$3,$4)", [randomUUID(), order.order_id, reportStatus, `SIMULATED_FILL_REPORT:${input.sequence}:${input.evidenceRef}`]);
    if (order.status !== "CANCEL_REQUESTED" && incrementalQuantity > 0n) {
      await client.query("UPDATE fake_broker_orders SET status='LEDGER_PENDING' WHERE order_id=$1", [order.order_id]);
      await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,'LEDGER_PENDING',$3)", [randomUUID(), order.order_id, `SIMULATED_FILL_PENDING:${input.sequence}`]);
      order.status = "LEDGER_PENDING";
    }
  }

  private async applySequencedCancellation(client: import("pg").PoolClient, order: any, input: any) {
    if (order.status !== "CANCEL_REQUESTED") throw new Error("SIMULATED_CANCEL_ORDER_NOT_PENDING");
    const fills = await client.query<any>("SELECT COALESCE(SUM(quantity),0)::text AS quantity FROM fake_broker_fills WHERE order_id=$1", [order.order_id]);
    const filledQuantity = BigInt(fills.rows[0].quantity);
    const requestedQuantity = BigInt(order.requested_quantity);
    const status = filledQuantity >= requestedQuantity ? "FILLED"
      : input.outcome === "ACCEPTED" ? "CANCELLED"
        : filledQuantity > 0n ? "PARTIALLY_FILLED" : order.cancel_prior_status ?? "ACCEPTED";
    const updated = await client.query<any>("UPDATE fake_broker_orders SET status=$2,cancel_prior_status=NULL WHERE order_id=$1 AND status='CANCEL_REQUESTED' RETURNING status", [order.order_id, status]);
    if (updated.rowCount !== 1) throw new Error("FAKEBROKER_EVENT_REDUCER_RACE");
    order.status = status;
    await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,$3,$4)", [randomUUID(), order.order_id, status, `CANCEL_${input.outcome}: ${input.reason}:SEQUENCE_${input.sequence}`]);
    if (status === "CANCELLED") {
      const fillOutbox = await client.query<any>("SELECT payload FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' ORDER BY created_at LIMIT 1", [order.order_id]);
      const pendingFills = await client.query<any>("SELECT 1 FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND status<>'DELIVERED' LIMIT 1", [order.order_id]);
      if (fillOutbox.rowCount === 1 && pendingFills.rowCount === 0 && fillOutbox.rows[0].payload.reservation) await this.insertCancellationReservationResolution(client, order.order_id, fillOutbox.rows[0].payload);
    }
  }

  async recordFeeCorrection(orderId: string, input: { externalFillId: string; revision: number; previousFee: string; correctedFee: string; effectiveAt: string; evidenceRef: string }) {
    if (!/^[0-9a-f-]{36}$/iu.test(input.externalFillId) || !Number.isSafeInteger(input.revision) || input.revision < 1 ||
      !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(input.previousFee) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(input.correctedFee) ||
      !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.effectiveAt) || !Number.isFinite(Date.parse(input.effectiveAt)) || !input.evidenceRef || input.evidenceRef.length > 512) {
      throw new Error("INVALID_FEE_CORRECTION");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const orderResult = await client.query<any>("SELECT order_id,account_id,status FROM fake_broker_orders WHERE order_id=$1 FOR UPDATE", [orderId]);
      const order = orderResult.rows[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");
      const duplicate = await client.query<any>(`SELECT c.previous_fee=$3::numeric AS previous_matches,c.corrected_fee=$4::numeric AS corrected_matches,
        c.effective_at=$5::timestamptz AS effective_matches,c.evidence_ref,o.status AS outbox_status,c.event_id
        FROM fake_broker_fee_corrections c JOIN fake_broker_outbox o ON o.event_id=c.event_id
        WHERE c.external_fill_id=$1 AND c.revision=$2`, [input.externalFillId, input.revision, input.previousFee, input.correctedFee, input.effectiveAt]);
      if (duplicate.rowCount) {
        const prior = duplicate.rows[0];
        if (!prior.previous_matches || !prior.corrected_matches || !prior.effective_matches || prior.evidence_ref !== input.evidenceRef) throw new Error("FEE_CORRECTION_IDEMPOTENCY_CONFLICT");
        await client.query("COMMIT");
        return { eventId: prior.event_id, status: prior.outbox_status, replayed: true };
      }
      const fillResult = await client.query<any>(`SELECT f.fee::text,f.fee_revision,f.order_id,
        (f.fee=$3::numeric) AS previous_matches FROM fake_broker_fills f
        WHERE f.external_fill_id=$1 AND f.order_id=$2 FOR UPDATE`, [input.externalFillId, orderId, input.previousFee]);
      const fill = fillResult.rows[0];
      if (!fill) throw new Error("FILL_NOT_FOUND");
      if (input.revision !== fill.fee_revision + 1 || !fill.previous_matches) throw new Error("FEE_CORRECTION_STALE_OR_OUT_OF_ORDER");
      const fillDelivery = await client.query<any>("SELECT status FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND payload->>'externalFillId'=$2", [orderId, input.externalFillId]);
      if (fillDelivery.rowCount !== 1 || fillDelivery.rows[0].status !== "DELIVERED") throw new Error("FILL_POST_NOT_DELIVERED");
      const pendingCorrection = await client.query<any>(`SELECT 1 FROM fake_broker_fee_corrections c JOIN fake_broker_outbox x ON x.event_id=c.event_id
        WHERE c.external_fill_id=$1 AND x.status<>'DELIVERED' LIMIT 1`, [input.externalFillId]);
      if (pendingCorrection.rowCount) throw new Error("FEE_CORRECTION_DELIVERY_PENDING");
      const eventId = randomUUID();
      const payload = { accountId: order.account_id, externalFillId: input.externalFillId, revision: input.revision,
        previousFee: input.previousFee, correctedFee: input.correctedFee, effectiveAt: input.effectiveAt, evidenceRef: input.evidenceRef };
      await client.query("UPDATE fake_broker_fills SET fee=$2::numeric,fee_revision=$3 WHERE external_fill_id=$1", [input.externalFillId, input.correctedFee, input.revision]);
      await client.query("INSERT INTO fake_broker_outbox(event_id,order_id,event_type,payload) VALUES($1,$2,'FEE_CORRECTION',$3::jsonb)", [eventId, orderId, JSON.stringify(payload)]);
      await client.query(`INSERT INTO fake_broker_fee_corrections(external_fill_id,revision,previous_fee,corrected_fee,effective_at,evidence_ref,event_id)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.externalFillId, input.revision, input.previousFee, input.correctedFee, input.effectiveAt, input.evidenceRef, eventId]);
      await client.query("INSERT INTO fake_broker_order_events(event_id,order_id,status,reason) VALUES($1,$2,$3,$4)", [randomUUID(), orderId, order.status, `FEE_CORRECTION:${input.revision}`]);
      await client.query("COMMIT");
      return { eventId, status: "PENDING", replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async find(orderId: string) { const result = await this.pool.query<any>("SELECT order_id,status,rejection_reason FROM fake_broker_orders WHERE order_id=$1", [orderId]); return result.rows[0] ?? null; }
  async findByNamespaceClientOrderId(namespace: string, clientOrderId: string) {
    const result = await this.pool.query<any>(`SELECT o.order_id,o.status,o.rejection_reason,o.client_order_id,
      f.external_fill_id,f.quantity AS fill_quantity,f.price::text AS fill_price,f.original_fee::text AS fill_fee,f.effective_at,
      x.event_id,x.event_type,x.status AS outbox_status,x.attempts,x.delivered_at,x.payload
      FROM fake_broker_orders o LEFT JOIN LATERAL (SELECT * FROM fake_broker_fills WHERE order_id=o.order_id ORDER BY effective_at,external_fill_id LIMIT 1) f ON true
      LEFT JOIN LATERAL (SELECT * FROM fake_broker_outbox WHERE order_id=o.order_id AND event_type='FILL_POST' ORDER BY created_at LIMIT 1) x ON true
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
    return result.rows[0] ?? null;
  }
  async reconciliationSummary(namespace: string) {
    const result = await this.pool.query<any>(`SELECT count(*)::int AS order_count, count(*) FILTER (WHERE status IN ('UNKNOWN','LEDGER_PENDING'))::int AS unresolved_order_count,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1) AS fill_count,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1 AND x.status <> 'DELIVERED') AS pending_outbox_count
      FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
    const external = await this.pool.query<any>(`SELECT e.external_order_id,e.client_order_id,e.security,e.requested_quantity::text,e.status,e.evidence_ref,e.observed_at
      FROM fake_broker_external_orders e LEFT JOIN fake_broker_orders o
        ON o.namespace=e.namespace AND ((e.client_order_id IS NOT NULL AND o.client_order_id=e.client_order_id) OR o.order_id::text=e.external_order_id)
      WHERE e.namespace=$1 AND o.order_id IS NULL ORDER BY e.external_order_id`, [namespace]);
    return { namespace, brokerMode: "FAKE", ...result.rows[0], externalOnlyOrderCount: external.rowCount ?? 0,
      discrepancies: external.rows.map((row) => ({ kind: "EXTERNAL_ORDER_MISSING_LOCALLY", externalOrderId: row.external_order_id,
        clientOrderId: row.client_order_id, security: row.security, requestedQuantity: Number(row.requested_quantity),
        status: row.status, evidenceRef: row.evidence_ref, observedAt: row.observed_at.toISOString() })) };
  }
  async recordSimulatedExternalOrder(input: { namespace: string; externalOrderId: string; clientOrderId?: string; security: string; requestedQuantity: number; status: string; evidenceRef: string; observedAt: string }) {
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const result = await this.pool.query<any>(`INSERT INTO fake_broker_external_orders
      (namespace,external_order_id,client_order_id,security,requested_quantity,status,evidence_ref,observed_at,fingerprint)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT(namespace,external_order_id) DO NOTHING RETURNING external_order_id`,
    [input.namespace,input.externalOrderId,input.clientOrderId ?? null,input.security,input.requestedQuantity,input.status,input.evidenceRef,input.observedAt,fingerprint]);
    if (result.rowCount === 1) return { replayed: false, externalOrderId: input.externalOrderId };
    const prior = await this.pool.query<any>("SELECT fingerprint FROM fake_broker_external_orders WHERE namespace=$1 AND external_order_id=$2", [input.namespace,input.externalOrderId]);
    if (prior.rows[0]?.fingerprint !== fingerprint) throw new Error("SIMULATED_EXTERNAL_ORDER_CONFLICT");
    return { replayed: true, externalOrderId: input.externalOrderId };
  }
  async cancel(orderId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<any>(`SELECT order_id,status,requested_quantity FROM fake_broker_orders WHERE order_id=$1 FOR UPDATE`, [orderId]);
      if (selected.rowCount !== 1) {
        await client.query("COMMIT");
        return null;
      }
      const order = selected.rows[0];
      const fills = await client.query<any>(`SELECT COALESCE(SUM(quantity),0)::text AS quantity FROM fake_broker_fills WHERE order_id=$1`, [orderId]);
      const filledQuantity = BigInt(fills.rows[0].quantity);
      const requestedQuantity = BigInt(order.requested_quantity);
      if (["FILLED", "REJECTED", "CANCELLED", "EXPIRED"].includes(order.status) || filledQuantity >= requestedQuantity) {
        await client.query("COMMIT");
        return null;
      }
      if (order.status === "CANCEL_REQUESTED") {
        await client.query("COMMIT");
        return { order_id: order.order_id, status: order.status };
      }
      const status = "CANCEL_REQUESTED";
      const updated = await client.query<any>(`UPDATE fake_broker_orders SET status=$2,cancel_prior_status=$3 WHERE order_id=$1 RETURNING order_id,status`, [orderId, status, order.status]);
      await client.query("INSERT INTO fake_broker_order_events (event_id,order_id,status) VALUES ($1,$2,$3)", [randomUUID(), orderId, status]);
      await client.query("COMMIT");
      return updated.rows[0] ?? null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async resolveCancellation(orderId: string, outcome: "ACCEPTED" | "REJECTED", reason: string, sequence: number) {
    if (!reason.trim() || reason.length > 500 || !Number.isSafeInteger(sequence) || sequence < 1) throw new Error("INVALID_SIMULATED_CANCEL_RESULT");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<any>("SELECT * FROM fake_broker_orders WHERE order_id=$1 FOR UPDATE", [orderId]);
      if (selected.rowCount !== 1) { await client.query("COMMIT"); return null; }
      const order = selected.rows[0];
      const input = { outcome, reason, sequence };
      const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      await client.query("INSERT INTO fake_broker_order_event_sequences(order_id,last_applied_sequence) VALUES($1,0) ON CONFLICT(order_id) DO NOTHING", [orderId]);
      const prior = await client.query<any>("SELECT event_type,fingerprint,applied_at FROM fake_broker_authoritative_event_inbox WHERE order_id=$1 AND broker_sequence=$2", [orderId, sequence]);
      if (prior.rowCount && (prior.rows[0].event_type !== "CANCEL_RESULT" || prior.rows[0].fingerprint !== fingerprint)) throw new Error("FAKEBROKER_EVENT_SEQUENCE_CONFLICT");
      if (!prior.rowCount && order.status !== "CANCEL_REQUESTED") throw new Error("SIMULATED_CANCEL_ORDER_NOT_PENDING");
      const sequencing = await this.acceptAndReduceAuthoritativeEvent(client, order, sequence, "CANCEL_RESULT", input, fingerprint);
      const current = await client.query<any>("SELECT order_id,status FROM fake_broker_orders WHERE order_id=$1", [orderId]);
      await client.query("COMMIT");
      return { ...current.rows[0], buffered: sequencing.buffered, replayed: sequencing.replayed, lastAppliedSequence: sequencing.lastAppliedSequence };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async transition(orderId: string, status: "EXPIRED" | "UNKNOWN", reason: string) { const result = await this.pool.query<any>(`UPDATE fake_broker_orders SET status=$2 WHERE order_id=$1 AND status NOT IN ('FILLED','REJECTED','CANCELLED','EXPIRED') RETURNING order_id,status`, [orderId, status]); if (result.rowCount === 1) await this.pool.query("INSERT INTO fake_broker_order_events (event_id,order_id,status,reason) VALUES ($1,$2,$3,$4)", [randomUUID(), orderId, status, reason]); return result.rows[0] ?? null; }
  async pendingFill(orderId: string) {
    const result = await this.pool.query<any>(`SELECT event_id, payload, attempts FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND (status='PENDING' OR (status='DELIVERING' AND lease_until <= now()))`, [orderId]);
    return result.rows[0] ?? null;
  }
  async pendingOutbox(limit = 20) {
    const result = await this.pool.query<any>(`SELECT event_id, order_id, payload, attempts FROM fake_broker_outbox WHERE event_type='FILL_POST' AND (status='PENDING' OR (status='DELIVERING' AND lease_until <= now())) ORDER BY created_at LIMIT $1`, [limit]);
    return result.rows;
  }
  async pendingReservationResolutionOutbox(limit = 20) {
    const result = await this.pool.query<any>(`SELECT r.event_id FROM fake_broker_outbox r
      WHERE r.event_type='RESERVATION_RESOLVE' AND (r.status='PENDING' OR (r.status='DELIVERING' AND r.lease_until <= now()))
      AND NOT EXISTS (SELECT 1 FROM fake_broker_outbox f WHERE f.order_id=r.order_id AND f.event_type='FILL_POST' AND f.status <> 'DELIVERED')
      ORDER BY r.created_at LIMIT $1`, [limit]);
    return result.rows;
  }
  async pendingFeeCorrectionOutbox(limit = 20) {
    const result = await this.pool.query<any>(`SELECT event_id FROM fake_broker_outbox WHERE event_type='FEE_CORRECTION'
      AND (status='PENDING' OR (status='DELIVERING' AND lease_until<=now())) ORDER BY created_at LIMIT $1`, [limit]);
    return result.rows;
  }
  async claimFeeCorrectionOutbox(eventId: string, leaseSeconds = 60) {
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 300) throw new Error("outbox lease must be between 5 and 300 seconds");
    const claimToken = randomUUID();
    const result = await this.pool.query<any>(`UPDATE fake_broker_outbox SET status='DELIVERING',claim_token=$2,lease_until=now()+($3::text || ' seconds')::interval
      WHERE event_id=$1 AND event_type='FEE_CORRECTION' AND (status='PENDING' OR (status='DELIVERING' AND lease_until<=now()))
      RETURNING event_id,order_id,payload,attempts,claim_token,lease_until`, [eventId, claimToken, leaseSeconds]);
    return result.rows[0] ?? null;
  }
  async markFeeCorrectionDelivered(eventId: string, claimToken: string) {
    const result = await this.pool.query(`UPDATE fake_broker_outbox SET status='DELIVERED',attempts=attempts+1,delivered_at=now(),last_error=NULL,claim_token=NULL,lease_until=NULL
      WHERE event_id=$1 AND event_type='FEE_CORRECTION' AND status='DELIVERING' AND claim_token=$2`, [eventId, claimToken]);
    if (result.rowCount !== 1) throw new Error("fee correction outbox delivery claim was lost before acknowledgement");
  }
  async markFeeCorrectionFailed(eventId: string, claimToken: string, error: string) {
    const result = await this.pool.query(`UPDATE fake_broker_outbox SET attempts=attempts+1,status=CASE WHEN attempts+1>=3 THEN 'COMPENSATION_REQUIRED' ELSE 'PENDING' END,
      last_error=$3,claim_token=NULL,lease_until=NULL WHERE event_id=$1 AND event_type='FEE_CORRECTION' AND status='DELIVERING' AND claim_token=$2`, [eventId, claimToken, error.slice(0, 1000)]);
    if (result.rowCount !== 1) throw new Error("fee correction outbox delivery claim was lost before failure acknowledgement");
  }
  async claimReservationResolutionOutbox(eventId: string, leaseSeconds = 60) {
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 300) throw new Error("outbox lease must be between 5 and 300 seconds");
    const claimToken = randomUUID();
    const result = await this.pool.query<any>(`UPDATE fake_broker_outbox r SET status='DELIVERING',claim_token=$2,lease_until=now()+($3::text || ' seconds')::interval
      WHERE r.event_id=$1 AND r.event_type='RESERVATION_RESOLVE'
      AND (r.status='PENDING' OR (r.status='DELIVERING' AND r.lease_until <= now()))
      AND NOT EXISTS (SELECT 1 FROM fake_broker_outbox f WHERE f.order_id=r.order_id AND f.event_type='FILL_POST' AND f.status <> 'DELIVERED')
      RETURNING r.event_id,r.order_id,r.payload,r.attempts,r.claim_token,r.lease_until`, [eventId, claimToken, leaseSeconds]);
    return result.rows[0] ?? null;
  }
  async claimOutbox(eventId: string, leaseSeconds = 60) {
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 300) throw new Error("outbox lease must be between 5 and 300 seconds");
    const claimToken = randomUUID();
    const result = await this.pool.query<any>(`UPDATE fake_broker_outbox SET status='DELIVERING',claim_token=$2,lease_until=now()+($3::text || ' seconds')::interval
      WHERE event_id=$1 AND event_type='FILL_POST' AND (status='PENDING' OR (status='DELIVERING' AND lease_until <= now()))
      RETURNING event_id,order_id,payload,attempts,claim_token,lease_until`, [eventId, claimToken, leaseSeconds]);
    return result.rows[0] ?? null;
  }
  async outboxStatus(orderId: string) {
    const result = await this.pool.query<any>(`SELECT event_id, event_type, status, attempts, last_error, created_at, delivered_at FROM fake_broker_outbox WHERE order_id=$1 ORDER BY created_at DESC LIMIT 1`, [orderId]);
    return result.rows[0] ?? null;
  }
  async markFillDelivered(eventId: string, claimToken: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const delivered = await client.query<any>(`UPDATE fake_broker_outbox SET status='DELIVERED', attempts=attempts+1, delivered_at=now(), last_error=NULL,claim_token=NULL,lease_until=NULL WHERE event_id=$1 AND event_type='FILL_POST' AND status='DELIVERING' AND claim_token=$2 RETURNING order_id,payload`, [eventId, claimToken]);
      if (delivered.rowCount !== 1) throw new Error("outbox delivery claim was lost before acknowledgement");
      if (delivered.rowCount === 1) {
        const pendingFills = await client.query<any>("SELECT 1 FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND status<>'DELIVERED' LIMIT 1", [delivered.rows[0].order_id]);
        if (pendingFills.rowCount === 0) await client.query(`UPDATE fake_broker_orders o SET status=CASE WHEN f.quantity >= o.requested_quantity THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END
          FROM (SELECT order_id,SUM(quantity) AS quantity FROM fake_broker_fills WHERE order_id=$1 GROUP BY order_id) f
          WHERE o.order_id=$1 AND f.order_id=o.order_id AND o.status='LEDGER_PENDING'`, [delivered.rows[0].order_id]);
        const order = await client.query<any>("SELECT status FROM fake_broker_orders WHERE order_id=$1", [delivered.rows[0].order_id]);
        if (order.rows[0]?.status === "CANCELLED" && delivered.rows[0].payload.reservation) await this.insertCancellationReservationResolution(client, delivered.rows[0].order_id, delivered.rows[0].payload);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async markReservationResolutionDelivered(eventId: string, claimToken: string) {
    const result = await this.pool.query(`UPDATE fake_broker_outbox SET status='DELIVERED',attempts=attempts+1,delivered_at=now(),last_error=NULL,claim_token=NULL,lease_until=NULL
      WHERE event_id=$1 AND event_type='RESERVATION_RESOLVE' AND status='DELIVERING' AND claim_token=$2`, [eventId, claimToken]);
    if (result.rowCount !== 1) throw new Error("reservation resolution delivery claim was lost before acknowledgement");
  }
  async markReservationResolutionFailed(eventId: string, claimToken: string, error: string) {
    const result = await this.pool.query(`UPDATE fake_broker_outbox SET attempts=attempts+1,status=CASE WHEN attempts+1 >= 3 THEN 'COMPENSATION_REQUIRED' ELSE 'PENDING' END,
      last_error=$3,claim_token=NULL,lease_until=NULL WHERE event_id=$1 AND event_type='RESERVATION_RESOLVE' AND status='DELIVERING' AND claim_token=$2`, [eventId, claimToken, error.slice(0, 1000)]);
    if (result.rowCount !== 1) throw new Error("reservation resolution delivery claim was lost before failure acknowledgement");
  }
  async markFillDeliveryFailed(eventId: string, claimToken: string, error: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const failed = await client.query<any>(`UPDATE fake_broker_outbox SET attempts=attempts+1, status=CASE WHEN attempts+1 >= 3 THEN 'COMPENSATION_REQUIRED' ELSE 'PENDING' END, last_error=$3,claim_token=NULL,lease_until=NULL WHERE event_id=$1 AND status='DELIVERING' AND claim_token=$2 RETURNING order_id`, [eventId, claimToken, error.slice(0, 1000)]);
      if (failed.rowCount === 1) await client.query(`UPDATE fake_broker_orders SET status='LEDGER_PENDING' WHERE order_id=$1 AND status IN ('FILLED','PARTIALLY_FILLED')`, [failed.rows[0].order_id]);
      await client.query("COMMIT");
    } catch (failure) { await client.query("ROLLBACK"); throw failure; }
    finally { client.release(); }
  }
  async requeueOutbox(eventId: string) {
    const result = await this.pool.query<any>(`UPDATE fake_broker_outbox SET status='PENDING', last_error=NULL WHERE event_id=$1 AND status='COMPENSATION_REQUIRED' RETURNING event_id, order_id, event_type, payload, attempts`, [eventId]);
    return result.rows[0] ?? null;
  }
  private async insertCancellationReservationResolution(client: import("pg").PoolClient, orderId: string, fillPayload: any) {
    const reservation = fillPayload.reservation;
    if (!reservation || typeof fillPayload.accountId !== "string" || typeof fillPayload.namespace !== "string") return;
    const payload = {
      accountId: fillPayload.accountId, reservationId: reservation.reservationId,
      namespace: fillPayload.namespace, testRunId: reservation.testRunId, ownerId: reservation.ownerId,
      outcome: "CANCELLED", evidenceRef: `fakebroker-cancel:${orderId}`,
    };
    await client.query(`INSERT INTO fake_broker_outbox(event_id,order_id,event_type,payload)
      VALUES($1,$2,'RESERVATION_RESOLVE',$3::jsonb) ON CONFLICT(order_id) WHERE event_type='RESERVATION_RESOLVE' DO NOTHING`, [randomUUID(), orderId, JSON.stringify(payload)]);
  }
}
