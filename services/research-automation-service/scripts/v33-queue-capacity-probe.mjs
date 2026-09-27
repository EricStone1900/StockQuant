import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PgRunnerJobStore } from "../dist/adapters/pg-runner-job-store.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
const databaseName = decodeURIComponent(new URL(connectionString).pathname.slice(1));
if (databaseName !== "research_automation_test") throw new Error("refusing queue capacity probe outside research_automation_test");
const pool = new Pool({ connectionString, max: 12, application_name: "stockquant-v33-queue-capacity-probe" });
const sizes = [100, 1000, 5000, 10000, 50000];
const testRunIds = sizes.map(() => randomUUID());
const samples = 20;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];

try {
  const store = new PgRunnerJobStore(pool);
  await store.initialize();
  for (let index = 0; index < sizes.length; index += 1) {
    const testRunId = testRunIds[index];
    const size = sizes[index];
    await pool.query(`INSERT INTO research_runner_jobs(job_id,job,status,submitted_at)
      SELECT $1 || ':' || n::text,
        jsonb_build_object('schemaVersion','v3.1-runner-job-v1','testRunId',$1,'experimentId',$1 || ':' || n::text,
          'imageDigest','sha256:' || repeat('a',64),'inputArtifact','research/' || $1 || '/inputs/' || repeat('b',64),
          'outputNamespace','research/' || $1 || '/' || n::text || '/outputs',
          'resources',jsonb_build_object('cpuMilli',500,'memoryMiB',512,'timeoutSeconds',60,'pidsLimit',32),
          'networkPolicy',jsonb_build_object('mode','DENY','allowlist',jsonb_build_array())),
        'QUEUED',TIMESTAMPTZ '2026-01-01 00:00:00+00' + n * INTERVAL '1 millisecond'
      FROM generate_series(1,$2::int) AS n`, [testRunId, size]);
  }
  await pool.query("ANALYZE research_runner_jobs");

  const results = [];
  for (let index = 0; index < sizes.length; index += 1) {
    const testRunId = testRunIds[index];
    const rowCount = sizes[index];
    const offsets = [...new Set([0, Math.max(0, Math.floor(rowCount / 2) - 50), Math.max(0, rowCount - 100)])];
    for (const offset of offsets) {
      const cursor = offset === 0 ? null : { submittedAt: new Date(Date.parse("2026-01-01T00:00:00.000Z") + offset).toISOString(), jobId: `${testRunId}:${offset}` };
      for (let warm = 0; warm < 3; warm += 1) await store.listForTestRun(testRunId, offset, 100);
      const latenciesMs = [];
      const cursorLatenciesMs = [];
      for (let sample = 0; sample < samples; sample += 1) {
        const started = performance.now();
        const rows = await store.listForTestRun(testRunId, offset, 100);
        latenciesMs.push(performance.now() - started);
        if (rows.length !== Math.min(100, rowCount - offset) || rows.some((row) => row.job.testRunId !== testRunId)) throw new Error(`queue page assertion failed for ${rowCount} rows at offset ${offset}`);
        const cursorStarted = performance.now();
        const cursorRows = await store.listAfterTestRun(testRunId, cursor, 100);
        cursorLatenciesMs.push(performance.now() - cursorStarted);
        if (cursorRows.length !== Math.min(100, rowCount - offset) || cursorRows.some((row) => row.job.testRunId !== testRunId) || cursorRows[0]?.job.jobId !== rows[0]?.job.jobId) throw new Error(`cursor queue page assertion failed for ${rowCount} rows at offset ${offset}`);
      }
      const planResult = await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)
        SELECT * FROM research_runner_jobs WHERE job->>'testRunId'=$1
        ORDER BY submitted_at, job_id OFFSET $2 LIMIT $3`, [testRunId, offset, 100]);
      const plan = planResult.rows[0]["QUERY PLAN"][0];
      const planNodes = [];
      const walkPlan = (node) => { planNodes.push({ nodeType: node["Node Type"], indexName: node["Index Name"] ?? null, actualRows: node["Actual Rows"] ?? null, loops: node["Actual Loops"] ?? null }); for (const child of node.Plans ?? []) walkPlan(child); };
      walkPlan(plan.Plan);
      const cursorPlanResult = await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)
        SELECT * FROM research_runner_jobs WHERE job->>'testRunId'=$1
          AND (submitted_at, job_id) > ($2::timestamptz, $3::text)
        ORDER BY submitted_at, job_id LIMIT $4`, [testRunId, cursor?.submittedAt ?? "0001-01-01T00:00:00.000Z", cursor?.jobId ?? "", 100]);
      const cursorPlan = cursorPlanResult.rows[0]["QUERY PLAN"][0];
      const cursorPlanNodes = [];
      const walkCursorPlan = (node) => { cursorPlanNodes.push({ nodeType: node["Node Type"], indexName: node["Index Name"] ?? null, actualRows: node["Actual Rows"] ?? null, loops: node["Actual Loops"] ?? null }); for (const child of node.Plans ?? []) walkCursorPlan(child); };
      walkCursorPlan(cursorPlan.Plan);
      results.push({ rowsInRun: rowCount, offset, limit: 100, sampleCount: samples,
        offsetP50Ms: Number(percentile(latenciesMs, 0.50).toFixed(3)), offsetP95Ms: Number(percentile(latenciesMs, 0.95).toFixed(3)), offsetMaxMs: Number(Math.max(...latenciesMs).toFixed(3)), offsetDbExecutionMs: Number(plan["Execution Time"].toFixed(3)), offsetPlanNodes: planNodes, sharedHitBlocks: plan.Plan["Shared Hit Blocks"] ?? 0, sharedReadBlocks: plan.Plan["Shared Read Blocks"] ?? 0,
        cursorP50Ms: Number(percentile(cursorLatenciesMs, 0.50).toFixed(3)), cursorP95Ms: Number(percentile(cursorLatenciesMs, 0.95).toFixed(3)), cursorMaxMs: Number(Math.max(...cursorLatenciesMs).toFixed(3)), cursorDbExecutionMs: Number(cursorPlan["Execution Time"].toFixed(3)), cursorPlanNodes, cursorSharedHitBlocks: cursorPlan.Plan["Shared Hit Blocks"] ?? 0, cursorSharedReadBlocks: cursorPlan.Plan["Shared Read Blocks"] ?? 0 });
    }
    for (const concurrency of [4, 8]) {
      const requestLatenciesMs = [];
      const batchLatenciesMs = [];
      for (let round = 0; round < 10; round += 1) {
        const started = performance.now();
        const pages = await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
          const requestStarted = performance.now();
          const page = await store.listForTestRun(testRunId, (worker * 100) % rowCount, 100);
          requestLatenciesMs.push(performance.now() - requestStarted);
          return page;
        }));
        batchLatenciesMs.push(performance.now() - started);
        if (pages.some((rows) => rows.length === 0 || rows.some((row) => row.job.testRunId !== testRunId))) throw new Error(`concurrent queue page assertion failed at ${concurrency} readers`);
      }
      results.push({ rowsInRun: rowCount, concurrentReaders: concurrency, rounds: 10, perRequestP50Ms: Number(percentile(requestLatenciesMs, 0.50).toFixed(3)), perRequestP95Ms: Number(percentile(requestLatenciesMs, 0.95).toFixed(3)), batchWallP50Ms: Number(percentile(batchLatenciesMs, 0.50).toFixed(3)), batchWallP95Ms: Number(percentile(batchLatenciesMs, 0.95).toFixed(3)) });
    }
  }
  console.log(JSON.stringify({ status: "PASS", probe: "V3.3 PostgreSQL Runner queue pagination", database: databaseName, syntheticRows: sizes.reduce((sum, size) => sum + size, 0), pageSize: 100, roundsPerPage: samples, concurrencyIsReadFanoutOnly: true, limits: "isolated small-data engineering probe; does not validate Runner dispatch concurrency, Paper continuity, or production capacity", results }, null, 2));
} finally {
  await pool.query("DELETE FROM research_runner_jobs WHERE job->>'testRunId'=ANY($1::text[])", [testRunIds]).catch(() => undefined);
  const remaining = await pool.query("SELECT count(*)::int AS count FROM research_runner_jobs WHERE job->>'testRunId'=ANY($1::text[])", [testRunIds]).catch(() => ({ rows: [{ count: -1 }] }));
  await pool.end();
  if (remaining.rows[0].count !== 0) throw new Error("queue capacity probe cleanup verification failed");
}
