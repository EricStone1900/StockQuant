import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { produceClusterPairedBackup } from "./cluster-paired-backup.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const backupRoot = process.env.STOCKQUANT_BACKUP_DIR ?? "/var/lib/stockquant/backups";
const artifactVolume = process.env.STOCKQUANT_BACKUP_ARTIFACT_VOLUME;
const composeFile = resolve(process.env.STOCKQUANT_BACKUP_COMPOSE_FILE ?? join(root, "infra/compose/docker-compose.yml"));
if (!artifactVolume || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(artifactVolume)) throw new Error("set an exact STOCKQUANT_BACKUP_ARTIFACT_VOLUME");
if (process.argv.length !== 3 || process.argv[2] !== `--confirm-writes-quiesced=cluster/${artifactVolume}`) throw new Error(`refusing cluster backup: stop all database writers and artifact publishers, then pass --confirm-writes-quiesced=cluster/${artifactVolume}`);
const rootInfo = await lstat(backupRoot).catch(() => null);
if (!rootInfo?.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o077) !== 0) throw new Error("STOCKQUANT_BACKUP_DIR must already exist as a real owner-only directory");
const createdAt = new Date().toISOString();
const date = createdAt.slice(0, 10);
const lastDay = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
const retentionClass = Number(date.slice(8, 10)) === lastDay ? "MONTH_END" : "DAILY";
const backupId = `cluster-paired-${createdAt.replaceAll(":", "-").replaceAll(".", "-")}-${randomUUID().slice(0, 8)}`;
const helperImage = process.env.STOCKQUANT_BACKUP_HELPER_IMAGE ?? "node:24.1.0-slim";
const timeoutMs = Number(process.env.STOCKQUANT_BACKUP_TIMEOUT_MS ?? 14_400_000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 86_400_000) throw new Error("STOCKQUANT_BACKUP_TIMEOUT_MS must be between 1000 and 86400000");
const compose = ["compose", "-f", composeFile];
const childEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}) };
const timeoutMessage = "backup command timed out";

function runDocker(args, { capture = false, inputPath, outputPath, extraEnv = {} } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("docker", args, { cwd: root, env: { ...childEnv, ...extraEnv }, stdio: [inputPath ? "pipe" : "ignore", outputPath ? "pipe" : capture ? "pipe" : "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;
    let killTimer;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000); }, timeoutMs);
    child.stderr.on("data", (chunk) => { if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length); });
    const writes = [];
    if (inputPath) writes.push(pipeline(createReadStream(inputPath), child.stdin));
    if (outputPath) writes.push(pipeline(child.stdout, createWriteStream(outputPath, { flags: "wx", mode: 0o600 })));
    const outputs = [];
    if (capture) child.stdout.on("data", (chunk) => outputs.push(chunk));
    const exited = new Promise((resolveExit, rejectExit) => {
      child.once("error", (error) => { clearTimeout(timer); clearTimeout(killTimer); rejectExit(error); });
      child.once("close", (code) => { clearTimeout(timer); clearTimeout(killTimer); code === 0 && !timedOut ? resolveExit() : rejectExit(new Error(timedOut ? timeoutMessage : `docker command failed (${args.slice(-2).join(" ")}): ${stderr}`)); });
    });
    Promise.all([...writes, exited]).then(() => resolveRun(capture ? Buffer.concat(outputs).toString("utf8").trim() : undefined), rejectRun);
  });
}

const dbQuery = "SELECT COALESCE(json_agg(datname ORDER BY datname),'[]'::json)::text FROM pg_database WHERE datallowconn AND NOT datistemplate";
const roleQuery = "SELECT COALESCE(json_agg(json_build_object('name',rolname,'superuser',rolsuper,'inherit',rolinherit,'createRole',rolcreaterole,'createDb',rolcreatedb,'login',rolcanlogin,'replication',rolreplication,'bypassRls',rolbypassrls,'connlimit',rolconnlimit,'validUntil',rolvaliduntil::text) ORDER BY rolname),'[]'::json)::text FROM pg_roles WHERE rolname !~ '^pg_'";
async function queryActive(sql) {
  return JSON.parse(await runDocker([...compose, "exec", "-T", "postgres", "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", sql], { capture: true }));
}
async function readDatabaseInventory() { return queryActive(dbQuery); }

const snapshotProgram = String.raw`(async () => {
const fs = require("node:fs/promises"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
async function walk(dir, prefix = "") {
  const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name)); const rows = [];
  for (const entry of entries) { const absolute = path.join(dir,entry.name), relative = prefix ? prefix + "/" + entry.name : entry.name; if (entry.isSymbolicLink()) throw new Error("artifact volume contains a symlink"); if (entry.isDirectory()) rows.push(...await walk(absolute,relative)); else if (entry.isFile()) { const bytes = await fs.readFile(absolute); rows.push({path:relative,bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex")}); } else throw new Error("artifact volume contains a non-regular entry"); }
  return rows;
}
const files = await walk("/source"); await fs.writeFile("/backup/artifact-files.json",JSON.stringify({files,totalBytes:files.reduce((n,row)=>n+row.bytes,0)})+"\n",{flag:"wx",mode:0o600}); cp.execFileSync("tar",["--numeric-owner","-C","/source","-cpf","/backup/artifacts.tar","."]);
})().catch(error => { console.error(error); process.exit(1); });`;

async function captureArtifacts(archivePath, filesPath) {
  const directory = resolve(backupRoot, backupId);
  const args = ["run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--mount", `type=volume,src=${artifactVolume},dst=/source,readonly`, "--mount", `type=bind,src=${directory},dst=/backup`, "--entrypoint", "node", helperImage, "-e", snapshotProgram];
  const imageId = await runDocker(["image", "inspect", helperImage, "--format", "{{.Id}}"], { capture: true });
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("backup helper must resolve to a local immutable image ID");
  args[args.indexOf(helperImage)] = imageId;
  await runDocker(args);
  for (const path of [archivePath, filesPath]) { const stat = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("artifact snapshot did not create regular files"); }
}

async function runDisposable(args, options) { return runDocker(args, options); }
async function isolatedRestore(inputs) {
  const pgImage = await runDocker([...compose, "config", "--images"], { capture: true }).then((value) => value.split(/\r?\n/u).find((line) => /^postgres(?::|@)/u.test(line))?.trim());
  if (!pgImage) throw new Error("could not resolve the Compose PostgreSQL image");
  const imageId = await runDocker(["image", "inspect", pgImage, "--format", "{{.Id}}"], { capture: true });
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("PostgreSQL restore image must resolve to an immutable local image ID");
  const name = `sq-cluster-restore-${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const admin = `restore_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const password = randomBytes(32).toString("hex");
  let started = false;
  const extracted = await mkdtemp(join(tmpdir(), "stockquant-cluster-restore-"));
  try {
    await runDisposable(["run", "--detach", "--rm", "--name", name, "--network", "none", "--read-only", "--user", "postgres", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=8g,uid=70,gid=70,mode=0700", "--tmpfs", "/var/run/postgresql:rw,noexec,nosuid,size=16m,uid=70,gid=70,mode=3775", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m,uid=70,gid=70,mode=1777", "-e", "POSTGRES_USER", "-e", "POSTGRES_PASSWORD", "-e", "POSTGRES_DB=postgres", imageId], { capture: true, extraEnv: { POSTGRES_USER: admin, POSTGRES_PASSWORD: password } });
    started = true;
    const inspect = JSON.parse(await runDisposable(["inspect", "--format", "{{json .}}", name], { capture: true }));
    const mounts = inspect.Mounts ?? [];
    const tmpfsTargets = Object.keys(inspect.HostConfig?.Tmpfs ?? {}).sort();
    if (inspect.HostConfig?.NetworkMode !== "none" || inspect.Config?.Labels?.["com.docker.compose.project"] || mounts.length !== 0 || Object.keys(inspect.HostConfig?.PortBindings ?? {}).length !== 0 || JSON.stringify(tmpfsTargets) !== JSON.stringify(["/tmp", "/var/lib/postgresql/data", "/var/run/postgresql"])) throw new Error("restore container is not isolated from Compose networks/volumes/ports");
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await runDisposable(["exec", name, "pg_isready", "-U", admin, "-d", "postgres"]); ready = true; break; }
      catch { await new Promise((resolveWait) => setTimeout(resolveWait, 1000)); }
    }
    if (!ready) throw new Error("isolated PostgreSQL restore container did not become ready");
    await runDisposable(["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "template1", "-f", "-"], { inputPath: inputs.clusterDump });
    const restoredDatabases = JSON.parse(await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "postgres", "-c", dbQuery], { capture: true }));
    const restoredRoles = JSON.parse(await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "postgres", "-c", roleQuery], { capture: true })).filter((role) => role.name !== admin);
    for (const database of restoredDatabases) {
      const checkedDatabase = await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", database, "-c", "SET default_transaction_read_only=on; SELECT current_database()"], { capture: true });
      if (checkedDatabase !== database) throw new Error(`restored database query did not return the expected identity: ${database}`);
    }
    const passwordRoleCount = Number(await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "postgres", "-c", `SELECT count(*) FROM pg_authid WHERE rolname <> '${admin}' AND rolpassword IS NOT NULL`], { capture: true }));
    if (passwordRoleCount !== 0) throw new Error("cluster dump restored role password material despite --no-role-passwords");
    const refQuery = "SELECT COALESCE(json_agg(json_build_object('namespace',namespace,'artifactId',artifact_id,'sha256',sha256) ORDER BY namespace,artifact_id),'[]'::json)::text FROM research_artifact_refs WHERE status IN ('PUBLISHED','RETAINED')";
    const refs = JSON.parse(await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "research_automation", "-c", refQuery], { capture: true }));
    if (restoredDatabases.includes("platform_api")) {
      const qlibTableExists = await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "platform_api", "-c", "SELECT to_regclass('public.qlib_fixture_artifacts') IS NOT NULL"], { capture: true });
      if (qlibTableExists === "t") {
        const qlibRefQuery = "SELECT COALESCE(json_agg(json_build_object('namespace','research/'||test_run_id::text||'/qlib-fixture','artifactId',rtrim(artifact_id),'sha256',rtrim(sha256)) ORDER BY test_run_id,artifact_id),'[]'::json)::text FROM qlib_fixture_artifacts WHERE payload IS NULL AND status IN ('PUBLISHED','RETAINED')";
        refs.push(...JSON.parse(await runDisposable(["exec", name, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", "platform_api", "-c", qlibRefQuery], { capture: true })));
      }
    }
    const listing = execFileSync("tar", ["-tf", inputs.artifactArchive], { encoding: "utf8", timeout: timeoutMs });
    if (listing.split(/\r?\n/u).filter(Boolean).some((entry) => entry.startsWith("/") || entry.split("/").some((part) => part === ".."))) throw new Error("artifact archive contains an unsafe restore path");
    const detailedListing = execFileSync("tar", ["-tvf", inputs.artifactArchive], { encoding: "utf8", timeout: timeoutMs });
    if (detailedListing.split(/\r?\n/u).filter(Boolean).some((entry) => !["-", "d"].includes(entry[0]))) throw new Error("artifact archive contains a link or non-regular entry");
    execFileSync("tar", ["--no-same-owner", "-C", extracted, "-xpf", inputs.artifactArchive], { timeout: timeoutMs });
    const snapshot = JSON.parse(await readFile(inputs.artifactFiles, "utf8"));
    const declared = new Map();
    for (const file of snapshot.files) {
      if (typeof file.path !== "string" || file.path.startsWith("/") || file.path.includes("\\") || file.path.split("/").some((part) => !part || part === "." || part === "..") || !/^[a-f0-9]{64}$/u.test(file.sha256 ?? "") || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || declared.has(file.path)) throw new Error("artifact snapshot inventory contains an invalid entry");
      declared.set(file.path, file);
    }
    const actual = [];
    async function walk(dir, prefix = "") { for (const entry of await readdir(dir, { withFileTypes: true })) { const rel = prefix ? `${prefix}/${entry.name}` : entry.name; const path = join(dir, entry.name); const info = await lstat(path); if (info.isSymbolicLink()) throw new Error("restored artifact contains a symlink"); if (entry.isDirectory()) await walk(path, rel); else if (info.isFile()) actual.push(rel); else throw new Error("restored artifact contains a non-regular entry"); } }
    await walk(extracted);
    if (actual.length !== declared.size || actual.some((path) => !declared.has(path))) throw new Error("restored artifact file set differs from its inventory");
    for (const [path, file] of declared) { if (!/^[a-f0-9]{64}$/u.test(file.sha256) || !Number.isSafeInteger(file.bytes)) throw new Error("artifact inventory entry is invalid"); const content = await readFile(join(extracted, ...path.split("/"))); if (content.byteLength !== file.bytes || createHash("sha256").update(content).digest("hex") !== file.sha256) throw new Error(`artifact hash mismatch: ${path}`); }
    for (const ref of refs) {
      const pieces = typeof ref.namespace === "string" ? ref.namespace.split("/") : [];
      const safeSegment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
      if (pieces.length < 2 || pieces.length > 8 || pieces[0] !== "research" || pieces.some((piece) => !safeSegment.test(piece)) || !safeSegment.test(ref.artifactId) || !/^[a-f0-9]{64}$/u.test(ref.sha256 ?? "")) throw new Error("published ArtifactRef identity is invalid");
      const namespace = pieces.join("/");
      const candidates = [`${namespace}/${ref.sha256}/${ref.artifactId}`, `${namespace}/${ref.artifactId}`];
      if (!candidates.some((path) => declared.get(path)?.sha256 === ref.sha256)) throw new Error(`published ArtifactRef does not match paired volume: ${ref.namespace}/${ref.artifactId}`);
    }
    return { status: "PASS", checkedAt: new Date().toISOString(), publishedArtifactRefs: refs.length, restoredDatabases, restoredRoles, method: "ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256" };
  } finally {
    if (started) await runDisposable(["rm", "--force", name]);
    await rm(extracted, { recursive: true, force: true });
  }
}

const roles = await queryActive(roleQuery);
const clusterMetadataPath = join(resolve(backupRoot, backupId), "cluster.sql");
const result = await produceClusterPairedBackup({
  root: backupRoot, backupId, createdAt, retentionClass, artifactVolume,
  readDatabaseInventory,
  readRoleInventory: () => queryActive(roleQuery),
  captureCluster: async (path) => {
    if (resolve(path) !== clusterMetadataPath) throw new Error("unexpected cluster dump destination");
    await runDocker([...compose, "exec", "-T", "postgres", "pg_dumpall", "-U", "postgres", "--no-role-passwords"], { outputPath: path });
  },
  captureArtifacts,
  verifyRestore: async (inputs) => {
    const validation = await isolatedRestore(inputs);
    if (JSON.stringify(validation.restoredRoles) !== JSON.stringify(roles)) throw new Error("restored global role attributes differ from the source cluster");
    return validation;
  },
});
const manifestHash = createHash("sha256").update(await readFile(join(result.directory, "manifest.json"))).digest("hex");
console.log(JSON.stringify({ status: "PASS", backupId, directory: result.directory, databases: result.manifest.databaseInventory.databases.length, roles: result.manifest.restoreValidation.restoredRoles, artifactVolume, retentionClass, manifestHash }));
