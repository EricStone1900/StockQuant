import { randomUUID } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";
import type { GapRecord } from "./minute-quality.js";

export type PersistedGap = GapRecord & { subscriptionId: string; status: "OPEN" | "CLOSED" | "UNRECOVERABLE" };
export type BackfillTask = { taskId: string; subscriptionId: string; fromDate: string; toDate: string; idempotencyKey: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" };
type GapRow = QueryResultRow & { gap_id: string; subscription_id: string; security_id: string; bar_start: Date; bar_end: Date; reason: GapRecord["reason"]; priority: GapRecord["priority"]; status: PersistedGap["status"] };
type TaskRow = QueryResultRow & { task_id: string; subscription_id: string; from_date: string | Date; to_date: string | Date; idempotency_key: string; status: BackfillTask["status"] };

export class CoverageRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_gap_records (
        gap_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        security_id TEXT NOT NULL,
        bar_start TIMESTAMPTZ NOT NULL,
        bar_end TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL CHECK (reason IN ('MISSING','DUPLICATE_CONFLICT')),
        priority TEXT NOT NULL CHECK (priority IN ('P0','P1','P2')),
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','UNRECOVERABLE')),
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (subscription_id, security_id, bar_start, reason)
      );
      CREATE INDEX IF NOT EXISTS market_data_gap_records_open_idx ON market_data_gap_records(subscription_id, status, priority, bar_end);
      CREATE TABLE IF NOT EXISTS market_data_backfill_tasks (
        task_id UUID PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL CHECK (to_date >= from_date),
        idempotency_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  async upsertGaps(subscriptionId: string, gaps: GapRecord[]): Promise<number> {
    for (const gap of gaps) {
      await this.pool.query(`
        INSERT INTO market_data_gap_records (gap_id, subscription_id, security_id, bar_start, bar_end, reason, priority)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (subscription_id, security_id, bar_start, reason) DO UPDATE SET gap_id=EXCLUDED.gap_id, priority=EXCLUDED.priority, status='OPEN', last_seen_at=now()
      `, [gap.gapId, subscriptionId, gap.securityId, gap.barStart, gap.barEnd, gap.reason, gap.priority]);
    }
    return gaps.length;
  }

  async open(subscriptionId: string): Promise<PersistedGap[]> {
    const result = await this.pool.query<GapRow>("SELECT gap_id, subscription_id, security_id, bar_start, bar_end, reason, priority, status FROM market_data_gap_records WHERE subscription_id=$1 AND status='OPEN' ORDER BY priority, bar_end", [subscriptionId]);
    return result.rows.map((row) => ({ gapId: row.gap_id, subscriptionId: row.subscription_id, securityId: row.security_id, barStart: row.bar_start.toISOString(), barEnd: row.bar_end.toISOString(), reason: row.reason, priority: row.priority, status: row.status }));
  }

  async close(gapId: string, status: "CLOSED" | "UNRECOVERABLE" = "CLOSED"): Promise<void> {
    await this.pool.query("UPDATE market_data_gap_records SET status=$2, last_seen_at=now() WHERE gap_id=$1", [gapId, status]);
  }

  async createBackfill(subscriptionId: string, fromDate: string, toDate: string, idempotencyKey: string): Promise<{ task: BackfillTask; created: boolean }> {
    const result = await this.pool.query<TaskRow>("INSERT INTO market_data_backfill_tasks (task_id, subscription_id, from_date, to_date, idempotency_key) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (idempotency_key) DO NOTHING RETURNING *", [randomUUID(), subscriptionId, fromDate, toDate, idempotencyKey]);
    if (result.rowCount === 1) return { task: this.mapTask(result.rows[0]), created: true };
    const existing = await this.pool.query<TaskRow>("SELECT * FROM market_data_backfill_tasks WHERE idempotency_key=$1", [idempotencyKey]);
    if (existing.rowCount !== 1) throw new Error("backfill task disappeared after idempotent insert");
    return { task: this.mapTask(existing.rows[0]), created: false };
  }

  async findBackfill(taskId: string): Promise<BackfillTask | null> {
    const result = await this.pool.query<TaskRow>("SELECT * FROM market_data_backfill_tasks WHERE task_id=$1", [taskId]);
    return result.rowCount === 1 ? this.mapTask(result.rows[0]) : null;
  }

  async claimBackfill(taskId: string): Promise<BackfillTask | null> {
    const result = await this.pool.query<TaskRow>("UPDATE market_data_backfill_tasks SET status='RUNNING' WHERE task_id=$1 AND status='QUEUED' RETURNING *", [taskId]);
    return result.rowCount === 1 ? this.mapTask(result.rows[0]) : null;
  }

  async completeBackfill(taskId: string): Promise<BackfillTask | null> {
    const result = await this.pool.query<TaskRow>("UPDATE market_data_backfill_tasks SET status='COMPLETED' WHERE task_id=$1 AND status='RUNNING' RETURNING *", [taskId]);
    return result.rowCount === 1 ? this.mapTask(result.rows[0]) : null;
  }

  async failBackfill(taskId: string): Promise<BackfillTask | null> {
    const result = await this.pool.query<TaskRow>("UPDATE market_data_backfill_tasks SET status='FAILED' WHERE task_id=$1 AND status='RUNNING' RETURNING *", [taskId]);
    return result.rowCount === 1 ? this.mapTask(result.rows[0]) : null;
  }

  private mapTask(row: TaskRow): BackfillTask {
    const date = (value: string | Date): string => value instanceof Date ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value) : String(value).slice(0, 10);
    return { taskId: row.task_id, subscriptionId: row.subscription_id, fromDate: date(row.from_date), toDate: date(row.to_date), idempotencyKey: row.idempotency_key, status: row.status };
  }
}
