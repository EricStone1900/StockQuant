import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile, lstat, access, symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runScheduledPairedBackup } from "./scheduled-paired-backup.mjs";

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "stockquant-scheduled-backup-"));
  const hooks = [];
  for (const name of ["quiesce", "resume"]) {
    const path = join(root, name);
    await writeFile(path, "#!/bin/sh\nexit 0\n");
    await chmod(path, 0o500);
    hooks.push(path);
  }
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    STOCKQUANT_BACKUP_DATABASE: "stockquant_research",
    STOCKQUANT_BACKUP_ARTIFACT_VOLUME: "stockquant_research_artifacts",
    STOCKQUANT_BACKUP_DIR: join(root, "backups"),
    STOCKQUANT_BACKUP_COMPOSE_FILE: join(root, "compose.yml"),
    STOCKQUANT_BACKUP_QUIESCE_HOOK: hooks[0],
    STOCKQUANT_BACKUP_RESUME_HOOK: hooks[1],
    STOCKQUANT_BACKUP_LOCK_PATH: join(root, "run", "backup.lock"),
  };
  await mkdir(env.STOCKQUANT_BACKUP_LOCK_PATH.slice(0, env.STOCKQUANT_BACKUP_LOCK_PATH.lastIndexOf("/")));
  return { root, hooks, env };
}

test("scheduled backup quiesces the exact pair, invokes the one-shot producer, resumes, and releases its lock", async () => {
  const fixture = await setup();
  try {
    const calls = [];
    const result = await runScheduledPairedBackup({ env: fixture.env, runCommand: async (command, args, env) => calls.push({ command, args, env }) });
    assert.equal(result.status, "PASS");
    assert.deepEqual(calls.map(({ command }) => command), [fixture.hooks[0], process.execPath, fixture.hooks[1]]);
    assert.deepEqual(calls[0].args, ["stockquant_research", "stockquant_research_artifacts"]);
    assert.equal(calls[0].env.STOCKQUANT_BACKUP_COMPOSE_FILE, fixture.env.STOCKQUANT_BACKUP_COMPOSE_FILE);
    assert.equal(calls[1].args.at(-1), "--confirm-writes-quiesced=stockquant_research/stockquant_research_artifacts");
    assert.equal(calls[1].env.STOCKQUANT_BACKUP_DIR, fixture.env.STOCKQUANT_BACKUP_DIR);
    assert.equal(calls[2].env.STOCKQUANT_BACKUP_QUIESCE_RESULT, "PASS");
    await assert.rejects(lstat(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH), { code: "ENOENT" });
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("a group/world-writable lock directory is rejected before any writer or capture hook runs", async () => {
  const fixture = await setup();
  try {
    const directory = fixture.env.STOCKQUANT_BACKUP_LOCK_PATH.slice(0, fixture.env.STOCKQUANT_BACKUP_LOCK_PATH.lastIndexOf("/"));
    await chmod(directory, 0o777);
    let calls = 0;
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async () => { calls += 1; } }), /must not be group- or world-writable/u);
    assert.equal(calls, 0);
    await assert.rejects(lstat(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH), { code: "ENOENT" });
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("failed quiescence skips capture, still attempts resume, and removes only its own lock", async () => {
  const fixture = await setup();
  try {
    const calls = [];
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async (command, args, env) => {
      calls.push({ command, args, env });
      if (command === fixture.hooks[0]) throw new Error("writer still active");
    } }), /writer still active/u);
    assert.deepEqual(calls.map(({ command }) => command), [fixture.hooks[0], fixture.hooks[1]]);
    assert.equal(calls[1].env.STOCKQUANT_BACKUP_QUIESCE_RESULT, "FAILED");
    await assert.rejects(lstat(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH), { code: "ENOENT" });
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("resume failure is surfaced after capture and never reports a successful schedule", async () => {
  const fixture = await setup();
  try {
    let captureCalled = false;
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async (command) => {
      if (command === process.execPath) captureCalled = true;
      if (command === fixture.hooks[1]) throw new Error("resume failed");
    } }), /writer resume hook failed/u);
    assert.equal(captureCalled, true);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("an existing lock prevents hooks or capture from running", async () => {
  const fixture = await setup();
  try {
    await writeFile(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH, "stale or active\n", { flag: "wx" });
    let calls = 0;
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async () => { calls += 1; } }), /active or a previous run left a stale lock/u);
    assert.equal(calls, 0);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("scheduled backup requires absolute roots and non-symlink executable hooks", async () => {
  const fixture = await setup();
  try {
    await assert.rejects(runScheduledPairedBackup({ env: { ...fixture.env, STOCKQUANT_BACKUP_DIR: "relative" }, runCommand: async () => {} }), /must be an absolute path/u);
    await rm(fixture.hooks[1]);
    await symlink(fixture.hooks[0], fixture.hooks[1]);
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async () => {} }), /must name an existing executable, non-writable regular file/u);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("a writable hook is rejected before the backup lock or any command is created", async () => {
  const fixture = await setup();
  try {
    await chmod(fixture.hooks[0], 0o700);
    let calls = 0;
    await assert.rejects(runScheduledPairedBackup({ env: fixture.env, runCommand: async () => { calls += 1; } }), /executable, non-writable regular file/u);
    assert.equal(calls, 0);
    await assert.rejects(lstat(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH), { code: "ENOENT" });
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("SIGTERM during writer quiescence runs resume and exits as interrupted without starting capture", async () => {
  const fixture = await setup();
  const started = join(fixture.root, "quiesce-started");
  const resumed = join(fixture.root, "resumed");
  try {
    await chmod(fixture.hooks[0], 0o700);
    await chmod(fixture.hooks[1], 0o700);
    await writeFile(fixture.hooks[0], `#!/usr/bin/env node\nimport { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(started)}, "started");\nawait new Promise((resolve) => setTimeout(resolve, 30000));\n`);
    await chmod(fixture.hooks[0], 0o500);
    await writeFile(fixture.hooks[1], `#!/usr/bin/env node\nimport { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(resumed)}, process.env.STOCKQUANT_BACKUP_QUIESCE_RESULT ?? "missing");\n`);
    await chmod(fixture.hooks[1], 0o500);
    const child = spawn(process.execPath, [fileURLToPath(new URL("./scheduled-paired-backup.mjs", import.meta.url))], { cwd: process.cwd(), env: fixture.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    try {
      let observed = false;
      for (let attempt = 0; attempt < 300; attempt += 1) {
        try { await access(started); observed = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
      }
      assert.equal(observed, true, `quiesce hook did not start (exit=${child.exitCode}, signal=${child.signalCode}, output=${output})`);
      child.kill("SIGTERM");
      const [code, signal] = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("scheduled backup did not exit after SIGTERM")), 5000);
        child.once("close", (exitCode, exitSignal) => { clearTimeout(timeout); resolve([exitCode, exitSignal]); });
      });
      assert.equal(signal, null);
      assert.equal(code, 143);
      assert.equal(await (await import("node:fs/promises")).readFile(resumed, "utf8"), "FAILED");
      await assert.rejects(lstat(fixture.env.STOCKQUANT_BACKUP_LOCK_PATH), { code: "ENOENT" });
    } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
