import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { producePairedBackup } from "./paired-backup.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const backupRoot = process.env.STOCKQUANT_BACKUP_DIR ?? "/var/lib/stockquant/backups";
const database = process.env.STOCKQUANT_BACKUP_DATABASE;
const artifactVolume = process.env.STOCKQUANT_BACKUP_ARTIFACT_VOLUME;
const composeFile = resolve(process.env.STOCKQUANT_BACKUP_COMPOSE_FILE ?? join(root, "infra/compose/docker-compose.yml"));
if (!database || !/^[a-zA-Z0-9_]+$/u.test(database) || !artifactVolume || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/u.test(artifactVolume)) throw new Error("set an exact STOCKQUANT_BACKUP_DATABASE and STOCKQUANT_BACKUP_ARTIFACT_VOLUME");
const confirmation = `--confirm-writes-quiesced=${database}/${artifactVolume}`;
if (process.argv.length !== 3 || process.argv[2] !== confirmation) throw new Error(`refusing paired backup: stop all database writers and artifact publishers, then pass ${confirmation} for this invocation`);
let backupRootInfo;
try { backupRootInfo = await lstat(backupRoot); }
catch { throw new Error("STOCKQUANT_BACKUP_DIR must already exist as a real directory"); }
if (!backupRootInfo.isDirectory() || backupRootInfo.isSymbolicLink()) throw new Error("STOCKQUANT_BACKUP_DIR must already exist as a real directory");
const createdAt = new Date().toISOString();
const date = createdAt.slice(0, 10);
const lastDay = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
const retentionClass = Number(date.slice(8, 10)) === lastDay ? "MONTH_END" : "DAILY";
const backupId = `paired-${createdAt.replaceAll(":", "-").replaceAll(".", "-")}-${randomUUID().slice(0, 8)}`;
const helperImage = process.env.STOCKQUANT_BACKUP_HELPER_IMAGE ?? "node:24.1.0-slim";
const timeoutMs = Number(process.env.STOCKQUANT_BACKUP_TIMEOUT_MS ?? 14_400_000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 86_400_000) throw new Error("STOCKQUANT_BACKUP_TIMEOUT_MS must be between 1000 and 86400000");
const compose = ["compose", "-f", composeFile];
const childEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}) };

function runDocker(args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("docker", args, { cwd: root, env: childEnv, stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let stderr = "";
    let timedOut = false;
    let killTimer;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000); }, timeoutMs);
    child.stderr?.on("data", (chunk) => { if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length); });
    const output = [];
    child.stdout?.on("data", (chunk) => output.push(chunk));
    child.once("error", (error) => { clearTimeout(timer); clearTimeout(killTimer); rejectRun(error); });
    child.once("close", (code) => { clearTimeout(timer); clearTimeout(killTimer); code === 0 && !timedOut ? resolveRun(Buffer.concat(output).toString("utf8").trim()) : rejectRun(new Error(timedOut ? "docker backup command timed out" : `docker command failed (${args.slice(-2).join(" ")}): ${stderr}`)); });
  });
}

async function captureDatabase(destination) {
  const child = spawn("docker", [...compose, "exec", "-T", "postgres", "pg_dump", "-U", "postgres", "-Fc", "-d", database], { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let timedOut = false;
  let killTimer;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000); }, timeoutMs);
  child.stderr.on("data", (chunk) => { if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length); });
  const writing = pipeline(child.stdout, createWriteStream(destination, { flags: "wx", mode: 0o600 }));
  const exited = new Promise((resolveExit, rejectExit) => { child.once("error", (error) => { clearTimeout(timer); clearTimeout(killTimer); rejectExit(error); }); child.once("close", (code) => { clearTimeout(timer); clearTimeout(killTimer); code === 0 && !timedOut ? resolveExit() : rejectExit(new Error(timedOut ? "pg_dump timed out" : `pg_dump failed (${code}): ${stderr}`)); }); });
  await Promise.all([writing, exited]);
}

async function restoreDatabaseFromDump(restoreDatabase, dumpPath) {
  const child = spawn("docker", [...compose, "exec", "-T", "postgres", "pg_restore", "-U", "postgres", "--no-owner", "--no-privileges", "-d", restoreDatabase], { cwd: root, env: childEnv, stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "", timedOut = false, killTimer;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000); }, timeoutMs);
  child.stderr.on("data", (chunk) => { if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length); });
  const transfer = pipeline(createReadStream(dumpPath), child.stdin);
  const exited = new Promise((resolveExit, rejectExit) => {
    child.once("error", (error) => { clearTimeout(timer); clearTimeout(killTimer); rejectExit(error); });
    child.once("close", (code) => { clearTimeout(timer); clearTimeout(killTimer); code === 0 && !timedOut ? resolveExit() : rejectExit(new Error(timedOut ? "isolated pg_restore timed out" : `isolated pg_restore failed (${code}): ${stderr}`)); });
  });
  await Promise.all([transfer, exited]);
}

async function verifyRestoredPair(imageId, inputs) {
  const restoreDatabase = `stockquant_restore_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const extracted = await mkdtemp(join(tmpdir(), "stockquant-backup-verify-"));
  let created = false;
  try {
    await runDocker([...compose, "exec", "-T", "postgres", "createdb", "-U", "postgres", restoreDatabase]);
    created = true;
    await restoreDatabaseFromDump(restoreDatabase, inputs.databaseDump);
    const query = "SELECT COALESCE(json_agg(json_build_object('namespace',namespace,'artifactId',artifact_id,'sha256',sha256) ORDER BY namespace,artifact_id),'[]'::json)::text FROM research_artifact_refs WHERE status='PUBLISHED'";
    const refs = JSON.parse(await runDocker([...compose, "exec", "-T", "postgres", "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", restoreDatabase, "-c", query], { capture: true }));
    if (!Array.isArray(refs)) throw new Error("isolated restore returned an invalid ArtifactRef list");
    const listing = await runDocker(["run", "--rm", "--pull", "never", "--network", "none", "--mount", `type=bind,src=${inputs.directory},dst=/backup,readonly`, "--entrypoint", "tar", imageId, "-tf", "/backup/artifacts.tar"], { capture: true });
    if (listing.split(/\r?\n/u).filter(Boolean).some((entry) => entry.startsWith("/") || entry.split("/").some((part) => part === ".."))) throw new Error("artifact archive contains an unsafe restore path");
    execFileSync("tar", ["--no-same-owner", "-C", extracted, "-xpf", inputs.artifactArchive], { timeout: timeoutMs });
    const snapshot = JSON.parse(await readFile(inputs.artifactFiles, "utf8"));
    if (!Array.isArray(snapshot.files)) throw new Error("artifact file inventory is invalid");
    const declared = new Map();
    for (const file of snapshot.files) {
      if (typeof file.path !== "string" || file.path.startsWith("/") || file.path.includes("\\") || file.path.split("/").some((part) => !part || part === "." || part === "..") || !/^[a-f0-9]{64}$/u.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || declared.has(file.path)) throw new Error("artifact file inventory contains an invalid entry");
      declared.set(file.path, file);
    }
    const actual = [];
    async function walk(directory, prefix = "") {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        const path = join(directory, entry.name);
        const info = await lstat(path);
        if (info.isSymbolicLink()) throw new Error("restored artifact snapshot contains a symlink");
        if (entry.isDirectory()) await walk(path, relative);
        else if (info.isFile()) actual.push(relative);
        else throw new Error("restored artifact snapshot contains a non-regular entry");
      }
    }
    await walk(extracted);
    if (actual.length !== declared.size || actual.some((path) => !declared.has(path))) throw new Error("restored artifact file set differs from its snapshot inventory");
    for (const [relative, file] of declared) {
      const path = resolve(extracted, ...relative.split("/"));
      if (!path.startsWith(`${resolve(extracted)}/`)) throw new Error("artifact inventory path escapes restore root");
      const content = await readFile(path);
      if (content.byteLength !== file.bytes || createHash("sha256").update(content).digest("hex") !== file.sha256) throw new Error(`restored artifact file failed size/hash verification: ${relative}`);
    }
    for (const ref of refs) {
      const parts = typeof ref.namespace === "string" ? ref.namespace.split("/") : [];
      if (parts.length !== 4 || parts[0] !== "research" || parts.some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(part)) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(ref.artifactId)) throw new Error("restored ArtifactRef namespace or ID is unsafe");
      const relative = `research/${parts.slice(1).join("/")}/${ref.artifactId}`;
      if (declared.get(relative)?.sha256 !== ref.sha256) throw new Error(`published ArtifactRef is absent or has a different hash in the paired volume: ${ref.namespace}/${ref.artifactId}`);
    }
    return { checkedAt: new Date().toISOString(), publishedArtifactRefs: refs.length, method: "PG_RESTORE_AND_ARTIFACT_SHA256" };
  } finally {
    if (created) await runDocker([...compose, "exec", "-T", "postgres", "dropdb", "-U", "postgres", "--if-exists", restoreDatabase]);
    await rm(extracted, { recursive: true, force: true });
  }
}

const snapshotProgram = String.raw`(async () => {
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
async function walk(dir, prefix = "") {
  const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name));
  const rows = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isSymbolicLink()) throw new Error("artifact volume contains a symlink");
    if (entry.isDirectory()) rows.push(...await walk(absolute, relative));
    else if (entry.isFile()) {
      const bytes = await fs.readFile(absolute);
      rows.push({ path: relative, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    } else throw new Error("artifact volume contains a non-regular filesystem entry");
  }
  return rows;
}
const files = await walk("/source");
await fs.writeFile("/backup/artifact-files.json", JSON.stringify({ files, totalBytes: files.reduce((sum, row) => sum + row.bytes, 0) }) + "\n", { flag: "wx", mode: 0o600 });
cp.execFileSync("tar", ["--numeric-owner", "-C", "/source", "-cpf", "/backup/artifacts.tar", "."]);
})().catch(error => { console.error(error); process.exit(1); });`;

{
  const imageId = await runDocker(["image", "inspect", helperImage, "--format", "{{.Id}}"], { capture: true });
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("backup helper must resolve to an immutable local image ID");
  const result = await producePairedBackup({
    root: backupRoot, backupId, createdAt, retentionClass, database, artifactVolume,
    captureDatabase: (destination) => captureDatabase(destination),
    captureArtifactVolume: async (archivePath, filesPath) => {
      const args = ["run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--mount", `type=volume,src=${artifactVolume},dst=/source,readonly`, "--mount", `type=bind,src=${resolve(backupRoot, backupId)},dst=/backup`, "--entrypoint", "node", imageId, "-e", snapshotProgram];
      await runDocker(args);
      for (const path of [archivePath, filesPath]) {
        const stat = await lstat(path);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("artifact volume snapshot did not create regular files");
      }
    },
    verifyRestore: (inputs) => verifyRestoredPair(imageId, inputs),
  });
  const manifestHash = createHash("sha256").update(await readFile(join(result.directory, "manifest.json"))).digest("hex");
  console.log(JSON.stringify({ status: "PASS", backupId, directory: result.directory, database, artifactVolume, retentionClass, manifestHash }));
}
