import type { Pool, QueryResultRow } from "pg";
import { DataVersionConflict, ProjectAccessDenied, type Page } from "./project-delivery.js";

type ArtifactRow = QueryResultRow & { project_id: string; data_version: string; row_number: number; payload: unknown };

/** Durable, project-scoped rows behind the DC-06 artifact page API. */
export class ArtifactDeliveryRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
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
    `);
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

  async page(projectId: string, artifactId: string, requestedVersion: string, cursor: number, pageSize: number): Promise<Page<unknown>> {
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
