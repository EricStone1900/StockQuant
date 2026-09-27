import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { PgArtifactRefRepository } from "../dist/adapters/pg-artifact-ref-repository.js";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const databaseUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
const parsedDatabaseUrl = new URL(databaseUrl);
if (parsedDatabaseUrl.pathname !== "/research_automation_test" || parsedDatabaseUrl.username !== "research_automation") throw new Error("paired backup smoke requires the dedicated research_automation_test database and role");
const adminUrl = process.env.RESEARCH_AUTOMATION_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres";
const restoreDatabase = `research_restore_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
const volume = `paired-backup-smoke-${randomUUID().replaceAll("-", "")}`;
const namespace = `research/paired-backup-smoke-${randomUUID()}/backup-test/outputs`;
const artifactId = "published-output";
const content = Buffer.from(JSON.stringify({ scenario: "paired-backup-producer", source: "isolated-test" }));
const sha256 = createHash("sha256").update(content).digest("hex");
const ref = { schemaVersion: "v3.1-artifact-ref-v1", namespace, artifactId, kind: "RUN_LOG", sha256, status: "PUBLISHED", sourceRef: "paired-backup-producer-smoke" };
const workspace = await mkdtemp(join(tmpdir(), "stockquant-paired-backup-smoke-"));
const backupRoot = join(workspace, "backups");
const restoredArtifacts = join(workspace, "restored-artifacts");
await Promise.all([mkdir(backupRoot), mkdir(restoredArtifacts)]);
const sourcePool = new Pool({ connectionString: databaseUrl });
const adminPool = new Pool({ connectionString: adminUrl });
let volumeCreated = false;
let restoreCreated = false;
let sourceRefCreated = false;

function docker(args, input) {
  return execFileSync("docker", args, { cwd: root, input, encoding: input ? null : "utf8", maxBuffer: 256 * 1024 * 1024, stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"] });
}

try {
  const imageId = docker(["image", "inspect", process.env.STOCKQUANT_BACKUP_HELPER_IMAGE ?? "node:24.1.0-slim", "--format", "{{.Id}}"] ).trim();
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("pinned local backup helper image is unavailable");
  docker(["volume", "create", volume]); volumeCreated = true;
  const seedProgram = `const fs=require('node:fs/promises');const p='/source/research/${namespace.replace(/^research\//u, "")}/${artifactId}';(async()=>{await fs.mkdir(require('node:path').dirname(p),{recursive:true});await fs.writeFile(p,Buffer.from(${JSON.stringify(content.toString("base64"))},'base64'),{flag:'wx'})})().catch(e=>{console.error(e);process.exit(1)})`;
  docker(["run", "--rm", "--pull", "never", "--network", "none", "--mount", `type=volume,src=${volume},dst=/source`, "--entrypoint", "node", imageId, "-e", seedProgram]);
  const repository = new PgArtifactRefRepository(sourcePool);
  await repository.initialize();
  await repository.save(ref); sourceRefCreated = true;
  const activeConnections = await sourcePool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()");
  if (activeConnections.rows[0].count !== 0) throw new Error("dedicated source database has another connected writer; refusing backup smoke");
  await sourcePool.end(); // The test database and unique test volume now have no active writers.

  const produced = execFileSync(process.execPath, [join(root, "scripts/create-paired-backup.mjs"), `--confirm-writes-quiesced=research_automation_test/${volume}`], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}), STOCKQUANT_BACKUP_DIR: backupRoot, STOCKQUANT_BACKUP_DATABASE: "research_automation_test", STOCKQUANT_BACKUP_ARTIFACT_VOLUME: volume, STOCKQUANT_BACKUP_HELPER_IMAGE: imageId },
    encoding: "utf8", timeout: 120_000, maxBuffer: 16_384,
  });
  const result = JSON.parse(produced.trim());
  if (result.status !== "PASS") throw new Error("paired producer did not report PASS");
  const manifest = JSON.parse(await readFile(join(result.directory, "manifest.json"), "utf8"));
  if (manifest.restoreValidation?.status !== "PASS" || manifest.restoreValidation.publishedArtifactRefs !== 1 || manifest.restoreValidation.method !== "PG_RESTORE_AND_ARTIFACT_SHA256") throw new Error("backup producer did not record isolated restore validation");
  const dump = await readFile(join(result.directory, "database.dump"));
  const restoredArtifactArchive = join(result.directory, "artifacts.tar");

  await adminPool.query(`CREATE DATABASE ${restoreDatabase}`); restoreCreated = true;
  docker(["compose", "-f", "infra/compose/docker-compose.yml", "exec", "-T", "postgres", "pg_restore", "-U", "postgres", "--no-owner", "--no-privileges", "-d", restoreDatabase], dump);
  const listing = docker(["run", "--rm", "--pull", "never", "--network", "none", "--mount", `type=bind,src=${result.directory},dst=/backup,readonly`, "--entrypoint", "tar", imageId, "-tf", "/backup/artifacts.tar"]).split(/\r?\n/u).filter(Boolean);
  if (listing.some((entry) => entry.startsWith("/") || entry.split("/").some((part) => part === ".."))) throw new Error("backup archive contains an unsafe restore path");
  execFileSync("tar", ["--no-same-owner", "-C", restoredArtifacts, "-xpf", restoredArtifactArchive], { timeout: 120_000 });
  const restoredUrl = new URL(adminUrl); restoredUrl.pathname = `/${restoreDatabase}`;
  const restoredPool = new Pool({ connectionString: restoredUrl.toString() });
  try {
    const rows = await restoredPool.query("SELECT schema_version,namespace,artifact_id,kind,sha256,status,source_ref FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]);
    if (rows.rowCount !== 1 || rows.rows[0].sha256 !== sha256 || rows.rows[0].status !== "PUBLISHED" || rows.rows[0].source_ref !== ref.sourceRef) throw new Error("paired database restore did not preserve the exact published ArtifactRef");
    const restoredPath = join(restoredArtifacts, "research", namespace.replace(/^research\//u, ""), artifactId);
    const restoredContent = await readFile(restoredPath);
    if (!restoredContent.equals(content) || createHash("sha256").update(restoredContent).digest("hex") !== rows.rows[0].sha256) throw new Error("paired Artifact restore differs from the published database reference");
    const sourceManifest = JSON.parse(await readFile(join(result.directory, "artifact-files.json"), "utf8"));
    if (!sourceManifest.files.some((file) => file.path === `research/${namespace.replace(/^research\//u, "")}/${artifactId}` && file.sha256 === sha256)) throw new Error("artifact snapshot manifest omits the published file");
  } finally { await restoredPool.end(); }
  console.log(JSON.stringify({ status: "PASS", backupId: result.backupId, database: "research_automation_test", restoredDatabase: restoreDatabase, artifactVolume: volume, artifactSha256: sha256, manifestFiles: manifest.files.length, restoreValidation: manifest.restoreValidation, sourceWritersStopped: true, productionResourcesTouched: false }));
} finally {
  const cleanupErrors = [];
  if (!sourcePool.ended) {
    if (sourceRefCreated) try { await sourcePool.query("DELETE FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2 AND source_ref=$3", [namespace, artifactId, ref.sourceRef]); } catch (error) { cleanupErrors.push(error); }
    try { await sourcePool.end(); } catch (error) { cleanupErrors.push(error); }
  } else if (sourceRefCreated) {
    const cleanupPool = new Pool({ connectionString: databaseUrl });
    try { await cleanupPool.query("DELETE FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2 AND source_ref=$3", [namespace, artifactId, ref.sourceRef]); } catch (error) { cleanupErrors.push(error); }
    finally { await cleanupPool.end(); }
  }
  if (restoreCreated) try { await adminPool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [restoreDatabase]); await adminPool.query(`DROP DATABASE ${restoreDatabase}`); } catch (error) { cleanupErrors.push(error); }
  if (volumeCreated) try { docker(["volume", "rm", volume]); } catch (error) { cleanupErrors.push(error); }
  try { await adminPool.end(); } catch (error) { cleanupErrors.push(error); }
  try { await rm(workspace, { recursive: true, force: true }); } catch (error) { cleanupErrors.push(error); }
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "paired backup smoke cleanup failed");
}
