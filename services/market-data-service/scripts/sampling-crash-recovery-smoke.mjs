import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { migrateMarketDataSchema } from "../dist/adapters/postgres-schema-migrations.js";
import { PostgresSnapshotSamplingRepository } from "../dist/adapters/postgres-snapshot-sampling-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "../dist/adapters/postgres-sampling-task-lifecycle-repository.js";
import { SamplingTaskWorker } from "../dist/application/sampling-task-worker.js";
import { parseV21SnapshotSamplingFixture } from "../dist/application/v21-snapshot-sampling-fixture.js";

// Requires the existing disposable-PG runner. Never connect this fault harness to an active DB.
assert.ok(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER?.startsWith("sq-test-postgres-"));
assert.ok(process.env.MARKET_DATA_DATABASE_URL);
const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
const snapshots = new PostgresSnapshotSamplingRepository(pool);
const lifecycle = new PostgresSamplingTaskLifecycleRepository(pool);
const root = resolve("../..");
const fixtureRoot = resolve(root, "fixtures/v2/v2.1-snapshot-sampling");
const manifest = JSON.parse(await readFile(resolve(fixtureRoot, "manifest.json"), "utf8"));
const bytes = await readFile(resolve(root, manifest.files[0].path));
const sha256 = createHash("sha256").update(bytes).digest("hex");
assert.equal(sha256, manifest.files[0].sha256);

if (process.argv[2] === "--child") {
  const mode = process.argv[3];
  const worker = new SamplingTaskWorker(lifecycle, {
    async execute(claim) {
      process.send?.({ event: "CLAIMED", taskId: claim.taskId, attempt: claim.attempt });
      if (mode === "crash-after-claim") await new Promise(() => {});
      if (mode === "retry") throw new Error("INJECTED_TRANSIENT_PROVIDER_FAILURE");
      const task = await snapshots.find(claim.taskId);
      assert.ok(task);
      if (task.status !== "COMPLETED_FIXTURE") {
        const availableAt = new Date(Date.parse(task.scheduledAt) + 600_000).toISOString();
        const result = parseV21SnapshotSamplingFixture({ bytes, manifestVersion: manifest.fixtureVersion,
          manifestSha256: sha256, scheduledAt: task.scheduledAt, calendarVersion: task.calendarVersion,
          securityIds: task.securityIds, ingestedAt: availableAt, availableAt, maxAgeMinutes: task.intervalMinutes });
        await snapshots.completeFixture(task.taskId, result.fixtureVersion, result.fixtureSha256, result.observations);
      }
      process.send?.({ event: "RESULT_COMMITTED", taskId: task.taskId });
      if (mode === "crash-after-result") await new Promise(() => {});
      return { state: "COMPLETED" };
    },
  }, { now: () => new Date() }, `crash-smoke-${process.pid}`, 1000, 0);
  try { const outcome = await worker.tick(); process.send?.({ event: "TERMINAL", ...outcome }); }
  finally { await pool.end(); process.disconnect?.(); }
} else {
  const events = []; const children = new Set(); const testRunId = randomUUID();
  async function launch(mode, expectedEvent) {
    const child = fork(fileURLToPath(import.meta.url), ["--child", mode], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
    children.add(child); let diagnostics = "";
    child.stderr.on("data", (chunk) => { diagnostics += String(chunk).slice(0, 2000); });
    const message = await new Promise((resolveMessage, reject) => {
      const timer = setTimeout(() => reject(new Error(`child timeout: ${mode} ${diagnostics}`)), 10_000);
      child.on("message", (value) => {
        events.push({ sequence: events.length + 1, mode, ...value });
        if (value.event === expectedEvent) { clearTimeout(timer); resolveMessage(value); }
      });
      child.once("exit", (code, signal) => { clearTimeout(timer); reject(new Error(`early child exit ${code}/${signal}: ${diagnostics}`)); });
    });
    return { child, message };
  }
  async function kill(child) {
    const closed = new Promise((done) => child.once("exit", (code, signal) => done({ code, signal })));
    child.kill("SIGKILL"); const result = await closed; children.delete(child);
    assert.equal(result.signal, "SIGKILL");
    events.push({ sequence: events.length + 1, event: "PROCESS_KILLED", pid: child.pid, signal: result.signal });
  }
  async function settled(child) {
    if (child.exitCode === null) await new Promise((done) => child.once("exit", done));
    children.delete(child); assert.equal(child.exitCode, 0);
  }
  try {
    await migrateMarketDataSchema(pool);
    for (const scenario of ["crash-after-claim", "crash-after-result", "retry", "last-attempt-crash-after-claim", "last-attempt-crash-after-result"]) {
      const lastAttempt = scenario.startsWith("last-attempt-");
      const mode = scenario.replace("last-attempt-", "");
      const scope = { market: "CN_A", ownerId: "crash-smoke", accountId: randomUUID(), namespace: `v21-crash-${scenario}-${testRunId}`, testRunId };
      const task = await snapshots.record({ scheduledAt: "2026-10-16T01:50:00.000Z", intervalMinutes: 20,
        settingsVersion: 0, calendarVersion: "sse-cn-a-share-2026-1", window: "morning", dataMode: "FIXTURE",
        sourceId: `fixture:${manifest.fixtureVersion}`, scope, securityIds: ["600000.SH", "000001.SZ"], status: "QUEUED", fixtureVersion: manifest.fixtureVersion });
      await lifecycle.enqueue(task.taskId, lastAttempt ? 1 : 3);
      const first = await launch(mode, mode === "crash-after-result" ? "RESULT_COMMITTED" : mode === "retry" ? "TERMINAL" : "CLAIMED");
      if (mode === "retry") { assert.equal(first.message.state, "RETRY_WAIT"); await settled(first.child); }
      else {
        await kill(first.child);
        const before = await lifecycle.read(task.taskId); assert.equal(before.state, "CLAIMED");
        assert.equal((await lifecycle.claim("premature-replacement", new Date(), 1000)), null, "live lease must not be stolen");
        await delay(Math.max(0, Date.parse(before.leaseUntil) - Date.now()) + 30);
      }
      const replacement = await launch("recover", "TERMINAL");
      if (lastAttempt && mode === "crash-after-claim") {
        assert.equal(replacement.message.state, "IDLE"); await settled(replacement.child);
        assert.equal((await lifecycle.read(task.taskId)).state, "FAILED");
        assert.equal((await snapshots.find(task.taskId)).status, "FAILED");
        assert.equal((await pool.query("SELECT 1 FROM market_data_consumer_outbox WHERE task_id=$1", [task.taskId])).rowCount, 0);
        events.push({ sequence: events.length + 1, event: "EXHAUSTED_FAILURE_VERIFIED", scenario, taskId: task.taskId });
        continue;
      }
      assert.equal(replacement.message.state, "COMPLETED"); await settled(replacement.child);
      const recovered = await lifecycle.read(task.taskId); const result = await snapshots.find(task.taskId);
      assert.equal(recovered.attempt, lastAttempt ? 1 : 2); assert.equal(recovered.state, "COMPLETED");
      assert.equal(result.taskId, task.taskId); assert.equal(result.observations.length, 2); assert.equal(result.fixtureSha256, sha256);
      assert.equal((await lifecycle.claim("after-completion", new Date(), 1000)), null);
      const outbox = await pool.query("SELECT event_id FROM market_data_consumer_outbox WHERE task_id=$1", [task.taskId]);
      assert.equal(outbox.rowCount, 1, "one result must create one durable handoff even after crash between result and finish");
      events.push({ sequence: events.length + 1, event: "RECOVERY_VERIFIED", mode, taskId: task.taskId, attempt: recovered.attempt, observations: 2, outboxEvents: outbox.rowCount });
    }
    const report = { status: "PASS", testRunId, dataMode: "FIXTURE", seed: 20260907,
      environment: { node: process.version, hostPlatform: process.platform, hostArchitecture: process.arch, postgresContainer: process.env.STOCKQUANT_ISOLATED_PG_CONTAINER },
      codeSha256: Object.fromEntries(await Promise.all(["scripts/sampling-crash-recovery-smoke.mjs", "src/application/sampling-task-worker.ts", "src/adapters/postgres-sampling-task-lifecycle-repository.ts", "src/adapters/postgres-snapshot-sampling-repository.ts"].map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")]))),
      faultPlan: ["SIGKILL_AFTER_CLAIM", "SIGKILL_AFTER_RESULT_BEFORE_FINISH", "TRANSIENT_ERROR_AND_PROCESS_RESTART", "LAST_ATTEMPT_CRASH_WITHOUT_RESULT", "LAST_ATTEMPT_CRASH_AFTER_COMMIT"],
      events, fixtureVersion: manifest.fixtureVersion, fixtureSha256: sha256, externalRequests: 0,
      components: { worker: "SamplingTaskWorker", database: "REAL_POSTGRESQL", executor: "FIXTURE_ADAPTER_HARNESS" }, humanAcceptance: "NOT_RUN" };
    const directory = resolve(root, "evidence/local/V2.1", testRunId);
    await mkdir(directory, { recursive: true });
    const serialized = JSON.stringify(report, null, 2) + "\n";
    await writeFile(resolve(directory, "crash-recovery.json"), serialized, { flag: "wx" });
    await writeFile(resolve(directory, "manifest.sha256"), createHash("sha256").update(serialized).digest("hex") + "  crash-recovery.json\n", { flag: "wx" });
    console.log(JSON.stringify({ ...report, evidenceDirectory: directory }));
  } finally {
    for (const child of children) { if (child.exitCode === null) child.kill("SIGKILL"); }
    await pool.end();
  }
}
