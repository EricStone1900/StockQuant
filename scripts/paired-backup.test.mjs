import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectBackupDirectory, runBackupRetention } from "./backup-retention.mjs";
import { producePairedBackup } from "./paired-backup.mjs";

const backupCli = fileURLToPath(new URL("./create-cluster-paired-backup.mjs", import.meta.url));

function runBackupCli(env, args = []) {
  return spawnSync(process.execPath, [backupCli, ...args], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: tmpdir(), ...env }, encoding: "utf8", timeout: 5000 });
}

test("cluster backup CLI fails closed before Docker unless quiescence and an exact Artifact volume are supplied", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-backup-cli-preflight-"));
  try {
    const volume = "research-artifacts-test";
    const unacknowledged = runBackupCli({ STOCKQUANT_BACKUP_DIR: root, STOCKQUANT_BACKUP_ARTIFACT_VOLUME: volume }, []);
    assert.notEqual(unacknowledged.status, 0);
    assert.match(unacknowledged.stderr, /stop all database writers and artifact publishers/u);
    assert.doesNotMatch(unacknowledged.stderr, /docker command failed/u);

    const missingVolume = runBackupCli({ STOCKQUANT_BACKUP_DIR: root }, ["--confirm-writes-quiesced=cluster/research-artifacts-test"]);
    assert.notEqual(missingVolume.status, 0);
    assert.match(missingVolume.stderr, /exact STOCKQUANT_BACKUP_ARTIFACT_VOLUME/u);
    assert.doesNotMatch(missingVolume.stderr, /docker command failed/u);

    const env = { STOCKQUANT_BACKUP_ARTIFACT_VOLUME: volume };
    const mismatched = runBackupCli({ STOCKQUANT_BACKUP_DIR: root, ...env }, ["--confirm-writes-quiesced=cluster/other-volume"]);
    assert.notEqual(mismatched.status, 0);
    assert.match(mismatched.stderr, /pass --confirm-writes-quiesced=cluster\/research-artifacts-test/u);
    assert.doesNotMatch(mismatched.stderr, /docker command failed/u);

    const missingRoot = runBackupCli({ STOCKQUANT_BACKUP_DIR: join(root, "absent"), ...env }, ["--confirm-writes-quiesced=cluster/research-artifacts-test"]);
    assert.notEqual(missingRoot.status, 0);
    assert.match(missingRoot.stderr, /must already exist as a real owner-only directory/u);
    assert.doesNotMatch(missingRoot.stderr, /docker command failed/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("paired producer publishes a verified database/artifact set with manifest written last", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-paired-backup-test-"));
  const backupId = "paired-test-20260925-01";
  try {
    const captured = await producePairedBackup({
      root, backupId, createdAt: "2026-09-25T12:00:00Z", retentionClass: "DAILY",
      database: "research_automation_test", artifactVolume: "research-artifacts-test",
      captureDatabase: async (path) => writeFile(path, Buffer.from("isolated pg_dump bytes"), { flag: "wx" }),
      verifyRestore: async () => ({ checkedAt: "2026-09-25T12:00:00Z", publishedArtifactRefs: 1, method: "PG_RESTORE_AND_ARTIFACT_SHA256" }),
      captureArtifactVolume: async (archivePath, filesPath) => {
        await writeFile(archivePath, Buffer.from("isolated tar bytes"), { flag: "wx" });
        await writeFile(filesPath, JSON.stringify({ files: [{ path: "research/run/output", bytes: 3, sha256: "a".repeat(64) }], totalBytes: 3 }), { flag: "wx" });
      },
    });
    assert.equal(captured.manifest.files.length, 3);
    assert.equal((await inspectBackupDirectory(captured.directory)).valid, true);
    assert.equal(JSON.parse(await readFile(join(captured.directory, "manifest.json"), "utf8")).database, "research_automation_test");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed capture leaves an incomplete non-retention-eligible directory and duplicate IDs are refused", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-paired-backup-failure-"));
  try {
    const options = {
      root, backupId: "paired-incomplete", createdAt: "2026-09-25T12:00:00Z", retentionClass: "DAILY",
      database: "research_automation_test", artifactVolume: "research-artifacts-test",
      captureDatabase: async (path) => writeFile(path, Buffer.from("partial pg_dump"), { flag: "wx" }),
      verifyRestore: async () => ({ checkedAt: "2026-09-25T12:00:00Z", publishedArtifactRefs: 0, method: "PG_RESTORE_AND_ARTIFACT_SHA256" }),
      captureArtifactVolume: async () => { throw new Error("isolated exporter failure"); },
    };
    await assert.rejects(producePairedBackup(options), /isolated exporter failure/u);
    await assert.rejects(producePairedBackup(options), /EEXIST/u);
    const retention = await runBackupRetention({ root, now: "2026-09-25T12:00:00Z" });
    assert.equal(retention.eligibleBackups, 0);
    assert.equal(retention.ignoredBackups.length, 1);
    assert.equal(retention.ignoredBackups[0].backupId, "paired-incomplete");
    assert.match(retention.ignoredBackups[0].reason, /ENOENT/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("restore verification is mandatory before the retention manifest can be committed", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-paired-backup-unverified-"));
  try {
    await assert.rejects(producePairedBackup({
      root, backupId: "paired-unverified", createdAt: "2026-09-25T12:00:00Z", retentionClass: "DAILY",
      database: "research_automation_test", artifactVolume: "research-artifacts-test",
      captureDatabase: async (path) => writeFile(path, Buffer.from("database dump"), { flag: "wx" }),
      captureArtifactVolume: async (archive, inventory) => {
        await writeFile(archive, Buffer.from("artifact archive"), { flag: "wx" });
        await writeFile(inventory, JSON.stringify({ files: [], totalBytes: 0 }), { flag: "wx" });
      },
      verifyRestore: async () => { throw new Error("ArtifactRef/hash mismatch"); },
    }), /ArtifactRef\/hash mismatch/u);
    assert.equal((await inspectBackupDirectory(join(root, "paired-unverified"))).valid, false);
    const plan = await runBackupRetention({ root, now: "2026-09-25T12:00:00Z" });
    assert.equal(plan.eligibleBackups, 0);
    assert.ok(plan.ignoredBackups.some((entry) => entry.backupId === "paired-unverified"));
    await assert.rejects(producePairedBackup({
      root, backupId: "paired-forged-validation", createdAt: "2026-09-25T12:00:00Z", retentionClass: "DAILY",
      database: "research_automation_test", artifactVolume: "research-artifacts-test",
      captureDatabase: async (path) => writeFile(path, Buffer.from("database dump"), { flag: "wx" }),
      captureArtifactVolume: async (archive, inventory) => { await writeFile(archive, Buffer.from("artifact archive"), { flag: "wx" }); await writeFile(inventory, "{\"files\":[],\"totalBytes\":0}", { flag: "wx" }); },
      verifyRestore: async () => ({ checkedAt: "2026-09-25T12:00:00Z", publishedArtifactRefs: 0, method: "SELF_ASSERTED" }),
    }), /valid evidence/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("paired producer validates source output shape and requires an existing real backup root", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-paired-backup-invalid-"));
  try {
    const options = {
      root, backupId: "paired-invalid", createdAt: "2026-09-25T12:00:00Z", retentionClass: "DAILY",
      database: "research_automation_test", artifactVolume: "research-artifacts-test",
      captureDatabase: async (path) => writeFile(path, Buffer.from("db"), { flag: "wx" }),
      verifyRestore: async () => ({ checkedAt: "2026-09-25T12:00:00Z", publishedArtifactRefs: 0, method: "PG_RESTORE_AND_ARTIFACT_SHA256" }),
      captureArtifactVolume: async (archivePath) => writeFile(archivePath, Buffer.from("archive"), { flag: "wx" }),
    };
    await assert.rejects(producePairedBackup(options), /exactly the required regular files/u);
    await assert.rejects(producePairedBackup({ ...options, root: "relative/path" }), /must be absolute/u);
    await assert.rejects(producePairedBackup({ ...options, backupId: "../escape" }), /backupId is invalid/u);
    await assert.rejects(producePairedBackup({ ...options, backupId: "paired-month-end-invalid", retentionClass: "MONTH_END" }), /final UTC calendar day/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
