import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { calculateHistoricalExecution, type HistoricalExecutionCommand, type HistoricalExecutionResult } from "../domain/historical-execution.js";

export class PostgresFakeBrokerRepository {
  constructor(private readonly pool: Pool) {}
  async migrate() { await this.pool.query(`
    CREATE TABLE IF NOT EXISTS fake_broker_orders (
      order_id UUID PRIMARY KEY, namespace TEXT NOT NULL, account_id UUID NOT NULL, client_order_id TEXT NOT NULL,
      security TEXT NOT NULL, requested_quantity BIGINT NOT NULL, status TEXT NOT NULL, rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(namespace, client_order_id)
    );
    CREATE TABLE IF NOT EXISTS fake_broker_fills (
      external_fill_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id), quantity BIGINT NOT NULL,
      price NUMERIC(20,4) NOT NULL, fee NUMERIC(20,4) NOT NULL DEFAULT 0, effective_at TIMESTAMPTZ NOT NULL, UNIQUE(order_id)
    );
    ALTER TABLE fake_broker_fills ADD COLUMN IF NOT EXISTS fee NUMERIC(20,4) NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS fake_broker_order_events (
      event_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id), status TEXT NOT NULL,
      reason TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS fake_broker_outbox (
      event_id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id),
      event_type TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','COMPENSATION_REQUIRED')),
      attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      delivered_at TIMESTAMPTZ, UNIQUE(order_id,event_type)
    );
  `); }
  async execute(command: HistoricalExecutionCommand): Promise<{ result: HistoricalExecutionResult; replayed: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<any>(`SELECT o.order_id, o.status, o.rejection_reason, f.external_fill_id, f.quantity, f.price::text, f.fee::text, f.effective_at
        FROM fake_broker_orders o LEFT JOIN fake_broker_fills f ON f.order_id=o.order_id WHERE o.namespace=$1 AND o.client_order_id=$2 FOR UPDATE OF o`, [command.namespace, command.clientOrderId]);
      if (existing.rowCount === 1) {
        const row = existing.rows[0]; await client.query("COMMIT");
        return { replayed: true, result: row.status === "FILLED" || row.status === "PARTIALLY_FILLED" ? { orderId: row.order_id, status: row.status, brokerMode: "FAKE", fill: { externalFillId: row.external_fill_id, quantity: Number(row.quantity), price: row.price, fee: row.fee, effectiveAt: row.effective_at.toISOString() } } : { orderId: row.order_id, status: row.status, brokerMode: "FAKE", rejectionReason: row.rejection_reason } as HistoricalExecutionResult };
      }
      const result = calculateHistoricalExecution(command, { orderId: randomUUID(), externalFillId: randomUUID() });
      await client.query(`INSERT INTO fake_broker_orders (order_id,namespace,account_id,client_order_id,security,requested_quantity,status,rejection_reason)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [result.orderId, command.namespace, command.accountId, command.clientOrderId, command.security, command.requestedQuantity, result.status, result.rejectionReason ?? null]);
      if (result.fill) await client.query(`INSERT INTO fake_broker_fills (external_fill_id,order_id,quantity,price,fee,effective_at) VALUES ($1,$2,$3,$4,$5,$6)`, [result.fill.externalFillId, result.orderId, result.fill.quantity, result.fill.price, result.fill.fee, result.fill.effectiveAt]);
      await client.query("INSERT INTO fake_broker_order_events (event_id,order_id,status,reason) VALUES ($1,$2,$3,$4)", [randomUUID(), result.orderId, result.status, result.rejectionReason ?? null]);
      if (result.fill) await client.query(`INSERT INTO fake_broker_outbox (event_id,order_id,event_type,payload) VALUES ($1,$2,'FILL_POST', $3::jsonb)`, [randomUUID(), result.orderId, JSON.stringify({ ...result.fill, accountId: command.accountId, namespace: command.namespace, security: command.security })]);
      await client.query("COMMIT"); return { result, replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async find(orderId: string) { const result = await this.pool.query<any>("SELECT order_id,status,rejection_reason FROM fake_broker_orders WHERE order_id=$1", [orderId]); return result.rows[0] ?? null; }
  async reconciliationSummary(namespace: string) {
    const result = await this.pool.query<any>(`SELECT count(*)::int AS order_count, count(*) FILTER (WHERE status IN ('UNKNOWN','LEDGER_PENDING'))::int AS unresolved_order_count,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1) AS fill_count,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1 AND x.status <> 'DELIVERED') AS pending_outbox_count
      FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
    return { namespace, brokerMode: "FAKE", ...result.rows[0] };
  }
  async cancel(orderId: string) { const result = await this.pool.query<any>(`UPDATE fake_broker_orders SET status=CASE WHEN status IN ('FILLED','REJECTED','CANCELLED','EXPIRED') THEN status WHEN status='CANCEL_REQUESTED' THEN 'CANCELLED' ELSE 'CANCEL_REQUESTED' END WHERE order_id=$1 RETURNING order_id,status`, [orderId]); if (result.rowCount === 1) await this.pool.query("INSERT INTO fake_broker_order_events (event_id,order_id,status) VALUES ($1,$2,$3)", [randomUUID(), orderId, result.rows[0].status]); return result.rows[0] ?? null; }
  async transition(orderId: string, status: "EXPIRED" | "UNKNOWN", reason: string) { const result = await this.pool.query<any>(`UPDATE fake_broker_orders SET status=$2 WHERE order_id=$1 AND status NOT IN ('FILLED','REJECTED','CANCELLED','EXPIRED') RETURNING order_id,status`, [orderId, status]); if (result.rowCount === 1) await this.pool.query("INSERT INTO fake_broker_order_events (event_id,order_id,status,reason) VALUES ($1,$2,$3,$4)", [randomUUID(), orderId, status, reason]); return result.rows[0] ?? null; }
  async pendingFill(orderId: string) {
    const result = await this.pool.query<any>(`SELECT event_id, payload, attempts FROM fake_broker_outbox WHERE order_id=$1 AND event_type='FILL_POST' AND status='PENDING'`, [orderId]);
    return result.rows[0] ?? null;
  }
  async pendingOutbox(limit = 20) {
    const result = await this.pool.query<any>(`SELECT event_id, order_id, payload, attempts FROM fake_broker_outbox WHERE event_type='FILL_POST' AND status='PENDING' ORDER BY created_at LIMIT $1`, [limit]);
    return result.rows;
  }
  async outboxStatus(orderId: string) {
    const result = await this.pool.query<any>(`SELECT event_id, event_type, status, attempts, last_error, created_at, delivered_at FROM fake_broker_outbox WHERE order_id=$1 ORDER BY created_at DESC LIMIT 1`, [orderId]);
    return result.rows[0] ?? null;
  }
  async markFillDelivered(eventId: string) {
    await this.pool.query(`UPDATE fake_broker_outbox SET status='DELIVERED', attempts=attempts+1, delivered_at=now(), last_error=NULL WHERE event_id=$1`, [eventId]);
  }
  async markFillDeliveryFailed(eventId: string, error: string) {
    await this.pool.query(`UPDATE fake_broker_outbox SET attempts=attempts+1, status=CASE WHEN attempts+1 >= 3 THEN 'COMPENSATION_REQUIRED' ELSE status END, last_error=$2 WHERE event_id=$1`, [eventId, error.slice(0, 1000)]);
    await this.pool.query(`UPDATE fake_broker_orders SET status='LEDGER_PENDING' WHERE order_id=(SELECT order_id FROM fake_broker_outbox WHERE event_id=$1) AND status IN ('FILLED','PARTIALLY_FILLED')`, [eventId]);
  }
  async requeueOutbox(eventId: string) {
    const result = await this.pool.query<any>(`UPDATE fake_broker_outbox SET status='PENDING', last_error=NULL WHERE event_id=$1 AND status='COMPENSATION_REQUIRED' RETURNING event_id, order_id, payload, attempts`, [eventId]);
    return result.rows[0] ?? null;
  }
}
