import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PgArtifactRefRepository } from "../dist/adapters/pg-artifact-ref-repository.js";
import { FileArtifactStore } from "../dist/adapters/file-artifact-content-store.js";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const sourceUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
const sourceUrlParsed = new URL(sourceUrl);
if (decodeURIComponent(sourceUrlParsed.pathname.slice(1)) !== "research_automation_test") throw new Error("backup/restore smoke requires the dedicated research_automation_test database");
const adminUrl = process.env.RESEARCH_AUTOMATION_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres";
const restoreDatabase = `research_restore_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
const namespace = `research/backup-restore-${randomUUID()}/exp-1/outputs`;
const artifactId = "backup-smoke-output";
const content = Buffer.from(JSON.stringify({ test: "artifact-postgres-pair-restore", value: 42 }));
const sha256 = createHash("sha256").update(content).digest("hex");
const ref = { schemaVersion: "v3.1-artifact-ref-v1", namespace, artifactId, kind: "RUN_LOG", sha256, status: "PENDING", sourceRef: "artifact-backup-restore-smoke" };
const baseDir = await mkdtemp(join(tmpdir(), "stockquant-artifact-backup-restore-"));
const sourceArtifacts = join(baseDir, "source-artifacts");
const restoredArtifacts = join(baseDir, "restored-artifacts");
await mkdir(sourceArtifacts, { recursive: true });

function docker(args, input) {
  const result = spawnSync("docker", ["compose", "-f", "infra/compose/docker-compose.yml", "exec", "-T", "postgres", ...args], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/Users/huangbosong", ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}) },
    input,
    encoding: input ? undefined : "buffer",
    timeout: 120_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker compose postgres command failed (${args[0]}): ${(result.stderr ?? Buffer.alloc(0)).toString("utf8").slice(0, 4000)}`);
  return result.stdout ?? Buffer.alloc(0);
}

const sourcePool = new Pool({ connectionString: sourceUrl });
const sourceRefs = new PgArtifactRefRepository(sourcePool);
const adminPool = new Pool({ connectionString: adminUrl });
let restoreCreated = false;
let sourceRefCreated = false;
try {
  await sourceRefs.initialize();
  const artifactStore = new FileArtifactStore(sourceArtifacts);
  const published = await artifactStore.publish(ref, content);
  sourceRefCreated = true;
  await sourceRefs.save(published);

  // Snapshot both halves into private temporary paths; the active named volume is never mounted or read.
  await cp(sourceArtifacts, restoredArtifacts, { recursive: true, errorOnExist: true });
  const dump = docker(["pg_dump", "-U", "postgres", "-Fc", "-d", "research_automation_test"]);
  if (!Buffer.isBuffer(dump) || dump.byteLength === 0 || dump.byteLength > 256 * 1024 * 1024) throw new Error("PostgreSQL backup is empty or exceeds the 256 MiB smoke limit");
  await adminPool.query(`CREATE DATABASE ${restoreDatabase}`);
  restoreCreated = true;
  docker(["pg_restore", "-U", "postgres", "--no-owner", "--no-privileges", "-d", restoreDatabase], dump);

  const restoredUrl = new URL(adminUrl);
  restoredUrl.pathname = `/${restoreDatabase}`;
  const restoredPool = new Pool({ connectionString: restoredUrl.toString() });
  try {
    const restoredRefs = new PgArtifactRefRepository(restoredPool);
    const restoredRef = await restoredRefs.get(namespace, artifactId);
    if (!restoredRef || restoredRef.sha256 !== sha256 || restoredRef.status !== "PUBLISHED" || restoredRef.sourceRef !== ref.sourceRef) throw new Error("restored PostgreSQL reference does not match the source ArtifactRef");
    const restoredContent = await new FileArtifactStore(restoredArtifacts).read(restoredRef);
    const restoredHash = createHash("sha256").update(restoredContent).digest("hex");
    if (restoredHash !== restoredRef.sha256 || !restoredContent.equals(content)) throw new Error("restored Artifact bytes or SHA-256 do not match the reference");
  } finally {
    await restoredPool.end();
  }
  console.log(JSON.stringify({ status: "PASS", sourceDatabase: "research_automation_test", restoredDatabase: restoreDatabase, backupBytes: dump.byteLength, artifactBytes: content.byteLength, artifactSha256: sha256, activeArtifactVolumeTouched: false }));
} finally {
  const cleanupErrors = [];
  if (restoreCreated) {
    try {
      await adminPool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [restoreDatabase]);
      await adminPool.query(`DROP DATABASE ${restoreDatabase}`);
      const remainingDatabase = await adminPool.query("SELECT 1 FROM pg_database WHERE datname=$1", [restoreDatabase]);
      if (remainingDatabase.rowCount !== 0) throw new Error("temporary restore database still exists after cleanup");
    } catch (error) { cleanupErrors.push(error); }
  }
  try {
    if (sourceRefCreated) await sourcePool.query("DELETE FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2 AND source_ref=$3", [namespace, artifactId, ref.sourceRef]);
    const remaining = await sourcePool.query("SELECT count(*)::int AS count FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]);
    if (Number(remaining.rows[0].count) !== 0) throw new Error("exact source ArtifactRef cleanup failed");
  } catch (error) { cleanupErrors.push(error); }
  try { await Promise.all([sourcePool.end(), adminPool.end()]); } catch (error) { cleanupErrors.push(error); }
  try { await rm(baseDir, { recursive: true, force: true }); } catch (error) { cleanupErrors.push(error); }
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Artifact backup/restore smoke cleanup failed");
}
