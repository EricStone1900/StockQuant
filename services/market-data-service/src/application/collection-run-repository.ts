import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";

export type CollectionRunStatus = "QUEUED" | "RUNNING" | "WAITING_RETRY" | "WAITING_DEPENDENCY" | "PARTIAL" | "COMPLETED" | "FAILED" | "PAUSED" | "CANCELLED";

export type CollectionRunRequest = {
  subscriptionId: string;
  subscriptionVersion: number;
  windowStart: string;
  windowEnd: string;
  jobKind: "INTRADAY_WINDOW" | "CLOSE_RECONCILIATION" | "BACKFILL" | "GAP_REPAIR";
  idempotencyKey: string;
  requestHash: string;
};

export type CollectionRun = CollectionRunRequest & {
  runId: string;
  status: CollectionRunStatus;
  version: number;
  checkpoint: Record<string, unknown> | null;
  fencingToken: number;
  leaseUntil: string | null;
  retryAt: string | null;
  publishedArtifactId: string | null;
};

export type CollectionOutboxEvent = { eventId: string; eventKey: string; runId: string; eventType: "collection.run.completed.v1"; payload: Record<string, unknown>; sentAt: string | null };
export type CollectionArtifact = { artifactId: string; runId: string; sha256: string; rowCount: number };

type Row = QueryResultRow & {
  run_id: string;
  subscription_id: string;
  subscription_version: number;
  window_start: Date;
  window_end: Date;
  job_kind: CollectionRun["jobKind"];
  idempotency_key: string;
  request_hash: string;
  status: CollectionRunStatus;
  version: number;
  checkpoint: Record<string, unknown> | null;
  fencing_token: number;
  lease_until: Date | null;
  retry_at: Date | null;
  published_artifact_id: string | null;
};

export class CollectionRunConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionRunConflict";
  }
}

export class CollectionRunRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_collection_runs (
        run_id UUID PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        subscription_version INTEGER NOT NULL CHECK (subscription_version > 0),
        window_start TIMESTAMPTZ NOT NULL,
        window_end TIMESTAMPTZ NOT NULL CHECK (window_end > window_start),
        job_kind TEXT NOT NULL CHECK (job_kind IN ('INTRADAY_WINDOW','CLOSE_RECONCILIATION','BACKFILL','GAP_REPAIR')),
        idempotency_key TEXT NOT NULL UNIQUE,
        request_hash CHAR(64) NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','WAITING_RETRY','WAITING_DEPENDENCY','PARTIAL','COMPLETED','FAILED','PAUSED','CANCELLED')),
        version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
        checkpoint JSONB,
        fencing_token BIGINT NOT NULL DEFAULT 0 CHECK (fencing_token >= 0),
        lease_until TIMESTAMPTZ,
        retry_at TIMESTAMPTZ,
        published_artifact_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE market_data_collection_runs ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS market_data_collection_runs_status_idx ON market_data_collection_runs(status, lease_until);
      CREATE INDEX IF NOT EXISTS market_data_collection_runs_retry_idx ON market_data_collection_runs(status, retry_at);
      CREATE TABLE IF NOT EXISTS market_data_collection_artifacts (
        artifact_id TEXT PRIMARY KEY,
        run_id UUID NOT NULL REFERENCES market_data_collection_runs(run_id),
        sha256 CHAR(64) NOT NULL,
        row_count INTEGER NOT NULL CHECK (row_count >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS market_data_collection_outbox (
        event_id UUID PRIMARY KEY,
        event_key TEXT NOT NULL UNIQUE,
        run_id UUID NOT NULL REFERENCES market_data_collection_runs(run_id),
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS market_data_collection_outbox_pending_idx ON market_data_collection_outbox(sent_at) WHERE sent_at IS NULL;
    `);
  }

  async create(request: CollectionRunRequest): Promise<{ run: CollectionRun; created: boolean }> {
    const result = await this.pool.query<Row>(`
      INSERT INTO market_data_collection_runs
        (run_id, subscription_id, subscription_version, window_start, window_end, job_kind, idempotency_key, request_hash, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'QUEUED')
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [randomUUID(), request.subscriptionId, request.subscriptionVersion, request.windowStart, request.windowEnd, request.jobKind, request.idempotencyKey, request.requestHash]);
    if (result.rowCount === 1) return { run: this.map(result.rows[0]), created: true };
    const existing = await this.pool.query<Row>("SELECT * FROM market_data_collection_runs WHERE idempotency_key=$1", [request.idempotencyKey]);
    if (existing.rowCount !== 1) throw new Error("collection run disappeared after idempotent insert");
    if (existing.rows[0].request_hash !== request.requestHash) throw new CollectionRunConflict("idempotency key was reused with a different request");
    return { run: this.map(existing.rows[0]), created: false };
  }

  async claim(runId: string, leaseSeconds: number): Promise<CollectionRun | null> {
    const result = await this.pool.query<Row>(`
      UPDATE market_data_collection_runs
      SET status='RUNNING', fencing_token=fencing_token+1,
          lease_until=now() + ($2::double precision * interval '1 second'),
          version=version+1, updated_at=now()
      WHERE run_id=$1 AND status IN ('QUEUED','RUNNING','WAITING_RETRY','PARTIAL')
        AND (lease_until IS NULL OR lease_until < now())
        AND (retry_at IS NULL OR retry_at <= now())
      RETURNING *
    `, [runId, leaseSeconds]);
    return result.rowCount === 1 ? this.map(result.rows[0]) : null;
  }

  async runnableRunIds(limit = 10, subscriptionId?: string): Promise<string[]> {
    const filter = subscriptionId ? " AND subscription_id=$2" : "";
    const result = await this.pool.query<{ run_id: string }>(`
      SELECT run_id FROM market_data_collection_runs
      WHERE status IN ('QUEUED','WAITING_RETRY','PARTIAL')
        AND (lease_until IS NULL OR lease_until < now())
        AND (retry_at IS NULL OR retry_at <= now())
        ${filter}
      ORDER BY created_at, run_id
      LIMIT $1
    `, subscriptionId ? [Math.max(1, Math.min(limit, 100)), subscriptionId] : [Math.max(1, Math.min(limit, 100))]);
    return result.rows.map((row) => row.run_id);
  }

  async find(runId: string): Promise<CollectionRun | null> {
    const result = await this.pool.query<Row>("SELECT * FROM market_data_collection_runs WHERE run_id=$1", [runId]);
    return result.rowCount === 1 ? this.map(result.rows[0]) : null;
  }

  async checkpoint(runId: string, fencingToken: number, checkpoint: Record<string, unknown>): Promise<CollectionRun> {
    const result = await this.pool.query<Row>(`
      UPDATE market_data_collection_runs
      SET checkpoint=$3::jsonb, version=version+1, updated_at=now()
      WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
      RETURNING *
    `, [runId, fencingToken, JSON.stringify(checkpoint)]);
    if (result.rowCount !== 1) throw new CollectionRunConflict("checkpoint rejected: lease is stale or run is not running");
    return this.map(result.rows[0]);
  }

  async publish(runId: string, fencingToken: number, artifactId: string, artifact?: { sha256: string; rowCount: number }): Promise<CollectionRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<Row>(`
      UPDATE market_data_collection_runs
      SET status='COMPLETED', published_artifact_id=$3, lease_until=NULL, version=version+1, updated_at=now()
      WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
      RETURNING *
      `, [runId, fencingToken, artifactId]);
      if (result.rowCount !== 1) throw new CollectionRunConflict("publish rejected: lease is stale or run is not running");
      if (artifact) {
        await client.query(`
          INSERT INTO market_data_collection_artifacts (artifact_id, run_id, sha256, row_count)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (artifact_id) DO UPDATE SET run_id=EXCLUDED.run_id, sha256=EXCLUDED.sha256, row_count=EXCLUDED.row_count
        `, [artifactId, runId, artifact.sha256, artifact.rowCount]);
      }
      await client.query(`
        INSERT INTO market_data_collection_outbox (event_id, event_key, run_id, event_type, payload)
        VALUES ($1,$2,$3,'collection.run.completed.v1',$4::jsonb)
        ON CONFLICT (event_key) DO NOTHING
      `, [randomUUID(), `collection-run:${runId}:completed`, runId, JSON.stringify({ runId, artifactId, ...(artifact ?? {}) })]);
      await client.query("COMMIT");
      return this.map(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async publishRows(input: { runId: string; fencingToken: number; artifactId: string; sha256: string; projectId: string; dataVersion: string; rows: unknown[] }): Promise<CollectionRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<Row>(`
        UPDATE market_data_collection_runs
        SET status='COMPLETED', published_artifact_id=$3, lease_until=NULL, retry_at=NULL, version=version+1, updated_at=now()
        WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
        RETURNING *
      `, [input.runId, input.fencingToken, input.artifactId]);
      if (result.rowCount !== 1) throw new CollectionRunConflict("publish rejected: lease is stale or run is not running");
      await client.query(`
        INSERT INTO market_data_collection_artifacts (artifact_id, run_id, sha256, row_count)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (artifact_id) DO UPDATE SET run_id=EXCLUDED.run_id, sha256=EXCLUDED.sha256, row_count=EXCLUDED.row_count
      `, [input.artifactId, input.runId, input.sha256, input.rows.length]);
      for (const [rowNumber, payload] of input.rows.entries()) {
        await client.query(`
          INSERT INTO market_data_artifact_rows (artifact_id, project_id, data_version, row_number, payload)
          VALUES ($1,$2,$3,$4,$5::jsonb)
          ON CONFLICT (artifact_id, project_id, row_number) DO UPDATE SET payload=EXCLUDED.payload, data_version=EXCLUDED.data_version
        `, [input.artifactId, input.projectId, input.dataVersion, rowNumber, JSON.stringify(payload)]);
      }
      await client.query(`
        INSERT INTO market_data_collection_outbox (event_id, event_key, run_id, event_type, payload)
        VALUES ($1,$2,$3,'collection.run.completed.v1',$4::jsonb)
        ON CONFLICT (event_key) DO NOTHING
      `, [randomUUID(), `collection-run:${input.runId}:completed`, input.runId, JSON.stringify({ runId: input.runId, artifactId: input.artifactId, sha256: input.sha256, rowCount: input.rows.length })]);
      await client.query("COMMIT");
      return this.map(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async pendingEvents(limit = 100): Promise<CollectionOutboxEvent[]> {
    const result = await this.pool.query<Record<string, any>>("SELECT * FROM market_data_collection_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT $1", [limit]);
    return result.rows.map((row) => ({ eventId: row.event_id, eventKey: row.event_key, runId: row.run_id, eventType: row.event_type, payload: row.payload, sentAt: row.sent_at?.toISOString() ?? null }));
  }

  async markEventSent(eventId: string): Promise<void> {
    await this.pool.query("UPDATE market_data_collection_outbox SET sent_at=now() WHERE event_id=$1 AND sent_at IS NULL", [eventId]);
  }

  async findArtifact(artifactId: string): Promise<CollectionArtifact | null> {
    const result = await this.pool.query<Record<string, any>>("SELECT artifact_id, run_id, sha256, row_count FROM market_data_collection_artifacts WHERE artifact_id=$1", [artifactId]);
    const row = result.rows[0];
    return row ? { artifactId: row.artifact_id, runId: row.run_id, sha256: row.sha256.trim(), rowCount: Number(row.row_count) } : null;
  }

  async releaseToRetry(runId: string, fencingToken: number, retrySeconds = 300): Promise<CollectionRun> {
    const result = await this.pool.query<Row>(`
      UPDATE market_data_collection_runs
      SET status='WAITING_RETRY', lease_until=NULL, retry_at=now()+($3::double precision * interval '1 second'), version=version+1, updated_at=now()
      WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
      RETURNING *
    `, [runId, fencingToken, retrySeconds]);
    if (result.rowCount !== 1) throw new CollectionRunConflict("retry transition rejected: lease is stale or run is not running");
    return this.map(result.rows[0]);
  }

  private map(row: Row): CollectionRun {
    return {
      runId: row.run_id,
      subscriptionId: row.subscription_id,
      subscriptionVersion: row.subscription_version,
      windowStart: row.window_start.toISOString(),
      windowEnd: row.window_end.toISOString(),
      jobKind: row.job_kind,
      idempotencyKey: row.idempotency_key,
      requestHash: row.request_hash,
      status: row.status,
      version: row.version,
      checkpoint: row.checkpoint,
      fencingToken: Number(row.fencing_token),
      leaseUntil: row.lease_until?.toISOString() ?? null,
      retryAt: row.retry_at?.toISOString() ?? null,
      publishedArtifactId: row.published_artifact_id,
    };
  }
}

export type CollectionRunClient = PoolClient;
