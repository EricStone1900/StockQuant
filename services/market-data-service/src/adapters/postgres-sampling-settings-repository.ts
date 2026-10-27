import type { Pool, PoolClient } from "pg";

export type SamplingSettings = { intervalMinutes: 20 | 30; version: number; updatedAt: string | null };

export class PostgresSamplingSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_sampling_settings (
      setting_id TEXT PRIMARY KEY CHECK (setting_id='default'),
      interval_minutes INTEGER NOT NULL CHECK (interval_minutes IN (20,30)),
      version INTEGER NOT NULL CHECK (version > 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }

  async get(): Promise<SamplingSettings> {
    const result = await this.pool.query<{ interval_minutes: number; version: number; updated_at: Date }>("SELECT interval_minutes,version,updated_at FROM market_data_sampling_settings WHERE setting_id='default'");
    const row = result.rows[0];
    return row ? { intervalMinutes: row.interval_minutes as 20 | 30, version: row.version, updatedAt: new Date(row.updated_at).toISOString() } : { intervalMinutes: 30, version: 0, updatedAt: null };
  }

  async set(intervalMinutes: 20 | 30, queryable: Pool | PoolClient = this.pool): Promise<SamplingSettings> {
    const result = await queryable.query<{ interval_minutes: number; version: number; updated_at: Date }>(`INSERT INTO market_data_sampling_settings(setting_id,interval_minutes,version)
      VALUES ('default',$1,1) ON CONFLICT(setting_id) DO UPDATE SET interval_minutes=EXCLUDED.interval_minutes,version=market_data_sampling_settings.version+1,updated_at=now()
      RETURNING interval_minutes,version,updated_at`, [intervalMinutes]);
    const row = result.rows[0]!;
    return { intervalMinutes: row.interval_minutes as 20 | 30, version: row.version, updatedAt: new Date(row.updated_at).toISOString() };
  }
}
