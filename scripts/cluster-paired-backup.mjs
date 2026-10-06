import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, lstat, open, readdir, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { inspectBackupDirectory } from "./backup-retention.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const FILES = ["artifact-files.json", "artifacts.tar", "cluster.sql", "database-inventory.json"];
const ROLE_FIELDS = new Set(["name", "superuser", "inherit", "createRole", "createDb", "login", "replication", "bypassRls", "connlimit", "validUntil"]);

async function evidence(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0) throw new Error("cluster backup entries must be non-empty regular files");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
  return { path: path.split("/").at(-1), bytes: stat.size, sha256: hash.digest("hex") };
}

function normalizeDatabaseNames(value) {
  if (!Array.isArray(value) || value.length < 1 || value.some((name) => typeof name !== "string" || name.length < 1 || Buffer.byteLength(name) > 63 || name.includes("\0"))) throw new Error("database inventory is invalid");
  const sorted = [...value].sort();
  if (new Set(sorted).size !== sorted.length) throw new Error("database inventory contains duplicates");
  return sorted;
}

function normalizeRoles(value) {
  if (!Array.isArray(value) || value.length < 1 || value.some((role) => !role || Object.keys(role).some((field) => !ROLE_FIELDS.has(field)) || typeof role.name !== "string" || role.name.length < 1 || role.name.includes("\0") || typeof role.superuser !== "boolean" || typeof role.inherit !== "boolean" || typeof role.createRole !== "boolean" || typeof role.createDb !== "boolean" || typeof role.login !== "boolean" || typeof role.replication !== "boolean" || typeof role.bypassRls !== "boolean" || !Number.isSafeInteger(role.connlimit) || (role.validUntil !== null && typeof role.validUntil !== "string"))) throw new Error("global role inventory is invalid");
  const sorted = [...value].sort((a, b) => a.name.localeCompare(b.name));
  if (new Set(sorted.map((role) => role.name)).size !== sorted.length) throw new Error("global role inventory contains duplicates");
  return sorted;
}

export async function produceClusterPairedBackup(options) {
  if (!options || !isAbsolute(options.root ?? "") || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(options.backupId ?? "") || options.backupId.startsWith(".")) throw new Error("cluster backup root or identity is invalid");
  if (!Number.isFinite(Date.parse(options.createdAt)) || !["DAILY", "MONTH_END"].includes(options.retentionClass)) throw new Error("cluster backup timestamp or retention class is invalid");
  if (typeof options.artifactVolume !== "string" || !options.artifactVolume || typeof options.captureCluster !== "function" || typeof options.captureArtifacts !== "function" || typeof options.readRoleInventory !== "function" || typeof options.verifyRestore !== "function") throw new Error("cluster capture, Artifact capture, role inventory, and isolated restore verification are required");
  const root = resolve(options.root);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || (rootStat.mode & 0o077) !== 0) throw new Error("cluster backup root must be a real owner-only directory");
  const target = join(root, options.backupId);
  await mkdir(target, { mode: 0o700 });
  let committed = false;
  try {
    const before = normalizeDatabaseNames(await options.readDatabaseInventory());
    const rolesBefore = normalizeRoles(await options.readRoleInventory());
    await options.captureCluster(join(target, "cluster.sql"));
    const during = normalizeDatabaseNames(await options.readDatabaseInventory());
    const rolesDuring = normalizeRoles(await options.readRoleInventory());
    if (JSON.stringify(before) !== JSON.stringify(during) || JSON.stringify(rolesBefore) !== JSON.stringify(rolesDuring)) throw new Error("database or global role inventory changed while cluster dump was captured");
    await writeFile(join(target, "database-inventory.json"), `${JSON.stringify({ databases: before, roles: rolesBefore }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await options.captureArtifacts(join(target, "artifacts.tar"), join(target, "artifact-files.json"));
    const after = normalizeDatabaseNames(await options.readDatabaseInventory());
    const rolesAfter = normalizeRoles(await options.readRoleInventory());
    if (JSON.stringify(before) !== JSON.stringify(after) || JSON.stringify(rolesBefore) !== JSON.stringify(rolesAfter)) throw new Error("database or global role inventory changed during paired capture");
    const restoreValidation = await options.verifyRestore({ directory: target, clusterDump: join(target, "cluster.sql"), databaseInventory: join(target, "database-inventory.json"), artifactArchive: join(target, "artifacts.tar"), artifactFiles: join(target, "artifact-files.json"), expectedDatabases: before, expectedRoles: rolesBefore });
    if (!restoreValidation || restoreValidation.status !== "PASS" || !Number.isSafeInteger(restoreValidation.publishedArtifactRefs) || restoreValidation.publishedArtifactRefs < 0 || !Array.isArray(restoreValidation.restoredDatabases) || JSON.stringify(normalizeDatabaseNames(restoreValidation.restoredDatabases)) !== JSON.stringify(before) || !Array.isArray(restoreValidation.restoredRoles) || JSON.stringify(normalizeRoles(restoreValidation.restoredRoles)) !== JSON.stringify(rolesBefore) || restoreValidation.method !== "ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256" || !Number.isFinite(Date.parse(restoreValidation.checkedAt))) throw new Error("isolated cluster restore verification returned incomplete evidence");
    const entries = (await readdir(target, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    if (entries.length !== FILES.length || entries.some((entry, index) => entry.name !== FILES[index] || !entry.isFile() || entry.isSymbolicLink())) throw new Error("cluster capture did not produce exactly the required files");
    const files = [];
    for (const name of FILES) files.push(await evidence(join(target, name)));
    const manifest = {
      format: "stockquant.paired-backup.cluster.v2", backupId: options.backupId,
      createdAt: new Date(options.createdAt).toISOString(), retentionClass: options.retentionClass,
      databaseInventory: { databases: before, roles: rolesBefore }, artifactVolume: options.artifactVolume,
      restoreValidation: { status: "PASS", checkedAt: new Date(restoreValidation.checkedAt).toISOString(), publishedArtifactRefs: restoreValidation.publishedArtifactRefs, restoredDatabases: before, restoredRoles: rolesBefore, method: restoreValidation.method }, files,
    };
    const manifestTmp = join(target, "manifest.json.tmp");
    const handle = await open(manifestTmp, "wx", 0o600);
    try { await handle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`); await handle.sync(); } finally { await handle.close(); }
    await rename(manifestTmp, join(target, "manifest.json"));
    const rootHandle = await open(root, "r");
    try { await rootHandle.sync(); } finally { await rootHandle.close(); }
    const inspected = await inspectBackupDirectory(target);
    if (!inspected.valid) throw new Error(`new cluster backup failed self-validation: ${inspected.reason}`);
    committed = true;
    return { directory: target, manifest };
  } finally {
    if (!committed) {
      // Preserve failed evidence for diagnosis; absent manifest keeps it out of retention eligibility.
    }
  }
}
