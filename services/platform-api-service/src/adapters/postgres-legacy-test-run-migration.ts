import type { Pool } from "pg";

export const legacyTestRunProjection = `
  SELECT r.test_run_id, r.stage_id, r.scenario_id, r.scenario_version, r.owner_id, r.namespace,
    r.status, r.seed,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'assertionId', a.assertion_id, 'status', a.status, 'expected', a.expected, 'actual', a.actual,
      'evidence', a.evidence, 'createdAt', a.created_at
    ) ORDER BY a.assertion_id) FROM test_assertions a WHERE a.test_run_id=r.test_run_id), '[]'::jsonb) AS assertions,
    jsonb_build_object(
      'legacySourceTable', 'test_runs',
      'legacyAccountId', r.account_id,
      'legacyError', r.error,
      'legacyAcceptanceRecords', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'acceptanceRecordId', a.acceptance_record_id, 'ownerId', a.owner_id, 'conclusion', a.conclusion,
        'note', a.note, 'createdAt', a.created_at
      ) ORDER BY a.created_at, a.acceptance_record_id) FROM acceptance_records a WHERE a.test_run_id=r.test_run_id), '[]'::jsonb)
    ) AS evidence,
    r.created_at, r.completed_at
  FROM test_runs r`;

/** Copies legacy V1.1 run history into the shared stage table without deleting or rewriting its source. */
export async function shadowMigrateLegacyTestRuns(pool: Pool): Promise<{ sourceCount: number; insertedCount: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE test_runs, test_assertions, acceptance_records IN SHARE MODE");
    await client.query("LOCK TABLE acceptance_stage_runs IN SHARE ROW EXCLUSIVE MODE");
    const sourceCount = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM test_runs");
    const inserted = await client.query(`
      INSERT INTO acceptance_stage_runs
        (test_run_id, stage_id, scenario_id, scenario_version, owner_id, namespace, status, seed, assertions, evidence, created_at, completed_at)
      ${legacyTestRunProjection}
      ON CONFLICT (test_run_id) DO NOTHING`);
    const mismatch = await client.query(`
      WITH legacy AS (${legacyTestRunProjection})
      SELECT count(*)::int AS count
      FROM legacy l LEFT JOIN acceptance_stage_runs s USING (test_run_id)
      WHERE s.test_run_id IS NULL OR
        (s.stage_id, s.scenario_id, s.scenario_version, s.owner_id, s.namespace, s.status, s.seed,
         s.assertions, s.evidence, s.created_at, s.completed_at)
        IS DISTINCT FROM
        (l.stage_id, l.scenario_id, l.scenario_version, l.owner_id, l.namespace, l.status, l.seed,
         l.assertions, l.evidence, l.created_at, l.completed_at)`);
    if (mismatch.rows[0].count !== 0) throw new Error(`legacy TestRun shadow migration found ${mismatch.rows[0].count} conflicting records`);
    await client.query("COMMIT");
    return { sourceCount: Number(sourceCount.rows[0].count), insertedCount: inserted.rowCount ?? 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Fail closed if a V1.1 stage-store cutover has any missing or divergent legacy row. */
export async function assertLegacyTestRunShadowParity(pool: Pool): Promise<{ sourceCount: number; targetCount: number }> {
  const [source, target, mismatch] = await Promise.all([
    pool.query<{ count: string }>("SELECT count(*)::text AS count FROM test_runs"),
    pool.query<{ count: string }>("SELECT count(*)::text AS count FROM acceptance_stage_runs WHERE stage_id='V1.1'"),
    pool.query<{ count: number }>(`
      WITH legacy AS (${legacyTestRunProjection})
      SELECT count(*)::int AS count
      FROM legacy l LEFT JOIN acceptance_stage_runs s USING (test_run_id)
      WHERE s.test_run_id IS NULL OR
        (s.stage_id, s.scenario_id, s.scenario_version, s.owner_id, s.namespace, s.status, s.seed,
         s.assertions, s.evidence, s.created_at, s.completed_at)
        IS DISTINCT FROM
        (l.stage_id, l.scenario_id, l.scenario_version, l.owner_id, l.namespace, l.status, l.seed,
         l.assertions, l.evidence, l.created_at, l.completed_at)`)
  ]);
  const sourceCount = Number(source.rows[0].count);
  const targetCount = Number(target.rows[0].count);
  if (sourceCount !== targetCount || mismatch.rows[0].count !== 0) {
    throw new Error(`V1.1 unified TestRun store is not ready: source=${sourceCount}, target=${targetCount}, mismatches=${mismatch.rows[0].count}`);
  }
  return { sourceCount, targetCount };
}
