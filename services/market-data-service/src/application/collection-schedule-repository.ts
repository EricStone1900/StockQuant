import type { Pool, QueryResultRow } from "pg";

export type CollectionSchedule = {
  subscriptionId: string;
  subscriptionVersion: number;
  fromDate: string;
  toDate: string;
  calendarVersion: string;
  enabled: boolean;
  watermarkEnd: string | null;
  version: number;
};

export type SchedulerLease = { ownerId: string; fencingToken: number; leaseUntil: string };
type ScheduleRow = QueryResultRow & { subscription_id: string; subscription_version: number; from_date: string; to_date: string; calendar_version: string; enabled: boolean; watermark_end: Date | null; version: number };
type LeaseRow = QueryResultRow & { owner_id: string; fencing_token: number; lease_until: Date };

export class CollectionScheduleConflict extends Error {
  constructor(message: string) { super(message); this.name = "CollectionScheduleConflict"; }
}

export class CollectionScheduleRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_collection_schedules (
        subscription_id TEXT PRIMARY KEY,
        subscription_version INTEGER NOT NULL CHECK (subscription_version > 0),
        from_date DATE NOT NULL,
        to_date DATE NOT NULL CHECK (to_date >= from_date),
        calendar_version TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        watermark_end TIMESTAMPTZ,
        version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS market_data_collection_scheduler_lease (
        lease_id INTEGER PRIMARY KEY CHECK (lease_id = 1),
        owner_id TEXT NOT NULL,
        fencing_token BIGINT NOT NULL DEFAULT 0,
        lease_until TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  async upsert(input: Omit<CollectionSchedule, "enabled" | "watermarkEnd" | "version">): Promise<CollectionSchedule> {
    const result = await this.pool.query<ScheduleRow>(`
      INSERT INTO market_data_collection_schedules (subscription_id, subscription_version, from_date, to_date, calendar_version)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (subscription_id) DO UPDATE SET subscription_version=EXCLUDED.subscription_version, from_date=EXCLUDED.from_date, to_date=EXCLUDED.to_date, calendar_version=EXCLUDED.calendar_version, version=market_data_collection_schedules.version+1, updated_at=now()
      RETURNING *
    `, [input.subscriptionId, input.subscriptionVersion, input.fromDate, input.toDate, input.calendarVersion]);
    return this.map(result.rows[0]);
  }

  async find(subscriptionId: string): Promise<CollectionSchedule | null> {
    const result = await this.pool.query<ScheduleRow>("SELECT * FROM market_data_collection_schedules WHERE subscription_id=$1", [subscriptionId]);
    return result.rowCount === 1 ? this.map(result.rows[0]) : null;
  }

  async enabled(): Promise<CollectionSchedule[]> {
    const result = await this.pool.query<ScheduleRow>("SELECT * FROM market_data_collection_schedules WHERE enabled=true ORDER BY subscription_id");
    return result.rows.map((row) => this.map(row));
  }

  async setEnabled(subscriptionId: string, enabled: boolean): Promise<CollectionSchedule> {
    const result = await this.pool.query<ScheduleRow>("UPDATE market_data_collection_schedules SET enabled=$2, version=version+1, updated_at=now() WHERE subscription_id=$1 RETURNING *", [subscriptionId, enabled]);
    if (result.rowCount !== 1) throw new CollectionScheduleConflict("schedule not found");
    return this.map(result.rows[0]);
  }

  async advanceWatermark(subscriptionId: string, expectedVersion: number, watermarkEnd: string): Promise<CollectionSchedule> {
    const result = await this.pool.query<ScheduleRow>("UPDATE market_data_collection_schedules SET watermark_end=$3, version=version+1, updated_at=now() WHERE subscription_id=$1 AND version=$2 AND enabled=true RETURNING *", [subscriptionId, expectedVersion, watermarkEnd]);
    if (result.rowCount !== 1) throw new CollectionScheduleConflict("schedule watermark is stale or disabled");
    return this.map(result.rows[0]);
  }

  async acquireLease(ownerId: string, leaseSeconds: number): Promise<SchedulerLease | null> {
    const result = await this.pool.query<LeaseRow>(`
      INSERT INTO market_data_collection_scheduler_lease (lease_id, owner_id, fencing_token, lease_until)
      VALUES (1,$1,1,now()+($2::double precision * interval '1 second'))
      ON CONFLICT (lease_id) DO UPDATE SET owner_id=EXCLUDED.owner_id, fencing_token=market_data_collection_scheduler_lease.fencing_token+1, lease_until=EXCLUDED.lease_until, updated_at=now()
      WHERE market_data_collection_scheduler_lease.lease_until < now() OR market_data_collection_scheduler_lease.owner_id=$1
      RETURNING owner_id, fencing_token, lease_until
    `, [ownerId, leaseSeconds]);
    const row = result.rows[0];
    return row ? { ownerId: row.owner_id, fencingToken: Number(row.fencing_token), leaseUntil: row.lease_until.toISOString() } : null;
  }

  private map(row: ScheduleRow): CollectionSchedule {
    const date = (value: string | Date): string => value instanceof Date ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value) : String(value).slice(0, 10);
    return { subscriptionId: row.subscription_id, subscriptionVersion: row.subscription_version, fromDate: date(row.from_date), toDate: date(row.to_date), calendarVersion: row.calendar_version, enabled: row.enabled, watermarkEnd: row.watermark_end?.toISOString() ?? null, version: row.version };
  }
}
