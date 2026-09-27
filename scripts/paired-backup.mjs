import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, lstat, open, readdir, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { inspectBackupDirectory } from "./backup-retention.mjs";

const BACKUP_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

async function fileEvidence(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("paired backup entries must be regular files");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
  return { path: path.split("/").at(-1), bytes: info.size, sha256: hash.digest("hex") };
}

export async function producePairedBackup(options) {
  if (!options || typeof options.root !== "string" || !isAbsolute(options.root)) throw new Error("backup root must be absolute");
  if (!BACKUP_ID.test(options.backupId ?? "") || options.backupId.startsWith(".")) throw new Error("backupId is invalid");
  if (!Number.isFinite(Date.parse(options.createdAt)) || !["DAILY", "MONTH_END"].includes(options.retentionClass)) throw new Error("backup timestamp or retention class is invalid");
  if (options.retentionClass === "MONTH_END") {
    const createdAt = new Date(options.createdAt);
    const lastDay = new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + 1, 0)).getUTCDate();
    if (createdAt.getUTCDate() !== lastDay) throw new Error("MONTH_END backup must be created on the final UTC calendar day");
  }
  if (typeof options.database !== "string" || !options.database || typeof options.artifactVolume !== "string" || !options.artifactVolume) throw new Error("backup source identities are required");
  if (typeof options.captureDatabase !== "function" || typeof options.captureArtifactVolume !== "function" || typeof options.verifyRestore !== "function") throw new Error("database capture, Artifact capture, and isolated restore verification are required");

  const root = resolve(options.root);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("backup root must be a real directory, not a symlink");
  const target = join(root, options.backupId);
  await mkdir(target, { mode: 0o700 }); // Reserve the final identity. A partial directory has no manifest and is never retention-eligible.
  await options.captureDatabase(join(target, "database.dump"));
  await options.captureArtifactVolume(join(target, "artifacts.tar"), join(target, "artifact-files.json"));
  const restoreValidation = await options.verifyRestore({ directory: target, databaseDump: join(target, "database.dump"), artifactArchive: join(target, "artifacts.tar"), artifactFiles: join(target, "artifact-files.json") });
  if (!restoreValidation || !Number.isSafeInteger(restoreValidation.publishedArtifactRefs) || restoreValidation.publishedArtifactRefs < 0 || typeof restoreValidation.checkedAt !== "string" || !Number.isFinite(Date.parse(restoreValidation.checkedAt)) || restoreValidation.method !== "PG_RESTORE_AND_ARTIFACT_SHA256") throw new Error("isolated restore verification did not return valid evidence");

  const entries = (await readdir(target, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const expected = ["artifact-files.json", "artifacts.tar", "database.dump"];
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) || entries.map((entry) => entry.name).join("\0") !== expected.join("\0")) throw new Error("backup capture did not produce exactly the required regular files");
  const files = [];
  for (const name of expected) files.push(await fileEvidence(join(target, name)));
  if (files.some((file) => file.bytes <= 0 || !SHA256.test(file.sha256))) throw new Error("backup capture produced an empty or invalid file");

  const manifest = {
    format: "stockquant.paired-backup.v1",
    backupId: options.backupId,
    createdAt: new Date(options.createdAt).toISOString(),
    retentionClass: options.retentionClass,
    database: options.database,
    artifactVolume: options.artifactVolume,
    restoreValidation: { status: "PASS", checkedAt: new Date(restoreValidation.checkedAt).toISOString(), publishedArtifactRefs: restoreValidation.publishedArtifactRefs, method: restoreValidation.method },
    files,
  };
  const manifestPath = join(target, "manifest.json.tmp");
  const manifestHandle = await open(manifestPath, "wx", 0o600);
  try { await manifestHandle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`); await manifestHandle.sync(); }
  finally { await manifestHandle.close(); }
  await rename(manifestPath, join(target, "manifest.json")); // Manifest is the commit marker for a complete paired snapshot.
  const directoryHandle = await open(root, "r");
  try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
  const inspected = await inspectBackupDirectory(target);
  if (!inspected.valid) throw new Error(`new paired backup failed self-validation: ${inspected.reason}`);
  return { directory: target, manifest };
}
