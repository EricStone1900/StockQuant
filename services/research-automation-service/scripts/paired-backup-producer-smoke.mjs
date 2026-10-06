import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const id = randomUUID().replaceAll("-", "");
const project = `sq-backup-smoke-${id.slice(0, 12)}`;
const databaseVolume = `sq-backup-smoke-db-${id}`;
const artifactVolume = `sq-backup-smoke-artifacts-${id}`;
const namespaceId = `backup-smoke-${id}`;
const namespace = `research/${namespaceId}/backup-test/outputs`;
const artifactId = "published-output";
const content = Buffer.from(JSON.stringify({ scenario: "cluster-paired-backup", source: "isolated-test" }));
const sha256 = createHash("sha256").update(content).digest("hex");
const legacyArtifactId = "legacy-output";
const legacyContent = Buffer.from(JSON.stringify({ scenario: "legacy-layout", source: "isolated-test" }));
const legacySha256 = createHash("sha256").update(legacyContent).digest("hex");
const retainedArtifactId = "retained-output";
const retainedContent = Buffer.from(JSON.stringify({ scenario: "retained-layout", source: "isolated-test" }));
const retainedSha256 = createHash("sha256").update(retainedContent).digest("hex");
const qlibTestRunId = randomUUID();
const qlibPayload = { predictions: [0.1, 0.2], modelBase64: Buffer.from("qlib-model").toString("base64"), schemaVersion: "v2.3-qlib-fixture-artifact-v1" };
const qlibBytes = Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(qlibPayload).sort(([left], [right]) => left.localeCompare(right)))));
const qlibSha256 = createHash("sha256").update(qlibBytes).digest("hex");
const qlibArtifactId = qlibSha256;
const qlibRetainedBytes = Buffer.from(JSON.stringify({ artifactId: "retained-qlib-fixture", status: "RETAINED" }));
const qlibRetainedSha256 = createHash("sha256").update(qlibRetainedBytes).digest("hex");
const qlibRetainedArtifactId = qlibRetainedSha256;
const password = randomBytes(32).toString("hex");
const workspace = await mkdtemp(join(tmpdir(), "stockquant-cluster-backup-smoke-"));
const backupRoot = join(workspace, "backups");
const composeFile = join(workspace, "compose.yml");
const compose = ["compose", "--project-name", project, "--file", composeFile];
const postgresImage = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const helperImage = process.env.STOCKQUANT_BACKUP_HELPER_IMAGE ?? "node:24.1.0-slim";
let stackStarted = false;

function docker(args, input) {
  return execFileSync("docker", args, { cwd: root, input, encoding: input ? null : "utf8", maxBuffer: 256 * 1024 * 1024, stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"] });
}
function psql(database, sql) { return docker([...compose, "exec", "-T", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, "-c", sql]); }

try {
  await mkdir(backupRoot, { mode: 0o700 });
  const composeContent = `name: ${project}\nservices:\n  postgres:\n    image: ${postgresImage}\n    network_mode: none\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: ${password}\n      POSTGRES_DB: postgres\n      POSTGRES_HOST_AUTH_METHOD: scram-sha-256\n    volumes:\n      - ${databaseVolume}:/var/lib/postgresql/data\n      - ${artifactVolume}:/var/lib/stockquant/research-artifacts\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]\n      interval: 1s\n      timeout: 2s\n      retries: 30\nvolumes:\n  ${databaseVolume}:\n    name: ${databaseVolume}\n  ${artifactVolume}:\n    name: ${artifactVolume}\n`;
  await writeFile(composeFile, composeContent, { mode: 0o600 });
  stackStarted = true;
  docker([...compose, "up", "-d", "postgres"]);
  const postgresContainer = docker([...compose, "ps", "-q", "postgres"]).trim();
  if (!postgresContainer) throw new Error("isolated backup PostgreSQL container was not created");
  const postgresState = JSON.parse(docker(["inspect", "--format", "{{json .}}", postgresContainer]));
  if (postgresState.HostConfig?.NetworkMode !== "none" || Object.keys(postgresState.HostConfig?.PortBindings ?? {}).length !== 0 || (postgresState.Mounts ?? []).some((mount) => mount.Name !== databaseVolume && mount.Name !== artifactVolume)) throw new Error("backup smoke PostgreSQL is not isolated from network ports and shared volumes");
  let databaseReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { docker([...compose, "exec", "-T", "postgres", "pg_isready", "-U", "postgres", "-d", "postgres"]); databaseReady = true; break; }
    catch { await new Promise((resolveWait) => setTimeout(resolveWait, 1000)); }
  }
  if (!databaseReady) throw new Error("isolated backup source database did not become ready");
  psql("postgres", "CREATE DATABASE research_automation");
  psql("postgres", "CREATE DATABASE platform_api");
  psql("research_automation", "CREATE TABLE research_artifact_refs (schema_version text NOT NULL, namespace text NOT NULL, artifact_id text NOT NULL, kind text NOT NULL, sha256 text NOT NULL, status text NOT NULL, source_ref text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(namespace, artifact_id))");
  psql("research_automation", `INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref) VALUES ('v3.1-artifact-ref-v1','${namespace}','${artifactId}','RUN_LOG','${sha256}','PUBLISHED','cluster-paired-backup-smoke')`);
  psql("research_automation", `INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref) VALUES ('v3.1-artifact-ref-v1','${namespace}','${legacyArtifactId}','RUN_LOG','${legacySha256}','PUBLISHED','legacy-layout-backup-smoke')`);
  psql("research_automation", `INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref) VALUES ('v3.1-artifact-ref-v1','${namespace}','${retainedArtifactId}','RUN_LOG','${retainedSha256}','RETAINED','retained-layout-backup-smoke')`);
  psql("platform_api", "CREATE TABLE qlib_fixture_artifacts (artifact_id char(64) NOT NULL, test_run_id uuid NOT NULL, owner_id text NOT NULL, media_type text NOT NULL, sha256 char(64) NOT NULL, payload jsonb, status text NOT NULL, expires_at timestamptz)");
  psql("platform_api", `INSERT INTO qlib_fixture_artifacts(artifact_id,test_run_id,owner_id,media_type,sha256,payload,status) VALUES ('${qlibArtifactId}','${qlibTestRunId}','backup-smoke','application/vnd.stockquant.qlib-fixture-model+json','${qlibSha256}',NULL,'PUBLISHED')`);
  psql("platform_api", `INSERT INTO qlib_fixture_artifacts(artifact_id,test_run_id,owner_id,media_type,sha256,payload,status) VALUES ('${qlibRetainedArtifactId}','${qlibTestRunId}','backup-smoke','application/vnd.stockquant.qlib-fixture-model+json','${qlibRetainedSha256}',NULL,'RETAINED')`);
  const imageId = docker(["image", "inspect", helperImage, "--format", "{{.Id}}"]).trim();
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("pinned local backup helper image is unavailable");
  const seedProgram = `const fs=require('node:fs/promises'),p=require('node:path');(async()=>{const files=[['/source/research/${namespaceId}/backup-test/outputs/${sha256}/${artifactId}','${content.toString("base64")}'],['/source/research/${namespaceId}/backup-test/outputs/${legacyArtifactId}','${legacyContent.toString("base64")}'],['/source/research/${namespaceId}/backup-test/outputs/${retainedSha256}/${retainedArtifactId}','${retainedContent.toString("base64")}'],['/source/research/${qlibTestRunId}/qlib-fixture/${qlibSha256}/${qlibArtifactId}','${qlibBytes.toString("base64")}'],['/source/research/${qlibTestRunId}/qlib-fixture/${qlibRetainedSha256}/${qlibRetainedArtifactId}','${qlibRetainedBytes.toString("base64")}']];for(const [f,b] of files){await fs.mkdir(p.dirname(f),{recursive:true});await fs.writeFile(f,Buffer.from(b,'base64'),{flag:'wx'})}})().catch(e=>{console.error(e);process.exit(1)})`;
  docker(["run", "--rm", "--pull", "never", "--network", "none", "--mount", `type=volume,src=${artifactVolume},dst=/source`, "--entrypoint", "node", imageId, "-e", seedProgram]);

  const produced = execFileSync(process.execPath, [join(root, "scripts/create-cluster-paired-backup.mjs"), `--confirm-writes-quiesced=cluster/${artifactVolume}`], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}), STOCKQUANT_BACKUP_DIR: backupRoot, STOCKQUANT_BACKUP_ARTIFACT_VOLUME: artifactVolume, STOCKQUANT_BACKUP_COMPOSE_FILE: composeFile, STOCKQUANT_BACKUP_HELPER_IMAGE: imageId, STOCKQUANT_BACKUP_TIMEOUT_MS: "120000" },
    encoding: "utf8", timeout: 180_000, maxBuffer: 16_384,
  });
  const result = JSON.parse(produced.trim());
  if (result.status !== "PASS" || result.databases !== 3) throw new Error("cluster backup producer did not restore the complete isolated database set");
  const manifestBytes = await readFile(join(result.directory, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.format !== "stockquant.paired-backup.cluster.v2" || manifest.restoreValidation?.status !== "PASS" || manifest.restoreValidation.publishedArtifactRefs !== 5 || manifest.restoreValidation.method !== "ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256") throw new Error("cluster backup manifest did not record complete isolated restore validation");
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  const backupFileEvidence = [];
  for (const file of manifest.files) {
    if (!file || typeof file.path !== "string" || !Number.isSafeInteger(file.bytes) || !/^[a-f0-9]{64}$/u.test(file.sha256 ?? "")) throw new Error("backup manifest contains invalid file evidence");
    const bytes = await readFile(join(result.directory, file.path));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== file.bytes || sha256 !== file.sha256) throw new Error(`backup file hash does not match its manifest: ${file.path}`);
    backupFileEvidence.push({ path: file.path, bytes: file.bytes, sha256 });
  }
  if (backupFileEvidence.length !== 4 || !backupFileEvidence.some((file) => file.path === "artifacts.tar")) throw new Error("backup file evidence is incomplete");
  const clusterDump = await readFile(join(result.directory, "cluster.sql"), "utf8");
  if (clusterDump.includes(password) || JSON.stringify(manifest).includes(password) || /\bPASSWORD\s+'(?:[^']|'')*'/iu.test(clusterDump)) throw new Error("cluster backup included role password material");
  console.log(JSON.stringify({ status: "PASS", backupId: result.backupId, databases: manifest.databaseInventory.databases.length, roles: manifest.restoreValidation.restoredRoles.length, artifactVolume, artifactSha256: sha256, legacyArtifactSha256: legacySha256, retainedArtifactSha256: retainedSha256, qlibArtifactSha256: qlibSha256, qlibRetainedArtifactSha256: qlibRetainedSha256, backupManifestSha256: manifestSha256, backupFiles: backupFileEvidence, restoreValidation: manifest.restoreValidation, isolatedComposeProject: project, productionResourcesTouched: false }));
} finally {
  if (stackStarted) {
    try { docker([...compose, "down", "--volumes", "--remove-orphans"]); }
    catch (error) { throw new AggregateError([error], "isolated paired backup smoke cleanup failed; preserve workspace for diagnosis"); }
  }
  await rm(workspace, { recursive: true, force: true });
}
