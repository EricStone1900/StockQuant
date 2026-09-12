import { createHash, timingSafeEqual } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";
import type { ProjectScope, ProjectPolicy } from "./project-delivery.js";

export type StoredProject = ProjectPolicy & { scopes: ProjectScope[]; active: boolean };
type ProjectRow = QueryResultRow & { project_id: string; max_concurrent_runs: number; max_securities_per_subscription: number; scopes: ProjectScope[]; token_hash: string; active: boolean; active_runs: number };

export class ProjectAuthenticationError extends Error { constructor(message: string) { super(message); this.name = "ProjectAuthenticationError"; } }
export class ProjectQuotaRepositoryError extends Error { constructor(message: string) { super(message); this.name = "ProjectQuotaRepositoryError"; } }

const tokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");

export class ProjectAccessRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_projects (
        project_id TEXT PRIMARY KEY,
        max_concurrent_runs INTEGER NOT NULL CHECK (max_concurrent_runs > 0),
        max_securities_per_subscription INTEGER NOT NULL CHECK (max_securities_per_subscription > 0),
        scopes TEXT[] NOT NULL,
        token_hash CHAR(64) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        active_runs INTEGER NOT NULL DEFAULT 0 CHECK (active_runs >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  async register(projectId: string, token: string, scopes: ProjectScope[] = ["DATA_READ", "DATA_EXPORT"], maxConcurrentRuns = 1, maxSecurities = 100): Promise<StoredProject> {
    const result = await this.pool.query<ProjectRow>(`
      INSERT INTO market_data_projects (project_id, max_concurrent_runs, max_securities_per_subscription, scopes, token_hash)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (project_id) DO UPDATE SET max_concurrent_runs=EXCLUDED.max_concurrent_runs, max_securities_per_subscription=EXCLUDED.max_securities_per_subscription, scopes=EXCLUDED.scopes, token_hash=EXCLUDED.token_hash, active=true, updated_at=now()
      RETURNING *
    `, [projectId, maxConcurrentRuns, maxSecurities, scopes, tokenHash(token)]);
    return this.map(result.rows[0]);
  }

  async authenticate(projectId: string, token: string): Promise<StoredProject> {
    const result = await this.pool.query<ProjectRow>("SELECT * FROM market_data_projects WHERE project_id=$1 AND active=true", [projectId]);
    const row = result.rows[0];
    if (!row) throw new ProjectAuthenticationError("unknown or inactive project");
    const expected = Buffer.from(row.token_hash, "hex"); const supplied = Buffer.from(tokenHash(token), "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new ProjectAuthenticationError("invalid project token");
    return this.map(row);
  }

  async reserveRun(projectId: string): Promise<StoredProject> {
    const result = await this.pool.query<ProjectRow>("UPDATE market_data_projects SET active_runs=active_runs+1, updated_at=now() WHERE project_id=$1 AND active=true AND active_runs < max_concurrent_runs RETURNING *", [projectId]);
    if (result.rowCount !== 1) throw new ProjectQuotaRepositoryError("project concurrency quota exceeded or project inactive");
    return this.map(result.rows[0]);
  }

  async releaseRun(projectId: string): Promise<void> {
    await this.pool.query("UPDATE market_data_projects SET active_runs=GREATEST(active_runs-1,0), updated_at=now() WHERE project_id=$1", [projectId]);
  }

  private map(row: ProjectRow): StoredProject {
    return { projectId: row.project_id, maxConcurrentRuns: row.max_concurrent_runs, maxSecuritiesPerSubscription: row.max_securities_per_subscription, scopes: row.scopes, active: row.active };
  }
}

export function parseProjectTokenConfig(value: string | undefined): Array<{ projectId: string; token: string; scopes?: ProjectScope[]; maxConcurrentRuns?: number; maxSecurities?: number }> {
  if (!value) return [];
  const config = JSON.parse(value) as Record<string, { token: string; scopes?: ProjectScope[]; maxConcurrentRuns?: number; maxSecurities?: number }>;
  return Object.entries(config).map(([projectId, item]) => ({ projectId, ...item }));
}
