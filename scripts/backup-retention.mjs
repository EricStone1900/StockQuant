import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir, readFile, realpath, rm } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const FORMATS = new Set(["stockquant.paired-backup.v1", "stockquant.paired-backup.cluster.v2"]);
const DAY_MS = 24 * 60 * 60 * 1000;

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function isSafeRelativeFile(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || isAbsolute(value)) return false;
  const normalized = value.split("/");
  return normalized.every((part) => part !== "" && part !== "." && part !== "..") && value !== "manifest.json";
}

async function listFilesWithoutSymlinks(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (prefix === "" && entry.name === "manifest.json") continue;
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`backup contains a symbolic link: ${prefix}${entry.name}`);
    if (stat.isDirectory()) files.push(...await listFilesWithoutSymlinks(path, `${prefix}${entry.name}/`));
    else if (stat.isFile()) files.push({ path: `${prefix}${entry.name}`, bytes: stat.size });
    else throw new Error(`backup contains a non-regular file: ${prefix}${entry.name}`);
  }
  return files;
}

export async function inspectBackupDirectory(directory) {
  try {
    const dirStat = await lstat(directory);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) return { valid: false, reason: "not-a-regular-directory" };
    const manifestStat = await lstat(join(directory, "manifest.json"));
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) return { valid: false, reason: "manifest-not-a-regular-file" };
    const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
    if (!FORMATS.has(manifest.format) || manifest.backupId !== directory.split(sep).at(-1) || !Number.isFinite(Date.parse(manifest.createdAt))) return { valid: false, reason: "invalid-manifest-identity" };
    const clusterV2 = manifest.format === "stockquant.paired-backup.cluster.v2";
    const validationMethod = clusterV2 ? "ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256" : "PG_RESTORE_AND_ARTIFACT_SHA256";
    if (manifest.restoreValidation?.status !== "PASS" || !Number.isFinite(Date.parse(manifest.restoreValidation.checkedAt)) || !Number.isSafeInteger(manifest.restoreValidation.publishedArtifactRefs) || manifest.restoreValidation.publishedArtifactRefs < 0 || manifest.restoreValidation.method !== validationMethod) return { valid: false, reason: "backup-restore-not-verified" };
    if (!( ["DAILY", "MONTH_END"].includes(manifest.retentionClass)) || typeof manifest.artifactVolume !== "string" || !manifest.artifactVolume || (!clusterV2 && (typeof manifest.database !== "string" || !manifest.database))) return { valid: false, reason: "invalid-manifest-metadata" };
    if (clusterV2) {
      const databases = manifest.databaseInventory?.databases;
      const roles = manifest.databaseInventory?.roles;
      if (!Array.isArray(databases) || databases.length < 1 || databases.some((name) => typeof name !== "string" || name.length < 1 || Buffer.byteLength(name) > 63 || name.includes("\0")) || new Set(databases).size !== databases.length || JSON.stringify([...databases].sort()) !== JSON.stringify(databases) || JSON.stringify(manifest.restoreValidation.restoredDatabases) !== JSON.stringify(databases) || !Array.isArray(roles) || roles.length < 1 || JSON.stringify(manifest.restoreValidation.restoredRoles) !== JSON.stringify(roles) || roles.some((role) => typeof role.name !== "string" || typeof role.superuser !== "boolean" || typeof role.inherit !== "boolean" || typeof role.createRole !== "boolean" || typeof role.createDb !== "boolean" || typeof role.login !== "boolean" || typeof role.replication !== "boolean" || typeof role.bypassRls !== "boolean" || !Number.isSafeInteger(role.connlimit) || (role.validUntil !== null && typeof role.validUntil !== "string"))) return { valid: false, reason: "invalid-cluster-inventory-or-restore-validation" };
      const business = manifest.businessFactValidation;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (business !== undefined && (
        !uuid.test(business.testRunId ?? "") || business.run?.testRunId !== business.testRunId ||
        typeof business.run?.namespace !== "string" || !business.run.namespace || typeof business.run?.status !== "string" || !business.run.status ||
        !uuid.test(business.trade?.orderId ?? "") || !uuid.test(business.trade?.fillId ?? "") || business.trade?.outboxStatus !== "DELIVERED" ||
        !Number.isSafeInteger(business.trade?.quantity) || business.trade.quantity < 1 || typeof business.trade?.price !== "string" || typeof business.trade?.fee !== "string" ||
        !uuid.test(business.portfolio?.accountId ?? "") || business.portfolio?.testRunId !== business.testRunId || business.portfolio?.ownerId !== business.run?.ownerId ||
        !Number.isSafeInteger(business.portfolio?.ledgerEntryCount) || business.portfolio.ledgerEntryCount < 1 || !Number.isSafeInteger(business.portfolio?.positionQuantity) || business.portfolio.positionQuantity < 0 ||
        business.portfolio?.fillId !== business.trade?.fillId || typeof business.portfolio?.cashAmount !== "string" || typeof business.portfolio?.currency !== "string" ||
        !Number.isSafeInteger(business.portfolio?.ledgerVersion) || business.portfolio.ledgerVersion < 1 ||
        business.relationChecks?.namespaceMatches !== true || business.relationChecks?.orderFillOutboxLinked !== true || business.relationChecks?.portfolioAndBrokerFillIdsMatch !== true || business.relationChecks?.ledgerAndPositionRestored !== true
      )) return { valid: false, reason: "invalid-business-fact-restore-validation" };
    }
    if (!Array.isArray(manifest.files) || manifest.files.length < 1) return { valid: false, reason: "manifest-has-no-files" };
    const declared = new Map();
    for (const file of manifest.files) {
      if (!isSafeRelativeFile(file.path) || !/^[a-f0-9]{64}$/u.test(file.sha256 ?? "") || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || declared.has(file.path)) return { valid: false, reason: "invalid-file-entry" };
      declared.set(file.path, file);
    }
    const actual = await listFilesWithoutSymlinks(directory);
    if (actual.length !== declared.size || actual.some(({ path }) => !declared.has(path))) return { valid: false, reason: "backup-file-set-mismatch" };
    for (const file of actual) {
      const declaration = declared.get(file.path);
      if (file.bytes !== declaration.bytes) return { valid: false, reason: "backup-file-size-mismatch" };
      if (await sha256File(join(directory, ...file.path.split("/"))) !== declaration.sha256) return { valid: false, reason: "backup-file-hash-mismatch" };
    }
    const created = new Date(manifest.createdAt);
    if (manifest.retentionClass === "MONTH_END") {
      const lastDay = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth() + 1, 0)).getUTCDate();
      if (created.getUTCDate() !== lastDay) return { valid: false, reason: "month-end-class-not-created-at-month-end" };
    }
    return { valid: true, backupId: manifest.backupId, createdAt: created.toISOString(), retentionClass: manifest.retentionClass };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : "backup-inspection-failed" };
  }
}

function monthKey(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }

export function selectExpiredBackups(backups, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const dailyDays = options.dailyDays ?? 30;
  const monthlyMonths = options.monthlyMonths ?? 12;
  if (Number.isNaN(now.getTime()) || !Number.isInteger(dailyDays) || dailyDays < 1 || !Number.isInteger(monthlyMonths) || monthlyMonths < 1) throw new Error("backup retention options are invalid");
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dailyCutoff = utcToday - (dailyDays - 1) * DAY_MS;
  const firstMonthly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthlyMonths + 1, 1));
  return backups.filter((backup) => {
    const created = new Date(backup.createdAt);
    if (backup.retentionClass === "DAILY") return Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()) < dailyCutoff;
    return backup.retentionClass === "MONTH_END" && monthKey(created) < monthKey(firstMonthly);
  }).map((backup) => backup.backupId).sort();
}

export async function runBackupRetention(options = {}) {
  const configuredRoot = options.root ?? process.env.STOCKQUANT_BACKUP_DIR;
  if (!configuredRoot) throw new Error("STOCKQUANT_BACKUP_DIR must name the backup root");
  if (!isAbsolute(configuredRoot)) throw new Error("backup root must be absolute");
  const root = resolve(configuredRoot);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("backup root must be a real directory, not a symlink");
  if ((rootStat.mode & 0o022) !== 0) throw new Error("backup root must not be group- or world-writable");
  const rootReal = await realpath(root);
  const apply = options.apply === true;
  if (apply) {
    if (!options.confirmRoot || !isAbsolute(options.confirmRoot)) throw new Error("apply requires an explicit absolute confirmRoot matching the configured backup root");
    if (resolve(options.confirmRoot) !== root) throw new Error("confirmRoot does not exactly match the configured absolute backup root");
  }
  const entries = await readdir(root, { withFileTypes: true });
  const valid = [];
  const ignored = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const path = join(root, entry.name);
    const result = await inspectBackupDirectory(path);
    if (result.valid) valid.push(result);
    else ignored.push({ backupId: entry.name, reason: result.reason });
  }
  const expiredIds = selectExpiredBackups(valid, options);
  if (apply) {
    for (const backupId of expiredIds) {
      const path = join(root, backupId);
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink() || relative(rootReal, await realpath(path)).startsWith(`..${sep}`)) throw new Error(`refusing to remove backup outside the configured root: ${backupId}`);
      const current = await inspectBackupDirectory(path);
      if (!current.valid || current.backupId !== backupId || !selectExpiredBackups([current], options).includes(backupId)) {
        throw new Error(`refusing to remove backup that changed after retention selection: ${backupId}`);
      }
      await rm(path, { recursive: true, force: false });
    }
  }
  return { root, mode: apply ? "APPLY" : "DRY_RUN", eligibleBackups: valid.length, expiredBackups: expiredIds, removedBackups: apply ? expiredIds : [], ignoredBackups: ignored };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const confirmations = process.argv.slice(2).filter((argument) => argument.startsWith("--confirm-root="));
    if (confirmations.length > 1) throw new Error("only one --confirm-root argument is allowed");
    const result = await runBackupRetention({ apply: process.argv.includes("--apply"), ...(confirmations.length === 1 ? { confirmRoot: confirmations[0].slice("--confirm-root=".length) } : {}) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "backup retention failed"}\n`);
    process.exitCode = 1;
  }
}
