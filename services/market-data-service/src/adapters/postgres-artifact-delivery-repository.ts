import type { Pool, QueryResultRow } from "pg";
import { DataVersionConflict, ProjectAccessDenied } from "../domain/project-delivery-errors.js";
import type { ArtifactDeliveryPort, ArtifactTaskClaim, ArtifactTaskRecord, PublishedTaskArtifact } from "../ports/artifact-delivery.js";

type ArtifactRow = QueryResultRow & { project_id: string; data_version: string; row_number: number; payload: unknown };
type ArtifactTaskRow = QueryResultRow & { task_id: string; artifact_id: string; fixture_version: string; status: ArtifactTaskRecord["status"]; sha256: string | null; error: string | null; fence: number; worker_id: string | null; created_at: Date | string; updated_at: Date | string };

/** Durable, project-scoped rows behind the DC-06 artifact page API. */
export class ArtifactDeliveryRepository implements ArtifactDeliveryPort {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`
      CREATE TABLE IF NOT EXISTS market_data_artifact_rows (
        artifact_id TEXT NOT NULL REFERENCES market_data_collection_artifacts(artifact_id),
        project_id TEXT NOT NULL,
        data_version TEXT NOT NULL,
        row_number INTEGER NOT NULL CHECK (row_number >= 0),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (artifact_id, project_id, row_number)
      );
      CREATE INDEX IF NOT EXISTS market_data_artifact_rows_page_idx
        ON market_data_artifact_rows(project_id, artifact_id, data_version, row_number);
      CREATE TABLE IF NOT EXISTS market_data_artifact_tasks (
        task_id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL,
        fixture_version TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
        sha256 CHAR(64),
        error TEXT,
        fence BIGINT NOT NULL DEFAULT 0 CHECK (fence >= 0),
        worker_id TEXT,
        lease_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS market_data_task_artifacts (
        task_id TEXT PRIMARY KEY REFERENCES market_data_artifact_tasks(task_id),
        artifact_id TEXT NOT NULL UNIQUE,
        fixture_version TEXT NOT NULL,
        sha256 CHAR(64) NOT NULL,
        content BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // Additive upgrade for task records created by the status-only implementation.
    await queryable.query(`
      ALTER TABLE market_data_artifact_tasks DROP CONSTRAINT IF EXISTS market_data_artifact_tasks_status_check;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS artifact_id TEXT;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS fixture_version TEXT;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS sha256 CHAR(64);
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS error TEXT;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS fence BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS worker_id TEXT;
      ALTER TABLE market_data_artifact_tasks ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
      UPDATE market_data_artifact_tasks SET artifact_id='legacy:'||task_id WHERE artifact_id IS NULL;
      UPDATE market_data_artifact_tasks SET fixture_version='legacy-unavailable' WHERE fixture_version IS NULL;
      ALTER TABLE market_data_artifact_tasks ALTER COLUMN artifact_id SET NOT NULL;
      ALTER TABLE market_data_artifact_tasks ALTER COLUMN fixture_version SET NOT NULL;
      ALTER TABLE market_data_artifact_tasks ADD CONSTRAINT market_data_artifact_tasks_status_check CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'));
      CREATE UNIQUE INDEX IF NOT EXISTS market_data_artifact_tasks_artifact_id_idx ON market_data_artifact_tasks(artifact_id);
      CREATE INDEX IF NOT EXISTS market_data_artifact_tasks_claim_idx ON market_data_artifact_tasks(status, lease_until, created_at);
    `);
  }

  async createTask(taskId: string, fixtureVersion: string): Promise<ArtifactTaskRecord> {
    const result = await this.pool.query<ArtifactTaskRow>(`
      INSERT INTO market_data_artifact_tasks(task_id, artifact_id, fixture_version, status)
      VALUES ($1, $2, $3, 'QUEUED')
      RETURNING task_id, artifact_id, fixture_version, status, sha256, error, fence, created_at, updated_at
    `, [taskId, `artifact:${taskId}`, fixtureVersion]);
    return this.toTask(result.rows[0]);
  }

  async findTask(taskId: string): Promise<ArtifactTaskRecord | null> {
    const result = await this.pool.query<ArtifactTaskRow>(`
      SELECT task_id, artifact_id, fixture_version, status, sha256, error, fence, worker_id, created_at, updated_at
      FROM market_data_artifact_tasks WHERE task_id=$1
    `, [taskId]);
    return result.rows[0] ? this.toTask(result.rows[0]) : null;
  }

  async cancelTask(taskId: string): Promise<ArtifactTaskRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const changed = await client.query<ArtifactTaskRow>(`
      UPDATE market_data_artifact_tasks
      SET status='CANCELLED', fence=fence+1, lease_until=NULL, updated_at=now()
      WHERE task_id=$1 AND status IN ('QUEUED','RUNNING')
      RETURNING task_id, artifact_id, fixture_version, status, sha256, error, fence, worker_id, created_at, updated_at
      `, [taskId]);
      const row = changed.rows[0] ?? (await client.query<ArtifactTaskRow>(`SELECT task_id, artifact_id, fixture_version, status, sha256, error, fence, worker_id, created_at, updated_at FROM market_data_artifact_tasks WHERE task_id=$1`, [taskId])).rows[0];
      await client.query("COMMIT");
      return row ? this.toTask(row) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async claimTask(workerId: string, leaseMs: number): Promise<ArtifactTaskClaim | null> {
    const result = await this.pool.query<ArtifactTaskRow>(`
      WITH candidate AS (
        SELECT task_id FROM market_data_artifact_tasks
        WHERE (status='QUEUED' OR (status='RUNNING' AND lease_until < now()))
        ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      UPDATE market_data_artifact_tasks task
      SET status='RUNNING', fence=fence+1, worker_id=$1, lease_until=now()+($2::text||' milliseconds')::interval, error=NULL, updated_at=now()
      FROM candidate WHERE task.task_id=candidate.task_id
      RETURNING task.task_id, task.artifact_id, task.fixture_version, task.status, task.sha256, task.error, task.fence, task.worker_id, task.created_at, task.updated_at
    `, [workerId, leaseMs]);
    const row = result.rows[0];
    return row ? this.toTask(row) as ArtifactTaskClaim : null;
  }

  async publishTask(taskId: string, fence: number, bytes: Uint8Array, sha256: string): Promise<ArtifactTaskRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query<ArtifactTaskRow>(`SELECT task_id, artifact_id, fixture_version, status, sha256, error, fence, worker_id, created_at, updated_at FROM market_data_artifact_tasks WHERE task_id=$1 FOR UPDATE`, [taskId]);
      const task = locked.rows[0];
      if (!task || task.status !== "RUNNING" || Number(task.fence) !== fence) {
        await client.query("ROLLBACK");
        return task ? this.toTask(task) : null;
      }
      const content = Buffer.from(bytes);
      const inserted = await client.query(`INSERT INTO market_data_task_artifacts(task_id, artifact_id, fixture_version, sha256, content)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (task_id) DO NOTHING RETURNING task_id`, [taskId, task.artifact_id, task.fixture_version, sha256, content]);
      if (inserted.rowCount !== 1) {
        const existing = await client.query<QueryResultRow & { artifact_id: string; fixture_version: string; sha256: string; content: Buffer }>(
          "SELECT artifact_id, fixture_version, sha256, content FROM market_data_task_artifacts WHERE task_id=$1",
          [taskId],
        );
        const publishedBytes = existing.rows[0];
        if (!publishedBytes || publishedBytes.artifact_id !== task.artifact_id || publishedBytes.fixture_version !== task.fixture_version || publishedBytes.sha256.trim() !== sha256 || !publishedBytes.content.equals(content)) {
          throw new Error("immutable Artifact already exists with different publication content");
        }
      }
      const published = await client.query<ArtifactTaskRow>(`UPDATE market_data_artifact_tasks SET status='COMPLETED', sha256=$3, lease_until=NULL, worker_id=NULL, updated_at=now() WHERE task_id=$1 AND status='RUNNING' AND fence=$2 RETURNING task_id, artifact_id, fixture_version, status, sha256, error, fence, worker_id, created_at, updated_at`, [taskId, fence, sha256]);
      if (!published.rows[0]) throw new Error("artifact task lost its publication fence");
      await client.query("COMMIT");
      return this.toTask(published.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async failTask(taskId: string, fence: number, message: string): Promise<void> {
    await this.pool.query(`UPDATE market_data_artifact_tasks SET status='FAILED', error=$3, lease_until=NULL, worker_id=NULL, updated_at=now() WHERE task_id=$1 AND fence=$2 AND status='RUNNING'`, [taskId, fence, message.slice(0, 1000)]);
  }

  async readTaskArtifact(taskId: string): Promise<PublishedTaskArtifact | null> {
    const result = await this.pool.query<QueryResultRow & { task_id: string; artifact_id: string; fixture_version: string; sha256: string; content: Buffer; created_at: Date | string }>(`SELECT task_id, artifact_id, fixture_version, sha256, content, created_at FROM market_data_task_artifacts WHERE task_id=$1`, [taskId]);
    const row = result.rows[0];
    return row ? { taskId: row.task_id, artifactId: row.artifact_id, fixtureVersion: row.fixture_version, sha256: row.sha256.trim(), bytes: row.content, createdAt: new Date(row.created_at).toISOString() } : null;
  }

  private toTask(row: ArtifactTaskRow): ArtifactTaskRecord {
    return {
      taskId: row.task_id,
      artifactId: row.artifact_id,
      fixtureVersion: row.fixture_version,
      status: row.status,
      sha256: row.sha256?.trim() ?? null,
      error: row.error,
      fence: Number(row.fence),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async publishRows(projectId: string, artifactId: string, dataVersion: string, items: unknown[]): Promise<number> {
    const existing = await this.pool.query<QueryResultRow & { project_id: string; data_version: string }>(
      "SELECT project_id, data_version FROM market_data_artifact_rows WHERE artifact_id=$1 LIMIT 1",
      [artifactId],
    );
    if (existing.rows[0] && existing.rows[0].project_id !== projectId) throw new ProjectAccessDenied("artifact belongs to another project");
    if (existing.rows[0] && existing.rows[0].data_version !== dataVersion) throw new DataVersionConflict("artifact DataVersion is immutable");
    for (const [rowNumber, payload] of items.entries()) {
      await this.pool.query(`
        INSERT INTO market_data_artifact_rows (artifact_id, project_id, data_version, row_number, payload)
        VALUES ($1,$2,$3,$4,$5::jsonb)
        ON CONFLICT (artifact_id, project_id, row_number) DO UPDATE
          SET payload=EXCLUDED.payload, data_version=EXCLUDED.data_version
      `, [artifactId, projectId, dataVersion, rowNumber, JSON.stringify(payload)]);
    }
    return items.length;
  }

  async page(projectId: string, artifactId: string, requestedVersion: string, cursor: number, pageSize: number): Promise<{ dataVersion: string; items: unknown[]; nextCursor: string | null }> {
    const first = await this.pool.query<ArtifactRow>(
      "SELECT project_id, data_version, row_number, payload FROM market_data_artifact_rows WHERE artifact_id=$1 ORDER BY row_number LIMIT 1",
      [artifactId],
    );
    if (!first.rows[0]) return { dataVersion: requestedVersion, items: [], nextCursor: null };
    if (first.rows[0].project_id !== projectId) throw new ProjectAccessDenied("artifact belongs to another project");
    if (first.rows[0].data_version !== requestedVersion) throw new DataVersionConflict("requested DataVersion is no longer available");
    const size = Math.max(1, Math.min(pageSize, 500));
    const result = await this.pool.query<ArtifactRow>(
      "SELECT data_version, row_number, payload FROM market_data_artifact_rows WHERE artifact_id=$1 AND project_id=$2 ORDER BY row_number OFFSET $3 LIMIT $4",
      [artifactId, projectId, Math.max(0, cursor), size + 1],
    );
    const rows = result.rows.slice(0, size);
    const nextCursor = result.rows.length > size ? String(Math.max(0, cursor) + size) : null;
    return { dataVersion: requestedVersion, items: rows.map((row) => row.payload), nextCursor };
  }
}
