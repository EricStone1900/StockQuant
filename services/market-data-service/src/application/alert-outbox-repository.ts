import { randomUUID } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertEvent = { alertId: string; alertKey: string; code: string; severity: AlertSeverity; payload: Record<string, unknown>; attempts: number; sentAt: string | null };
type AlertRow = QueryResultRow & { alert_id: string; alert_key: string; code: string; severity: AlertSeverity; payload: Record<string, unknown>; attempts: number; sent_at: Date | null };

/** Durable alert delivery state. External notification is optional; local state is authoritative. */
export class AlertOutboxRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_alert_outbox (
        alert_id UUID PRIMARY KEY,
        alert_key TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
        payload JSONB NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_error TEXT,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS market_data_alert_outbox_pending_idx ON market_data_alert_outbox(next_attempt_at) WHERE sent_at IS NULL;
    `);
  }

  async enqueue(alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ alertId: string; created: boolean }> {
    const alertId = randomUUID();
    const result = await this.pool.query<{ alert_id: string }>(`
      INSERT INTO market_data_alert_outbox (alert_id, alert_key, code, severity, payload)
      VALUES ($1,$2,$3,$4,$5::jsonb)
      ON CONFLICT (alert_key) DO NOTHING RETURNING alert_id
    `, [alertId, alertKey, code, severity, JSON.stringify(payload)]);
    return { alertId: result.rows[0]?.alert_id ?? (await this.findId(alertKey)), created: result.rowCount === 1 };
  }

  async pending(limit = 100): Promise<AlertEvent[]> {
    const result = await this.pool.query<AlertRow>("SELECT alert_id, alert_key, code, severity, payload, attempts, sent_at FROM market_data_alert_outbox WHERE sent_at IS NULL AND next_attempt_at <= now() ORDER BY created_at LIMIT $1", [limit]);
    return result.rows.map((row) => this.map(row));
  }

  async markFailed(alertId: string, error: string): Promise<void> {
    await this.pool.query("UPDATE market_data_alert_outbox SET attempts=attempts+1, last_error=$2, next_attempt_at=now() + LEAST((2 ^ LEAST(attempts, 8)) * interval '1 second', interval '5 minutes') WHERE alert_id=$1 AND sent_at IS NULL", [alertId, error]);
  }

  async markSent(alertId: string): Promise<void> {
    await this.pool.query("UPDATE market_data_alert_outbox SET sent_at=now() WHERE alert_id=$1 AND sent_at IS NULL", [alertId]);
  }

  private async findId(alertKey: string): Promise<string> {
    const result = await this.pool.query<{ alert_id: string }>("SELECT alert_id FROM market_data_alert_outbox WHERE alert_key=$1", [alertKey]);
    if (!result.rows[0]) throw new Error("alert disappeared after idempotent insert");
    return result.rows[0].alert_id;
  }

  private map(row: AlertRow): AlertEvent { return { alertId: row.alert_id, alertKey: row.alert_key, code: row.code, severity: row.severity, payload: row.payload, attempts: row.attempts, sentAt: row.sent_at?.toISOString() ?? null }; }
}
