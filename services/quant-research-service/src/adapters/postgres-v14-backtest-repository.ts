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
      throw error;
    } finally {
      client.release();
    }
  }
}
