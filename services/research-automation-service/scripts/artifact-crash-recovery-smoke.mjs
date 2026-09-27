import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { PgArtifactRefRepository } from "../dist/adapters/pg-artifact-ref-repository.js";
import { PgRunnerJobStore } from "../dist/adapters/pg-runner-job-store.js";
import { FileArtifactStore } from "../dist/application/v31-artifact-store.js";
import { inspectArtifactOrphans } from "../dist/application/v31-artifact-reconcile.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
if (decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "research_automation_test") throw new Error("crash recovery smoke requires isolated research_automation_test database");
const childFlag = process.argv[2] === "--crash-child";

if (childFlag) {
  const pool = new Pool({ connectionString, max: 1 });
  const jobId = process.env.STOCKQUANT_CRASH_JOB_ID;
  const workerId = process.env.STOCKQUANT_CRASH_WORKER_ID;
  const fencingToken = Number(process.env.STOCKQUANT_CRASH_FENCING_TOKEN);
  const root = process.env.STOCKQUANT_CRASH_ARTIFACT_ROOT;
  const ref = JSON.parse(process.env.STOCKQUANT_CRASH_ARTIFACT_REF ?? "null");
  const content = Buffer.from(process.env.STOCKQUANT_CRASH_ARTIFACT_CONTENT ?? "", "base64");
  if (!jobId || !workerId || !Number.isSafeInteger(fencingToken) || !root || !ref || content.length === 0) throw new Error("child crash inputs are incomplete");
  const jobs = new PgRunnerJobStore(pool);
  await jobs.publishOutputArtifact({ jobId, workerId, fencingToken, now: new Date(), artifact: { ...ref, status: "PENDING" }, persist: async () => {
    await new FileArtifactStore(root).publish({ ...ref, status: "PENDING" }, content);
    process.kill(process.pid, "SIGKILL");
    throw new Error("SIGKILL did not terminate Artifact publisher child");
  } });
  process.exitCode = 3;
} else {
  const pool = new Pool({ connectionString, max: 2 });
  const suffix = randomUUID().replaceAll("-", "");
  const testRunId = `crash-${suffix}`;
  const jobId = `${testRunId}:exp-1`;
  const workerId = `crash-worker-${suffix}`;
  const namespace = `research/${testRunId}/exp-1/outputs`;
  const artifactId = `crash-artifact-${suffix}`;
  const bytes = Buffer.from(`filesystem-before-postgres-${suffix}`);
  const artifactRef = { schemaVersion: "v3.1-artifact-ref-v1", namespace, artifactId, kind: "OUTPUT", sha256: createHash("sha256").update(bytes).digest("hex"), status: "PENDING", sourceRef: `runner:${jobId}:fence:1` };
  const artifactRoot = await mkdtemp(join(tmpdir(), "stockquant-artifact-crash-"));
  const jobs = new PgRunnerJobStore(pool);
  const artifacts = new PgArtifactRefRepository(pool);
  try {
    await jobs.initialize();
    await artifacts.initialize();
    const job = { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/${testRunId}/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: namespace, resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
    const now = new Date();
    await jobs.save({ jobId, job, status: "QUEUED", submittedAt: now.toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: null });
    // Seed a uniquely scoped valid lease directly so this isolated recovery smoke
    // does not consume or contend for the global Runner concurrency slot.
    await pool.query("UPDATE research_runner_jobs SET status='RUNNING',started_at=$2,lease_owner=$3,lease_expires_at=$4,fencing_token=1 WHERE job_id=$1", [jobId, now, workerId, new Date(now.getTime() + 60_000)]);
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--crash-child"], { cwd: process.cwd(), env: { ...process.env, STOCKQUANT_CRASH_JOB_ID: jobId, STOCKQUANT_CRASH_WORKER_ID: workerId, STOCKQUANT_CRASH_FENCING_TOKEN: "1", STOCKQUANT_CRASH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_CRASH_ARTIFACT_REF: JSON.stringify(artifactRef), STOCKQUANT_CRASH_ARTIFACT_CONTENT: bytes.toString("base64") }, stdio: ["ignore", "ignore", "pipe"] });
    let childError = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => { childError += chunk; });
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    if (result.signal !== "SIGKILL") throw new Error(`publisher was expected to die by SIGKILL, received ${JSON.stringify(result)} ${childError}`);
    if (await artifacts.get(namespace, artifactId)) throw new Error("ArtifactRef unexpectedly committed after SIGKILL");
    const record = await jobs.get(jobId);
    if (!record || record.artifacts.length !== 0 || record.status !== "RUNNING") throw new Error("RunnerJob row changed despite the uncommitted publication transaction");
    const report = await inspectArtifactOrphans(artifactRoot, await artifacts.listAll(), { minAgeMs: 0, now: new Date(Date.now() + 2_000) });
    const orphan = report.orphans.find((candidate) => candidate.namespace === namespace && candidate.artifactId === artifactId);
    if (!orphan || orphan.sha256 !== artifactRef.sha256 || orphan.sizeBytes !== bytes.length) throw new Error("read-only recovery scan did not identify the crash orphan exactly");
    console.log(JSON.stringify({ status: "PASS", testRunId, jobId, crash: "SIGKILL_AFTER_FILE_WRITE_BEFORE_ARTIFACT_REF_COMMIT", childSignal: result.signal, jobStatus: record.status, artifactRefCommitted: false, orphanDetected: true, sha256: orphan.sha256, bytes: orphan.sizeBytes, externalModelCalls: 0, orders: 0 }, null, 2));
  } finally {
    await pool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId]).catch(() => undefined);
    await pool.query("DELETE FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]).catch(() => undefined);
    await rm(artifactRoot, { recursive: true, force: true });
    await pool.end();
  }
}
