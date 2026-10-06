import type { Pool } from "pg";
import { ResearchCheckpointConflict, type ResearchCheckpoint } from "../domain/research-checkpoint.js";
import type { CheckpointAppendResult, ResearchCheckpointRepository } from "../ports/research-checkpoint-repository.js";

type Row = {
  schema_version: "v3.3-research-checkpoint-v1";
  test_run_id: string;
  experiment_id: string;
  round_index: number;
  checkpoint_sequence: number | string;
  state: Record<string, unknown>;
  state_sha256: string;
  created_at: Date;
};

const mapRow = (row: Row): ResearchCheckpoint => ({
  schemaVersion: row.schema_version,
  testRunId: row.test_run_id,
  experimentId: row.experiment_id,
  roundIndex: row.round_index,
  sequence: Number(row.checkpoint_sequence),
  state: row.state,
  stateSha256: row.state_sha256.trim(),
  createdAt: row.created_at.toISOString(),
});

export class PgResearchCheckpointRepository implements ResearchCheckpointRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_checkpoints (
      schema_version TEXT NOT NULL CHECK (schema_version='v3.3-research-checkpoint-v1'),
      test_run_id UUID NOT NULL,
      experiment_id UUID NOT NULL REFERENCES research_experiments(experiment_id) ON DELETE RESTRICT,
      round_index INTEGER NOT NULL CHECK (round_index BETWEEN 1 AND 3),
      checkpoint_sequence BIGINT NOT NULL CHECK (checkpoint_sequence > 0),
      state JSONB NOT NULL CHECK (jsonb_typeof(state)='object'),
      state_sha256 CHAR(64) NOT NULL CHECK (state_sha256 ~ '^[a-f0-9]{64}$'),
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (test_run_id, experiment_id, round_index, checkpoint_sequence)
    );
    CREATE INDEX IF NOT EXISTS research_checkpoints_latest_idx
      ON research_checkpoints(test_run_id,experiment_id,round_index,checkpoint_sequence DESC)`);
  }

  async append(checkpoint: ResearchCheckpoint): Promise<CheckpointAppendResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const experiment = await client.query<{ test_run_id: string | null; rounds: number }>(
        "SELECT test_run_id,rounds FROM research_experiments WHERE experiment_id=$1 FOR UPDATE",
        [checkpoint.experimentId],
      );
      if (experiment.rowCount !== 1) throw new ResearchCheckpointConflict("experiment not found", 404);
      const storedExperiment = experiment.rows[0];
      if (storedExperiment.test_run_id !== checkpoint.testRunId) throw new ResearchCheckpointConflict("checkpoint TestRun does not match its experiment", 409);
      if (checkpoint.roundIndex > storedExperiment.rounds) throw new ResearchCheckpointConflict("checkpoint round is outside the experiment allocation", 409);

      const existing = await client.query<Row>(`SELECT * FROM research_checkpoints
        WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=$3 AND checkpoint_sequence=$4`,
      [checkpoint.testRunId, checkpoint.experimentId, checkpoint.roundIndex, checkpoint.sequence]);
      if (existing.rowCount === 1) {
        const current = mapRow(existing.rows[0]);
        if (current.stateSha256 !== checkpoint.stateSha256) throw new ResearchCheckpointConflict("checkpoint sequence already contains different state", 409);
        await client.query("COMMIT");
        return { checkpoint: current, existing: true };
      }

      const latest = await client.query<{ checkpoint_sequence: string | null }>(`SELECT MAX(checkpoint_sequence) AS checkpoint_sequence
        FROM research_checkpoints WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=$3`,
      [checkpoint.testRunId, checkpoint.experimentId, checkpoint.roundIndex]);
      const nextSequence = Number(latest.rows[0]?.checkpoint_sequence ?? 0) + 1;
      if (checkpoint.sequence !== nextSequence) throw new ResearchCheckpointConflict(`checkpoint sequence must be ${nextSequence}`, 409);
      const inserted = await client.query<Row>(`INSERT INTO research_checkpoints
        (schema_version,test_run_id,experiment_id,round_index,checkpoint_sequence,state,state_sha256,created_at)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING *`,
      [checkpoint.schemaVersion, checkpoint.testRunId, checkpoint.experimentId, checkpoint.roundIndex, checkpoint.sequence, JSON.stringify(checkpoint.state), checkpoint.stateSha256, checkpoint.createdAt]);
      await client.query("COMMIT");
      return { checkpoint: mapRow(inserted.rows[0]), existing: false };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ResearchCheckpointConflict) throw error;
      if ((error as { code?: string }).code === "23505") throw new ResearchCheckpointConflict("checkpoint sequence raced with another writer; reload latest before retrying", 409);
      throw error;
    } finally {
      client.release();
    }
  }

  async latest(testRunId: string, experimentId: string, roundIndex: number): Promise<ResearchCheckpoint | null> {
    const result = await this.pool.query<Row>(`SELECT * FROM research_checkpoints
      WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=$3
      ORDER BY checkpoint_sequence DESC LIMIT 1`, [testRunId, experimentId, roundIndex]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async list(testRunId: string, experimentId: string, roundIndex: number): Promise<ResearchCheckpoint[]> {
    const result = await this.pool.query<Row>(`SELECT * FROM research_checkpoints
      WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=$3
      ORDER BY checkpoint_sequence`, [testRunId, experimentId, roundIndex]);
    return result.rows.map(mapRow);
  }
}
