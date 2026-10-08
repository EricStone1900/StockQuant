import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { V14Run } from "../domain/v14-daily-backtest.js";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}
const sha256 = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");

export class PostgresV14BacktestRepository {
  constructor(private readonly pool: Pool) {}

  async get(backtestRunId: string): Promise<{ run: V14Run; resultSha256: string; manifestSha256: string } | null> {
    const result = await this.pool.query(`SELECT r.result_payload,r.result_sha256,m.manifest_sha256
      FROM research_backtest_runs r JOIN research_backtest_manifests m USING(backtest_run_id) WHERE r.backtest_run_id=$1`, [backtestRunId]);
    if (result.rowCount !== 1) return null;
    return { run: result.rows[0].result_payload as V14Run, resultSha256: String(result.rows[0].result_sha256).trim(), manifestSha256: String(result.rows[0].manifest_sha256).trim() };
  }

  async save(backtestRunId: string, run: V14Run): Promise<{ resultSha256: string; manifestSha256: string }> {
    const resultSha256 = sha256(run);
    const manifest = {
      backtestRunId,
      stageId: run.stageId,
      scenarioId: run.scenarioId,
      seed: run.seed,
      status: run.status,
      dataVersion: run.evidence.dataVersion,
      fixtureSha256: run.evidence.fixtureSha256,
      codeVersion: run.evidence.codeVersion,
      executionPolicy: run.evidence.executionPolicy,
      costModel: run.evidence.costModel,
      resultSha256,
    };
    const manifestSha256 = sha256(manifest);
    const existing = await this.get(backtestRunId);
    if (existing) {
      if (existing.resultSha256 !== resultSha256 || existing.manifestSha256 !== manifestSha256) throw new Error("V1.4 BacktestRun ID already exists with different result evidence");
      return { resultSha256, manifestSha256 };
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO research_backtest_runs (backtest_run_id, stage_id, scenario_id, seed, status, result_payload, result_sha256)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`, [backtestRunId, run.stageId, run.scenarioId, run.seed, run.status, JSON.stringify(run), resultSha256]);
      await client.query(`INSERT INTO research_backtest_manifests (backtest_run_id, manifest_payload, manifest_sha256)
        VALUES ($1,$2::jsonb,$3)`, [backtestRunId, JSON.stringify(manifest), manifestSha256]);
      await client.query("COMMIT");
      return { resultSha256, manifestSha256 };
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") {
        const concurrent = await this.get(backtestRunId);
        if (concurrent && concurrent.resultSha256 === resultSha256 && concurrent.manifestSha256 === manifestSha256) return { resultSha256, manifestSha256 };
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
