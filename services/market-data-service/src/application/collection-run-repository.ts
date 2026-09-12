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
  publishedArtifactId: string | null;
};

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
        published_artifact_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS market_data_collection_runs_status_idx ON market_data_collection_runs(status, lease_until);
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
      WHERE run_id=$1 AND status IN ('QUEUED','WAITING_RETRY','PARTIAL')
        AND (lease_until IS NULL OR lease_until < now())
      RETURNING *
    `, [runId, leaseSeconds]);
    return result.rowCount === 1 ? this.map(result.rows[0]) : null;
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

  async publish(runId: string, fencingToken: number, artifactId: string): Promise<CollectionRun> {
    const result = await this.pool.query<Row>(`
      UPDATE market_data_collection_runs
      SET status='COMPLETED', published_artifact_id=$3, lease_until=NULL, version=version+1, updated_at=now()
      WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
      RETURNING *
    `, [runId, fencingToken, artifactId]);
    if (result.rowCount !== 1) throw new CollectionRunConflict("publish rejected: lease is stale or run is not running");
    return this.map(result.rows[0]);
  }

  async releaseToRetry(runId: string, fencingToken: number): Promise<CollectionRun> {
    const result = await this.pool.query<Row>(`
      UPDATE market_data_collection_runs
      SET status='WAITING_RETRY', lease_until=NULL, version=version+1, updated_at=now()
      WHERE run_id=$1 AND fencing_token=$2 AND status='RUNNING'
      RETURNING *
    `, [runId, fencingToken]);
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
      fencingToken: row.fencing_token,
      leaseUntil: row.lease_until?.toISOString() ?? null,
      publishedArtifactId: row.published_artifact_id,
    };
  }
}

export type CollectionRunClient = PoolClient;
