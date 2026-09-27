import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runBackupRetention, selectExpiredBackups } from "./backup-retention.mjs";

test("30-day daily and 12-month month-end retention is preview-first and removes only verified archives", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-backup-retention-"));
  try {
    const valid = [
      ["daily-in-window", "2026-08-27T23:00:00Z", "DAILY", true],
      ["daily-expired", "2026-08-26T23:00:00Z", "DAILY", true],
      ["month-end-in-window", "2025-10-31T23:00:00Z", "MONTH_END", true],
      ["month-end-expired", "2025-08-31T23:00:00Z", "MONTH_END", true],
      ["corrupt-but-old", "2026-01-01T00:00:00Z", "DAILY", false],
    ];
    for (const [backupId, createdAt, retentionClass, intact] of valid) {
      const directory = join(root, backupId);
      await mkdir(directory);
      const contents = Buffer.from(`isolated test bytes for ${backupId}`);
      await writeFile(join(directory, "database.dump"), contents);
      const declared = intact ? contents : Buffer.from("wrong hash");
      await writeFile(join(directory, "manifest.json"), JSON.stringify({
        format: "stockquant.paired-backup.v1",
        backupId,
        createdAt,
        retentionClass,
        database: "isolated_test",
        artifactVolume: "isolated_test_artifacts",
        restoreValidation: { status: "PASS", checkedAt: createdAt, publishedArtifactRefs: 0, method: "PG_RESTORE_AND_ARTIFACT_SHA256" },
        files: [{ path: "database.dump", bytes: contents.length, sha256: createHash("sha256").update(declared).digest("hex") }],
      }));
    }
    await mkdir(join(root, "unmanaged-directory"));
    await writeFile(join(root, "unmanaged-directory", "keep.txt"), "never manage without a manifest");
    await symlink(join(root, "daily-expired"), join(root, "directory-symlink"), "dir");

    const dryRun = await runBackupRetention({ root, now: "2026-09-25T12:00:00Z" });
    assert.equal(dryRun.mode, "DRY_RUN");
    assert.deepEqual(dryRun.expiredBackups, ["daily-expired", "month-end-expired"]);
    assert.equal(dryRun.removedBackups.length, 0);
    assert.ok(dryRun.ignoredBackups.some((entry) => entry.backupId === "corrupt-but-old" && entry.reason === "backup-file-hash-mismatch"));
    assert.equal((await readFile(join(root, "daily-expired", "database.dump"), "utf8")).startsWith("isolated test bytes"), true);
    assert.equal(selectExpiredBackups([{ backupId: "kept", createdAt: "2026-08-27T00:00:00Z", retentionClass: "DAILY" }], { now: "2026-09-25T00:00:00Z" }).length, 0);

    await assert.rejects(runBackupRetention({ root, now: "2026-09-25T12:00:00Z", apply: true }), /requires an explicit absolute confirmRoot/u);
    await assert.rejects(runBackupRetention({ root, now: "2026-09-25T12:00:00Z", apply: true, confirmRoot: join(root, "wrong") }), /does not exactly match/u);
    assert.equal((await readFile(join(root, "daily-expired", "manifest.json"), "utf8")).length > 0, true);
    const applied = await runBackupRetention({ root, now: "2026-09-25T12:00:00Z", apply: true, confirmRoot: root });
    assert.deepEqual(applied.removedBackups, ["daily-expired", "month-end-expired"]);
    await assert.rejects(readFile(join(root, "daily-expired", "manifest.json")));
    await assert.rejects(readFile(join(root, "month-end-expired", "manifest.json")));
    assert.equal((await readFile(join(root, "daily-in-window", "manifest.json"), "utf8")).length > 0, true);
    assert.equal((await readFile(join(root, "unmanaged-directory", "keep.txt"), "utf8")), "never manage without a manifest");
    assert.equal((await readFile(join(root, "corrupt-but-old", "manifest.json"), "utf8")).length > 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("retention rejects invalid windows and refuses relative backup roots", async () => {
  assert.throws(() => selectExpiredBackups([], { now: "invalid" }), /options are invalid/u);
  assert.throws(() => selectExpiredBackups([], { dailyDays: 0 }), /options are invalid/u);
  await assert.rejects(runBackupRetention({ root: "relative/backups" }), /must be absolute/u);
});

test("retention refuses a group/world-writable backup root before scanning or deleting", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-backup-retention-root-mode-"));
  try {
    await mkdir(join(root, "unmanaged"));
    await writeFile(join(root, "unmanaged", "keep.txt"), "keep");
    const { chmod } = await import("node:fs/promises");
    await chmod(root, 0o777);
    await assert.rejects(runBackupRetention({ root, apply: true, confirmRoot: root }), /must not be group- or world-writable/u);
    assert.equal(await readFile(join(root, "unmanaged", "keep.txt"), "utf8"), "keep");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
