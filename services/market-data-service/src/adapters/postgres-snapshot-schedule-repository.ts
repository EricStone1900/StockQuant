import type { Pool } from "pg";
import type { SnapshotSchedule } from "../application/snapshot-sampling-scheduler.js";

export class PostgresSnapshotScheduleRepository {
  constructor(private readonly pool: Pool) {}
  async set(schedule: SnapshotSchedule, enabled: boolean): Promise<void> {
    const key = JSON.stringify([schedule.scope.market, schedule.scope.ownerId, schedule.scope.accountId, schedule.scope.namespace, schedule.scope.testRunId, schedule.sourceId]);
    await this.pool.query(`INSERT INTO market_data_snapshot_schedules(schedule_key,schedule_json,enabled) VALUES($1,$2::jsonb,$3)
      ON CONFLICT(schedule_key) DO UPDATE SET enabled=EXCLUDED.enabled`, [key, JSON.stringify(schedule), enabled]);
    await this.pool.query(`UPDATE market_data_sampling_policies SET
      policy_json=jsonb_set(policy_json,'{enabled}',to_jsonb(EXISTS(SELECT 1 FROM market_data_snapshot_schedules WHERE enabled=true))),updated_at=now()
      WHERE policy_id='snapshotSampling'`);
  }
  async enabled(): Promise<SnapshotSchedule[]> {
    const result = await this.pool.query<{ schedule_json: SnapshotSchedule }>("SELECT schedule_json FROM market_data_snapshot_schedules WHERE enabled=true ORDER BY schedule_key");
    return result.rows.map((row) => row.schedule_json);
  }
}
