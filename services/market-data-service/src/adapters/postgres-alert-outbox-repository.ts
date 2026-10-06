import { randomUUID } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";
import type { AlertOutboxPort, AlertEvent, AlertIncident, AlertSeverity } from "../ports/alert-outbox.js";
export type { AlertEvent, AlertIncident, AlertSeverity } from "../ports/alert-outbox.js";

type AlertRow = QueryResultRow & { alert_id: string; alert_key: string; code: string; severity: AlertSeverity; payload: Record<string, unknown>; attempts: number; sent_at: Date | null };
type IncidentRow = QueryResultRow & { incident_id: string; alert_key: string; code: string; severity: AlertSeverity; payload: Record<string, unknown>; state: AlertIncident["state"]; first_seen_at: Date; last_seen_at: Date; acknowledged_by: string | null; acknowledged_at: Date | null; resolved_at: Date | null };

/** Durable alert delivery state. External notification is optional; local state is authoritative. */
export class AlertOutboxRepository implements AlertOutboxPort {
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
      CREATE TABLE IF NOT EXISTS market_data_alert_incidents (
        incident_id UUID PRIMARY KEY,
        alert_key TEXT NOT NULL,
        code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
        payload JSONB NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        acknowledged_by TEXT,
        acknowledged_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        CHECK ((acknowledged_at IS NULL) = (acknowledged_by IS NULL)),
        CHECK (state <> 'ACKNOWLEDGED' OR (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL)),
        CHECK ((state = 'RESOLVED') = (resolved_at IS NOT NULL))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS market_data_alert_incidents_active_key_idx ON market_data_alert_incidents(alert_key) WHERE state IN ('OPEN','ACKNOWLEDGED');
      CREATE INDEX IF NOT EXISTS market_data_alert_incidents_active_time_idx ON market_data_alert_incidents(last_seen_at DESC) WHERE state IN ('OPEN','ACKNOWLEDGED');
    `);
  }

  async raiseIncident(alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ incident: AlertIncident; created: boolean }> {
    if (!alertKey.trim() || !code.trim()) throw new Error("alert key and code are required");
    const incidentId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<IncidentRow & { created: boolean }>(`
        INSERT INTO market_data_alert_incidents (incident_id,alert_key,code,severity,payload,state)
        VALUES ($1,$2,$3,$4,$5::jsonb,'OPEN')
        ON CONFLICT (alert_key) WHERE state IN ('OPEN','ACKNOWLEDGED')
        DO UPDATE SET last_seen_at=now(),severity=EXCLUDED.severity,payload=EXCLUDED.payload
        RETURNING *, (xmax=0) AS created
      `, [incidentId, alertKey, code, severity, JSON.stringify(payload)]);
      const row = result.rows[0];
      if (!row) throw new Error("alert incident disappeared after upsert");
      const created = Boolean(row.created);
      const incident = this.mapIncident(row);
      if (created) {
        await this.enqueueWithClient(client, `${incident.incidentId}:OPEN`, incident.code, incident.severity, { incidentId: incident.incidentId, alertKey: incident.alertKey, state: incident.state, ...incident.payload });
      }
      await client.query("COMMIT");
      return { incident, created };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async activeIncidents(): Promise<AlertIncident[]> {
    const result = await this.pool.query<IncidentRow>("SELECT * FROM market_data_alert_incidents WHERE state IN ('OPEN','ACKNOWLEDGED') ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END, first_seen_at, incident_id");
    return result.rows.map((row) => this.mapIncident(row));
  }

  async acknowledgeIncident(incidentId: string, actorId: string): Promise<AlertIncident | null> {
    if (!actorId.trim()) throw new Error("acknowledgement actor is required");
    const result = await this.pool.query<IncidentRow>(`
      UPDATE market_data_alert_incidents SET state='ACKNOWLEDGED', acknowledged_by=COALESCE(acknowledged_by,$2), acknowledged_at=COALESCE(acknowledged_at,now())
      WHERE incident_id=$1 AND state IN ('OPEN','ACKNOWLEDGED') RETURNING *
    `, [incidentId, actorId]);
    if (result.rows[0]) return this.mapIncident(result.rows[0]);
    const existing = await this.pool.query<IncidentRow>("SELECT * FROM market_data_alert_incidents WHERE incident_id=$1", [incidentId]);
    return existing.rows[0] ? this.mapIncident(existing.rows[0]) : null;
  }

  async resolveIncident(alertKey: string): Promise<AlertIncident | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<IncidentRow>(`
        UPDATE market_data_alert_incidents SET state='RESOLVED', resolved_at=now()
        WHERE alert_key=$1 AND state IN ('OPEN','ACKNOWLEDGED') RETURNING *
      `, [alertKey]);
      const incident = result.rows[0] ? this.mapIncident(result.rows[0]) : null;
      if (incident) await this.enqueueWithClient(client, `${incident.incidentId}:RESOLVED`, incident.code, incident.severity, { incidentId: incident.incidentId, alertKey: incident.alertKey, state: incident.state, ...incident.payload });
      await client.query("COMMIT");
      return incident;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async enqueue(alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ alertId: string; created: boolean }> {
    return this.enqueueWithClient(this.pool, alertKey, code, severity, payload);
  }

  private async enqueueWithClient(client: Pick<Pool, "query">, alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ alertId: string; created: boolean }> {
    const alertId = randomUUID();
    const result = await client.query<{ alert_id: string }>(`
      INSERT INTO market_data_alert_outbox (alert_id, alert_key, code, severity, payload)
      VALUES ($1,$2,$3,$4,$5::jsonb)
      ON CONFLICT (alert_key) DO NOTHING RETURNING alert_id
    `, [alertId, alertKey, code, severity, JSON.stringify(payload)]);
    return { alertId: result.rows[0]?.alert_id ?? (await this.findIdWithClient(client, alertKey)), created: result.rowCount === 1 };
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

  private async findIdWithClient(client: Pick<Pool, "query">, alertKey: string): Promise<string> {
    const result = await client.query<{ alert_id: string }>("SELECT alert_id FROM market_data_alert_outbox WHERE alert_key=$1", [alertKey]);
    if (!result.rows[0]) throw new Error("alert disappeared after idempotent insert");
    return result.rows[0].alert_id;
  }

  private mapIncident(row: IncidentRow): AlertIncident {
    return { incidentId: row.incident_id, alertKey: row.alert_key, code: row.code, severity: row.severity, payload: row.payload, state: row.state, firstSeenAt: row.first_seen_at.toISOString(), lastSeenAt: row.last_seen_at.toISOString(), acknowledgedBy: row.acknowledged_by, acknowledgedAt: row.acknowledged_at?.toISOString() ?? null, resolvedAt: row.resolved_at?.toISOString() ?? null };
  }

  private map(row: AlertRow): AlertEvent { return { alertId: row.alert_id, alertKey: row.alert_key, code: row.code, severity: row.severity, payload: row.payload, attempts: row.attempts, sentAt: row.sent_at?.toISOString() ?? null }; }
}
