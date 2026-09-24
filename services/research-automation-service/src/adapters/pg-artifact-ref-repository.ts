import type { Pool } from "pg";
import type { ArtifactRef } from "../application/v31-runtime-guards.js";

type Row = { schema_version: ArtifactRef["schemaVersion"]; namespace: string; artifact_id: string; kind: ArtifactRef["kind"]; sha256: string; status: ArtifactRef["status"]; source_ref: string; created_at: Date; updated_at: Date };

const mapRow = (row: Row): ArtifactRef => ({
  schemaVersion: row.schema_version,
  namespace: row.namespace,
  artifactId: row.artifact_id,
  kind: row.kind,
  sha256: row.sha256,
  status: row.status,
  sourceRef: row.source_ref,
});

export class PgArtifactRefRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_artifact_refs (
      schema_version TEXT NOT NULL CHECK (schema_version = 'v3.1-artifact-ref-v1'),
      namespace TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
      status TEXT NOT NULL CHECK (status IN ('PENDING','PUBLISHED','FAILED','RETAINED')),
      source_ref TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(namespace, artifact_id)
    )`);
  }

  async save(ref: ArtifactRef): Promise<ArtifactRef> {
    const result = await this.pool.query<Row>(`INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(namespace,artifact_id) DO UPDATE SET schema_version=EXCLUDED.schema_version,kind=EXCLUDED.kind,sha256=EXCLUDED.sha256,status=EXCLUDED.status,source_ref=EXCLUDED.source_ref,updated_at=now()
      RETURNING *`, [ref.schemaVersion, ref.namespace, ref.artifactId, ref.kind, ref.sha256, ref.status, ref.sourceRef]);
    return mapRow(result.rows[0]);
  }

  async get(namespace: string, artifactId: string): Promise<ArtifactRef | null> {
    const result = await this.pool.query<Row>("SELECT * FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
}
