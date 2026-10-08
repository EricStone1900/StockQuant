import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { ReceivedStrategySnapshot, StrategySnapshotInput, StrategySnapshotRepository } from "../ports/strategy-snapshot-repository.js";

const canonical = (input: StrategySnapshotInput) => JSON.stringify({ ...input, targets: input.targets.map((target) => ({ ...target })).sort((a, b) => a.market.localeCompare(b.market) || a.ticker.localeCompare(b.ticker)) });

export async function migrateStrategySnapshots(pool: Pool): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS governed_strategy_snapshots (
    snapshot_id uuid PRIMARY KEY, owner_id text NOT NULL, test_run_id uuid NOT NULL, strategy_id text NOT NULL,
    content_hash char(64) NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(owner_id, test_run_id, strategy_id)
  )`);
}

export class PostgresStrategySnapshotRepository implements StrategySnapshotRepository {
  constructor(private readonly pool: Pool, private readonly now: () => string = () => new Date().toISOString()) {}

  async receive(input: StrategySnapshotInput): Promise<ReceivedStrategySnapshot> {
    const contentHash = createHash("sha256").update(canonical(input)).digest("hex");
    const snapshotId = randomUUID();
    const inserted = await this.pool.query<{ received_at: Date }>(
      `INSERT INTO governed_strategy_snapshots(snapshot_id,owner_id,test_run_id,strategy_id,content_hash,payload)
       VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(owner_id,test_run_id,strategy_id) DO NOTHING RETURNING received_at`,
      [snapshotId, input.ownerId, input.testRunId, input.strategyId, contentHash, JSON.stringify(input)]
    );
    if (inserted.rowCount) return { ...input, snapshotId, status: "RECEIVED", receivedAt: inserted.rows[0].received_at.toISOString(), replayed: false };
    const existing = await this.pool.query<{ snapshot_id: string; content_hash: string; payload: StrategySnapshotInput; received_at: Date }>(
      `SELECT snapshot_id,content_hash,payload,received_at FROM governed_strategy_snapshots WHERE owner_id=$1 AND test_run_id=$2 AND strategy_id=$3`,
      [input.ownerId, input.testRunId, input.strategyId]
    );
    const row = existing.rows[0];
    if (!row || row.content_hash.trim() !== contentHash) throw new Error("STRATEGY_SNAPSHOT_IDEMPOTENCY_CONFLICT");
    return { ...row.payload, snapshotId: row.snapshot_id, status: "RECEIVED", receivedAt: row.received_at.toISOString(), replayed: true };
  }

  async find(ownerId: string, testRunId: string, strategyId: string): Promise<ReceivedStrategySnapshot | null> {
    const result = await this.pool.query<{ snapshot_id: string; payload: StrategySnapshotInput; received_at: Date }>(
      `SELECT snapshot_id,payload,received_at FROM governed_strategy_snapshots WHERE owner_id=$1 AND test_run_id=$2 AND strategy_id=$3`, [ownerId, testRunId, strategyId]
    );
    const row = result.rows[0];
    return row ? { ...row.payload, snapshotId: row.snapshot_id, status: "RECEIVED", receivedAt: row.received_at.toISOString(), replayed: true } : null;
  }
}
