import { createHash } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import type { QlibArtifactContentStore } from "./qlib-artifact-content-store.js";
import type { QlibFixtureArtifact, QlibFixtureArtifactRepository } from "../ports/qlib-fixture-artifact-repository.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export class PostgresQlibFixtureArtifactRepository implements QlibFixtureArtifactRepository {
  constructor(private readonly pool: Pool, private readonly contentStore: QlibArtifactContentStore) {}

  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS qlib_fixture_artifacts (
      artifact_id CHAR(64) NOT NULL CHECK (artifact_id ~ '^[a-f0-9]{64}$'),
      test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
      owner_id TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type='application/vnd.stockquant.qlib-fixture-model+json'),
      sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
      payload JSONB,
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING','PUBLISHED','RETAINED','EXPIRED')),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(test_run_id, artifact_id)
    );
    CREATE INDEX IF NOT EXISTS qlib_fixture_artifacts_owner_idx ON qlib_fixture_artifacts(test_run_id, owner_id);`);
    await this.pool.query(`DO $$ DECLARE primary_columns TEXT[]; BEGIN
      SELECT array_agg(attribute.attname ORDER BY key_column.ordinality) INTO primary_columns
      FROM pg_constraint constraint_row
      JOIN unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, ordinality) ON TRUE
      JOIN pg_attribute attribute ON attribute.attrelid=constraint_row.conrelid AND attribute.attnum=key_column.attnum
      WHERE constraint_row.conrelid='qlib_fixture_artifacts'::regclass AND constraint_row.contype='p'
      GROUP BY constraint_row.oid;
      IF primary_columns = ARRAY['artifact_id']::TEXT[] THEN
        ALTER TABLE qlib_fixture_artifacts DROP CONSTRAINT qlib_fixture_artifacts_pkey;
        ALTER TABLE qlib_fixture_artifacts ADD CONSTRAINT qlib_fixture_artifacts_pkey PRIMARY KEY(test_run_id, artifact_id);
      END IF;
    END $$;`);
    await this.pool.query(`ALTER TABLE qlib_fixture_artifacts ALTER COLUMN payload DROP NOT NULL;
      ALTER TABLE qlib_fixture_artifacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PUBLISHED';
      ALTER TABLE qlib_fixture_artifacts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE qlib_fixture_artifacts DROP CONSTRAINT IF EXISTS qlib_fixture_artifacts_status_check;
      ALTER TABLE qlib_fixture_artifacts ADD CONSTRAINT qlib_fixture_artifacts_status_check CHECK (status IN ('PENDING','PUBLISHED','RETAINED','EXPIRED'));
      ALTER TABLE qlib_fixture_artifacts DROP CONSTRAINT IF EXISTS qlib_fixture_artifacts_expiry_check;
      ALTER TABLE qlib_fixture_artifacts ADD CONSTRAINT qlib_fixture_artifacts_expiry_check CHECK (status <> 'EXPIRED' OR expires_at IS NOT NULL);`);
  }

  /** Move a bounded batch of legacy JSONB payloads to the immutable shared store.
   * Publish and verify first; the compare-and-set update leaves legacy bytes intact
   * whenever publishing fails or the row changes concurrently. Safe to rerun.
   */
  async backfillLegacyPayloads(limit = 100, apply = false): Promise<{ scanned: number; eligible: number; migrated: number; conflicts: number }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Qlib artifact backfill limit must be an integer from 1 to 1000");
    const selected = await this.pool.query(`SELECT artifact_id,test_run_id,sha256,payload,status
      FROM qlib_fixture_artifacts WHERE payload IS NOT NULL AND status IN ('PUBLISHED','RETAINED')
      ORDER BY created_at,artifact_id LIMIT $1`, [limit]);
    let eligible = 0;
    let migrated = 0;
    let conflicts = 0;
    for (const row of selected.rows) {
      const payload = row.payload as QlibFixtureArtifact["payload"];
      const bytes = Buffer.from(canonical(payload));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const artifactId = String(row.artifact_id).trim();
      if (sha256 !== String(row.sha256).trim() || sha256 !== artifactId) throw new Error(`legacy Qlib artifact integrity check failed for ${artifactId}`);
      eligible += 1;
      if (!apply) continue;
      const testRunId = String(row.test_run_id);
      await this.contentStore.publish(testRunId, artifactId, sha256, bytes);
      const published = Buffer.from(await this.contentStore.read(testRunId, artifactId, sha256));
      if (!published.equals(bytes)) throw new Error(`published Qlib artifact verification failed for ${artifactId}`);
      const updated = await this.pool.query(`UPDATE qlib_fixture_artifacts SET payload=NULL
        WHERE test_run_id=$1 AND artifact_id=$2 AND sha256=$3 AND payload IS NOT DISTINCT FROM $4::jsonb
          AND status IN ('PUBLISHED','RETAINED')`, [testRunId, artifactId, sha256, JSON.stringify(payload)]);
      if (updated.rowCount === 1) migrated += 1;
      else conflicts += 1;
    }
    return { scanned: selected.rows.length, eligible, migrated, conflicts };
  }

  async save(input: Omit<QlibFixtureArtifact, "artifactId" | "sha256" | "status">): Promise<QlibFixtureArtifact> {
    return this.saveWithStatus(input, "PUBLISHED");
  }

  async savePending(input: Omit<QlibFixtureArtifact, "artifactId" | "sha256" | "status">): Promise<QlibFixtureArtifact> {
    return this.saveWithStatus(input, "PENDING");
  }

  private async saveWithStatus(input: Omit<QlibFixtureArtifact, "artifactId" | "sha256" | "status">, status: "PENDING" | "PUBLISHED"): Promise<QlibFixtureArtifact> {
    const bytes = Buffer.from(canonical(input.payload));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const artifactId = sha256;
    await this.contentStore.publish(input.testRunId, artifactId, sha256, bytes);
    const result = await this.pool.query(`INSERT INTO qlib_fixture_artifacts(artifact_id,test_run_id,owner_id,media_type,sha256,payload,status)
      VALUES($1,$2,$3,$4,$5,NULL,$6) ON CONFLICT(test_run_id,artifact_id) DO NOTHING RETURNING artifact_id`,
    [artifactId, input.testRunId, input.ownerId, input.mediaType, sha256, status]);
    if (result.rowCount !== 1) {
      const existing = await this.pool.query(`SELECT owner_id,media_type,sha256,payload,status,expires_at FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2`, [input.testRunId, artifactId]);
      if (existing.rowCount !== 1 || existing.rows[0].owner_id !== input.ownerId || existing.rows[0].sha256.trim() !== sha256) throw new Error("immutable Qlib artifact conflicts with existing content");
      const existingPayload = existing.rows[0].payload === null
        ? JSON.parse(Buffer.from(await this.contentStore.read(input.testRunId, artifactId, sha256)).toString("utf8"))
        : existing.rows[0].payload;
      if (canonical(existingPayload) !== canonical(input.payload)) throw new Error("immutable Qlib artifact conflicts with existing content");
      const row = existing.rows[0];
      if (status === "PENDING" && row.status === "EXPIRED") throw new Error("expired immutable Qlib artifact cannot be reused or republished");
      return { ...input, artifactId, sha256, status: row.status, ...(row.expires_at ? { expiresAt: new Date(row.expires_at).toISOString() } : {}) };
    }
    return { ...input, artifactId, sha256, status };
  }

  async publishPending(testRunId: string, artifactId: string, ownerId: string): Promise<QlibFixtureArtifact> {
    const updated = await this.pool.query(`UPDATE qlib_fixture_artifacts SET status='PUBLISHED'
      WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3 AND status='PENDING' RETURNING artifact_id`, [testRunId, artifactId, ownerId]);
    if (updated.rowCount !== 1) {
      const existing = await this.pool.query(`SELECT status FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3`, [testRunId, artifactId, ownerId]);
      if (existing.rowCount !== 1 || existing.rows[0].status !== "PUBLISHED") throw new Error("Qlib artifact cannot be published from its current state");
    }
    return this.find(testRunId, artifactId, ownerId);
  }

  async find(testRunId: string, artifactId: string, ownerId: string): Promise<QlibFixtureArtifact> {
    const result = await this.pool.query(`SELECT artifact_id,test_run_id,owner_id,media_type,sha256,payload,status,expires_at FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3 AND status IN ('PUBLISHED','RETAINED')`, [testRunId, artifactId, ownerId]);
    if (result.rowCount !== 1) throw new NotFoundException("Qlib Fixture artifact was not found in user scope");
    const row = result.rows[0];
    const payload = (row.payload === null
      ? JSON.parse(Buffer.from(await this.contentStore.read(testRunId, row.artifact_id.trim(), row.sha256.trim())).toString("utf8"))
      : row.payload) as QlibFixtureArtifact["payload"];
    const sha256 = createHash("sha256").update(Buffer.from(canonical(payload))).digest("hex");
    if (sha256 !== row.sha256.trim() || sha256 !== row.artifact_id.trim()) throw new Error("stored Qlib artifact integrity check failed");
    return { artifactId: row.artifact_id.trim(), testRunId: row.test_run_id, ownerId: row.owner_id, mediaType: row.media_type, sha256, status: row.status, ...(row.expires_at ? { expiresAt: new Date(row.expires_at).toISOString() } : {}), payload };
  }

  async findLifecycle(testRunId: string, artifactId: string, ownerId: string): Promise<Pick<QlibFixtureArtifact, "status" | "expiresAt">> {
    const result = await this.pool.query(`SELECT status,expires_at FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3`, [testRunId, artifactId, ownerId]);
    if (result.rowCount !== 1) throw new NotFoundException("Qlib Fixture artifact was not found in user scope");
    const row = result.rows[0];
    return { status: row.status, ...(row.expires_at ? { expiresAt: new Date(row.expires_at).toISOString() } : {}) };
  }

  async transition(testRunId: string, artifactId: string, ownerId: string, status: QlibFixtureArtifact["status"]): Promise<void> {
    const result = await this.pool.query(`UPDATE qlib_fixture_artifacts SET status=$4
      WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3
        AND (status=$4 OR (status='PUBLISHED' AND $4 IN ('RETAINED','EXPIRED') AND ($4 <> 'EXPIRED' OR expires_at <= now()))
          OR (status='RETAINED' AND $4='EXPIRED' AND expires_at <= now()))`, [testRunId, artifactId, ownerId, status]);
    if (result.rowCount !== 1) throw new Error("Qlib artifact lifecycle transition is invalid or expiry has not elapsed");
  }

  async setExpiry(testRunId: string, artifactId: string, ownerId: string, expiresAt: string): Promise<void> {
    if (!Number.isFinite(Date.parse(expiresAt))) throw new Error("artifact expiry must be a valid timestamp");
    const result = await this.pool.query(`UPDATE qlib_fixture_artifacts SET expires_at=$4::timestamptz
      WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3 AND status IN ('PUBLISHED','RETAINED')
        AND (expires_at IS NULL OR expires_at=$4::timestamptz)`, [testRunId, artifactId, ownerId, expiresAt]);
    if (result.rowCount !== 1) throw new Error("artifact expiry is immutable or artifact is unavailable");
  }
}
