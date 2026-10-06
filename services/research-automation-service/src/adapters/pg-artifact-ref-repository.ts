import type { Pool, PoolClient } from "pg";
import { canTransitionArtifactStatus, validateArtifactRef, type ArtifactRef } from "../domain/artifact-ref.js";
import type { ArtifactRefRepository } from "../ports/artifact-ref-repository.js";

type Row = { schema_version: ArtifactRef["schemaVersion"]; namespace: string; artifact_id: string; kind: ArtifactRef["kind"]; sha256: string; status: ArtifactRef["status"]; source_ref: string; expires_at: Date | null; created_at: Date; updated_at: Date };

const mapRow = (row: Row): ArtifactRef => ({
  schemaVersion: row.schema_version,
  namespace: row.namespace,
  artifactId: row.artifact_id,
  kind: row.kind,
  sha256: row.sha256,
  status: row.status,
  sourceRef: row.source_ref,
  expiresAt: row.expires_at?.toISOString() ?? null,
});

export class PgArtifactRefRepository implements ArtifactRefRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_artifact_refs (
      schema_version TEXT NOT NULL CHECK (schema_version = 'v3.1-artifact-ref-v1'),
      namespace TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
      status TEXT NOT NULL CHECK (status IN ('PENDING','PUBLISHED','FAILED','RETAINED','EXPIRED')),
      source_ref TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(namespace, artifact_id)
    )`);
    await this.pool.query("ALTER TABLE research_artifact_refs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
    // Upgrade databases created before EXPIRED became part of the ArtifactRef lifecycle.
    await this.pool.query("ALTER TABLE research_artifact_refs DROP CONSTRAINT IF EXISTS research_artifact_refs_status_check");
    await this.pool.query("ALTER TABLE research_artifact_refs ADD CONSTRAINT research_artifact_refs_status_check CHECK (status IN ('PENDING','PUBLISHED','FAILED','RETAINED','EXPIRED'))");
  }

  async save(ref: ArtifactRef): Promise<ArtifactRef> {
    return this.saveWith(ref, this.pool);
  }

  async saveWithinTransaction(client: PoolClient, ref: ArtifactRef): Promise<ArtifactRef> {
    return this.saveWith(ref, client);
  }

  private async saveWith(ref: ArtifactRef, queryable: Pick<Pool, "query"> | PoolClient): Promise<ArtifactRef> {
    validateArtifactRef(ref);
    const expiresAt = ref.expiresAt ?? null;
    const result = await queryable.query<Row>(`INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(namespace,artifact_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()
      WHERE research_artifact_refs.schema_version=EXCLUDED.schema_version
        AND research_artifact_refs.kind=EXCLUDED.kind
        AND research_artifact_refs.sha256=EXCLUDED.sha256
        AND research_artifact_refs.source_ref=EXCLUDED.source_ref
        AND research_artifact_refs.expires_at IS NOT DISTINCT FROM EXCLUDED.expires_at
        AND (research_artifact_refs.status=EXCLUDED.status
          OR (research_artifact_refs.status='PENDING' AND EXCLUDED.status IN ('PUBLISHED','FAILED'))
          OR (research_artifact_refs.status='PUBLISHED' AND EXCLUDED.status IN ('RETAINED','EXPIRED'))
          OR (research_artifact_refs.status='RETAINED' AND EXCLUDED.status='EXPIRED'))
        AND (EXCLUDED.status<>'EXPIRED' OR (EXCLUDED.expires_at IS NOT NULL AND EXCLUDED.expires_at<=now()))
      RETURNING *`, [ref.schemaVersion, ref.namespace, ref.artifactId, ref.kind, ref.sha256, ref.status, ref.sourceRef, expiresAt]);
    if (!result.rows[0]) {
      const current = await queryable.query<Row>("SELECT * FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [ref.namespace, ref.artifactId]);
      if (current.rows[0] && !canTransitionArtifactStatus(current.rows[0].status, ref.status)) throw new Error(`artifact status transition ${current.rows[0].status} -> ${ref.status} is not allowed`);
      throw new Error("artifact reference identity is immutable; publish changed content under a new artifactId");
    }
    return mapRow(result.rows[0]);
  }

  async get(namespace: string, artifactId: string): Promise<ArtifactRef | null> {
    const result = await this.pool.query<Row>("SELECT * FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listAll(): Promise<ArtifactRef[]> {
    const result = await this.pool.query<Row>("SELECT * FROM research_artifact_refs ORDER BY namespace, artifact_id");
    return result.rows.map(mapRow);
  }
}
