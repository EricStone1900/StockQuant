import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PgBudgetLedger } from "../dist/adapters/pg-budget-ledger.js";
import { PgExperimentRepository } from "../dist/adapters/pg-experiment-repository.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
const databaseName = decodeURIComponent(new URL(connectionString).pathname.slice(1));
if (databaseName !== "research_automation_test") throw new Error("refusing budget summary capacity probe outside research_automation_test");
const pool = new Pool({ connectionString, max: 8, application_name: "stockquant-v33-budget-summary-capacity-probe" });
const stageId = `v33-summary-${randomUUID()}`;
const sizes = [100, 1000, 5000, 10000, 50000];
const testRunIds = sizes.map(() => randomUUID());
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];

try {
  await new PgExperimentRepository(pool).initialize();
  const ledger = new PgBudgetLedger(pool, 100000, 1000, 80, stageId);
  await ledger.initialize();
  for (let i = 0; i < sizes.length; i += 1) {
    await pool.query(`INSERT INTO research_experiments(experiment_id,fixture_id,model_profile,test_run_id,rounds,budget_currency,budget_cents,environment_mode,broker_mode,idempotency_key,status,reason,created_at)
      SELECT (substr(md5($1::text || ':' || n::text),1,12)||'4'||substr(md5($1::text || ':' || n::text),14,3)||'a'||substr(md5($1::text || ':' || n::text),18,15))::uuid,'fixture-v3.3-capacity','UNSET',$1::uuid,(n % 3 + 1)::int,'USD',1,'RESEARCH','FAKE',$1::text || ':' || n::text,'PENDING_PREREQUISITES','synthetic capacity probe',TIMESTAMPTZ '2026-01-01 00:00:00+00' + n * INTERVAL '1 millisecond'
      FROM generate_series(1,$2::int) AS n`, [testRunIds[i], sizes[i]]);
    await pool.query(`INSERT INTO research_budget_allocations(stage_id,experiment_id,requested_cents,reserved_cents,spent_cents,status,rounds)
      SELECT $1,(substr(md5($2::text || ':' || n::text),1,12)||'4'||substr(md5($2::text || ':' || n::text),14,3)||'a'||substr(md5($2::text || ':' || n::text),18,15))::uuid::text,1,1,0,'RESERVED',(n % 3 + 1)::int FROM generate_series(1,$3::int) AS n`, [stageId, testRunIds[i], sizes[i]]);
  }
  await pool.query("ANALYZE research_experiments");
  await pool.query("ANALYZE research_budget_allocations");
  const results = [];
  for (let i = 0; i < sizes.length; i += 1) {
    const rowCount = sizes[i];
    const offsets = [...new Set([0, Math.max(0, Math.floor(rowCount / 2) - 50), Math.max(0, rowCount - 100)])];
    for (const offset of offsets) {
      const boundary = offset === 0 ? null : (await pool.query(`SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_cursor,experiment_id
        FROM research_experiments WHERE test_run_id=$1 ORDER BY created_at,experiment_id OFFSET $2 LIMIT 1`, [testRunIds[i], offset - 1])).rows[0];
      const afterCursor = boundary ? Buffer.from(JSON.stringify({ createdAt: boundary.created_at_cursor, experimentId: boundary.experiment_id }), "utf8").toString("base64url") : null;
      for (let warm = 0; warm < 2; warm += 1) await ledger.snapshotForTestRun(testRunIds[i], offset, 100);
      const times = [], cursorTimes = [];
      for (let sample = 0; sample < 10; sample += 1) {
        const started = performance.now();
        const page = await ledger.snapshotForTestRun(testRunIds[i], offset, 100);
        times.push(performance.now() - started);
        const expectedRows = Math.min(100, rowCount - offset);
        if (page.rows.length !== expectedRows || page.totals.experiments !== rowCount || page.rows.some((row) => row.status !== "RESERVED" || row.requestedCents !== 1)) throw new Error(`budget summary assertion failed for ${rowCount} rows at offset ${offset}`);
        const cursorStarted = performance.now();
        const cursorPage = await ledger.snapshotForTestRun(testRunIds[i], 0, 100, afterCursor);
        cursorTimes.push(performance.now() - cursorStarted);
        if (cursorPage.rows.length !== expectedRows || cursorPage.rows.some((row, index) => row.experimentId !== page.rows[index]?.experimentId) || (afterCursor !== null && cursorPage.totals !== null)) throw new Error(`budget summary cursor mismatch for ${rowCount} rows at offset ${offset}`);
      }
      const planResult = await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)
        SELECT e.experiment_id,e.rounds,b.requested_cents
        FROM research_experiments e JOIN research_budget_allocations b ON b.experiment_id=e.experiment_id::text AND b.stage_id=$1
        WHERE e.test_run_id=$2 ORDER BY e.created_at,e.experiment_id OFFSET $3 LIMIT 101`, [stageId, testRunIds[i], offset]);
      const plan = planResult.rows[0]["QUERY PLAN"][0];
      const nodes = [];
      const walk = (node) => { nodes.push({ nodeType: node["Node Type"], indexName: node["Index Name"] ?? null, actualRows: node["Actual Rows"] ?? null, loops: node["Actual Loops"] ?? null }); for (const child of node.Plans ?? []) walk(child); };
      walk(plan.Plan);
      const cursorPredicate = boundary ? "AND (created_at,experiment_id)>($3::timestamptz,$4::uuid)" : "";
      const cursorPlanParams = boundary ? [stageId, testRunIds[i], boundary.created_at_cursor, boundary.experiment_id, 101] : [stageId, testRunIds[i], 101];
      const cursorPlanLimit = boundary ? "$5" : "$3";
      const cursorPlanResult = await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)
        WITH page AS MATERIALIZED (SELECT experiment_id,rounds,created_at FROM research_experiments WHERE test_run_id=$2 ${cursorPredicate} ORDER BY created_at,experiment_id LIMIT ${cursorPlanLimit})
        SELECT e.experiment_id,e.rounds,b.requested_cents FROM page e JOIN research_budget_allocations b ON b.experiment_id=e.experiment_id::text AND b.stage_id=$1 ORDER BY e.created_at,e.experiment_id`, cursorPlanParams);
      const cursorPlan = cursorPlanResult.rows[0]["QUERY PLAN"][0];
      const cursorPlanNodes = [];
      const walkCursor = (node) => { cursorPlanNodes.push({ nodeType: node["Node Type"], indexName: node["Index Name"] ?? null, actualRows: node["Actual Rows"] ?? null, loops: node["Actual Loops"] ?? null }); for (const child of node.Plans ?? []) walkCursor(child); };
      walkCursor(cursorPlan.Plan);
      results.push({ rowsInTestRun: rowCount, offset, pageSize: 100, samples: times.length,
        offsetP50Ms: Number(percentile(times, 0.5).toFixed(3)), offsetP95Ms: Number(percentile(times, 0.95).toFixed(3)), offsetMaxMs: Number(Math.max(...times).toFixed(3)), offsetPageDbExecutionMs: Number(plan["Execution Time"].toFixed(3)), offsetPlan: nodes.map((node) => `${node.nodeType}${node.indexName ? `:${node.indexName}` : ""}[${node.actualRows}×${node.loops}]`), offsetSharedHitBlocks: plan.Plan["Shared Hit Blocks"] ?? 0, offsetSharedReadBlocks: plan.Plan["Shared Read Blocks"] ?? 0,
        cursorP50Ms: Number(percentile(cursorTimes, 0.5).toFixed(3)), cursorP95Ms: Number(percentile(cursorTimes, 0.95).toFixed(3)), cursorMaxMs: Number(Math.max(...cursorTimes).toFixed(3)), cursorPageDbExecutionMs: Number(cursorPlan["Execution Time"].toFixed(3)), cursorPlan: cursorPlanNodes.map((node) => `${node.nodeType}${node.indexName ? `:${node.indexName}` : ""}[${node.actualRows}×${node.loops}]`), cursorTotalsOmitted: afterCursor !== null, cursorSharedHitBlocks: cursorPlan.Plan["Shared Hit Blocks"] ?? 0, cursorSharedReadBlocks: cursorPlan.Plan["Shared Read Blocks"] ?? 0 });
    }
  }
  console.log(JSON.stringify({ status: "PASS", probe: "V3.3 TestRun budget summary pagination", database: databaseName, syntheticExperiments: sizes.reduce((a, b) => a + b, 0), pageSize: 100, roundsPerPage: 10, limits: "isolated hot-cache PostgreSQL read microbenchmark; no Runner/model/Paper execution, not production capacity", results }, null, 2));
} finally {
  await pool.query("DELETE FROM research_budget_allocations WHERE stage_id=$1", [stageId]).catch(() => undefined);
  await pool.query("DELETE FROM research_experiments WHERE test_run_id=ANY($1::uuid[])", [testRunIds]).catch(() => undefined);
  await pool.query("DELETE FROM research_budget_stage_limits WHERE stage_id=$1", [stageId]).catch(() => undefined);
  const remaining = await pool.query("SELECT (SELECT count(*) FROM research_experiments WHERE test_run_id=ANY($1::uuid[]))::int AS experiments,(SELECT count(*) FROM research_budget_allocations WHERE stage_id=$2)::int AS allocations,(SELECT count(*) FROM research_budget_stage_limits WHERE stage_id=$2)::int AS limits", [testRunIds, stageId]).catch(() => ({ rows: [{ experiments: -1, allocations: -1, limits: -1 }] }));
  await pool.end();
  if (remaining.rows[0].experiments !== 0 || remaining.rows[0].allocations !== 0 || remaining.rows[0].limits !== 0) throw new Error("budget summary capacity probe cleanup verification failed");
}
