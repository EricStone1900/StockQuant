import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { produceClusterPairedBackup } from "./cluster-paired-backup.mjs";
import { inspectBackupDirectory, runBackupRetention } from "./backup-retention.mjs";

const roles = [{ name: "postgres", superuser: true, inherit: true, createRole: true, createDb: true, login: true, replication: true, bypassRls: true, connlimit: -1, validUntil: null }];
const databases = ["market_data", "postgres", "research_automation"];

async function optionsFor(root, overrides = {}) {
  const artifactFiles = [{ path: "research/test/outputs/model.bin", bytes: 5, sha256: createHash("sha256").update("model").digest("hex") }];
  return {
    root, backupId: "cluster-paired-test-20260930", createdAt: "2026-09-30T12:00:00Z", retentionClass: "DAILY", artifactVolume: "research-artifacts-test",
    readDatabaseInventory: async () => databases,
    readRoleInventory: async () => roles,
    captureCluster: async (path) => writeFile(path, "-- pg_dumpall --no-role-passwords\n", { flag: "wx" }),
    captureArtifacts: async (archivePath, inventoryPath) => {
      await writeFile(archivePath, "isolated artifact archive", { flag: "wx" });
      await writeFile(inventoryPath, `${JSON.stringify({ files: artifactFiles, totalBytes: 5 })}\n`, { flag: "wx" });
    },
    verifyRestore: async ({ expectedDatabases, expectedRoles }) => ({ status: "PASS", checkedAt: "2026-09-30T12:00:01Z", publishedArtifactRefs: 1, restoredDatabases: expectedDatabases, restoredRoles: expectedRoles, method: "ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256" }),
    ...overrides,
  };
}

test("cluster backup records the complete database/role inventory and is retention-verifiable", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-cluster-paired-test-"));
  try {
    const captured = await produceClusterPairedBackup(await optionsFor(root));
    assert.equal(captured.manifest.format, "stockquant.paired-backup.cluster.v2");
    assert.deepEqual(captured.manifest.databaseInventory.databases, databases);
    assert.deepEqual(captured.manifest.databaseInventory.roles, roles);
    assert.equal(captured.manifest.restoreValidation.publishedArtifactRefs, 1);
    assert.equal((await inspectBackupDirectory(captured.directory)).valid, true);
    assert.equal(JSON.parse(await readFile(join(captured.directory, "database-inventory.json"), "utf8")).roles[0].name, "postgres");
    const retention = await runBackupRetention({ root, now: "2026-09-30T12:00:00Z" });
    assert.equal(retention.eligibleBackups, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cluster backup fails closed when the database or role inventory drifts during capture", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-cluster-paired-drift-"));
  try {
    let calls = 0;
    const options = await optionsFor(root, { readDatabaseInventory: async () => (++calls === 1 ? databases : [...databases, "late_database"]) });
    await assert.rejects(produceClusterPairedBackup(options), /inventory changed while cluster dump was captured/u);
    assert.equal((await runBackupRetention({ root })).eligibleBackups, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cluster backup fails closed when global role attributes change during capture", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-cluster-paired-role-drift-"));
  try {
    let calls = 0;
    const changedRoles = [{ ...roles[0], login: false }];
    const options = await optionsFor(root, { readRoleInventory: async () => (++calls === 1 ? roles : changedRoles) });
    await assert.rejects(produceClusterPairedBackup(options), /global role inventory changed while cluster dump was captured/u);
    assert.equal((await runBackupRetention({ root })).eligibleBackups, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cluster backup rejects self-asserted or incomplete isolated restore evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-cluster-paired-unverified-"));
  try {
    const options = await optionsFor(root, { verifyRestore: async () => ({ status: "PASS", checkedAt: "2026-09-30T12:00:01Z", publishedArtifactRefs: 0, restoredDatabases: databases, restoredRoles: [], method: "SELF_ASSERTED" }) });
    await assert.rejects(produceClusterPairedBackup(options), /global role inventory is invalid/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cluster backup rejects role inventory fields that could carry credential material", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-cluster-paired-role-secret-"));
  try {
    const options = await optionsFor(root, { readRoleInventory: async () => [{ ...roles[0], password: "must-not-be-written" }] });
    await assert.rejects(produceClusterPairedBackup(options), /global role inventory is invalid/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
