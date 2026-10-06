import { spawn } from "node:child_process";
import { open, lstat, rm } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const producer = resolve(repositoryRoot, "scripts/create-cluster-paired-backup.mjs");
let activeChild = null;
let abortRequested = false;

function requiredAbsolutePath(name, value) {
  if (!value || !isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
  return resolve(value);
}

async function executableHook(name, value) {
  const path = requiredAbsolutePath(name, value);
  let info;
  try { info = await lstat(path); }
  catch { throw new Error(`${name} must name an existing executable regular file`); }
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o111) === 0 || (info.mode & 0o222) !== 0) throw new Error(`${name} must name an existing executable, non-writable regular file`);
  if (process.platform === "linux" && info.uid !== 0) throw new Error(`${name} must be owned by root on Linux`);
  return path;
}

function runExecutable(executable, args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, { cwd: repositoryRoot, env, stdio: "inherit", shell: false });
    activeChild = child;
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      if (activeChild === child) activeChild = null;
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${executable} failed (exit=${code ?? "none"}, signal=${signal ?? "none"})`));
    });
  });
}

export async function runScheduledPairedBackup({ env = process.env, runCommand = runExecutable } = {}) {
  const artifactVolume = env.STOCKQUANT_BACKUP_ARTIFACT_VOLUME;
  if (!artifactVolume || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(artifactVolume)) throw new Error("STOCKQUANT_BACKUP_ARTIFACT_VOLUME must be an exact volume identifier");
  const backupRoot = requiredAbsolutePath("STOCKQUANT_BACKUP_DIR", env.STOCKQUANT_BACKUP_DIR);
  const composeFile = requiredAbsolutePath("STOCKQUANT_BACKUP_COMPOSE_FILE", env.STOCKQUANT_BACKUP_COMPOSE_FILE);
  const quiesceHook = await executableHook("STOCKQUANT_BACKUP_QUIESCE_HOOK", env.STOCKQUANT_BACKUP_QUIESCE_HOOK);
  const resumeHook = await executableHook("STOCKQUANT_BACKUP_RESUME_HOOK", env.STOCKQUANT_BACKUP_RESUME_HOOK);
  const lockPath = requiredAbsolutePath("STOCKQUANT_BACKUP_LOCK_PATH", env.STOCKQUANT_BACKUP_LOCK_PATH);
  const lockDirectory = dirname(lockPath);
  const directoryInfo = await lstat(lockDirectory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) throw new Error("backup lock directory must be an existing real directory");
  if ((directoryInfo.mode & 0o022) !== 0) throw new Error("backup lock directory must not be group- or world-writable");

  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("another paired backup is active or a previous run left a stale lock; inspect before removing it");
    throw error;
  }
  const lockInfo = await lock.stat();
  let quiesceAttempted = false;
  let result;
  let failure;
  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, scope: "cluster", artifactVolume, startedAt: new Date().toISOString() })}\n`);
    const hookEnv = { PATH: env.PATH ?? "/usr/bin:/bin", HOME: env.HOME ?? "/var/lib/stockquant-backup", STOCKQUANT_BACKUP_SCOPE: "cluster", STOCKQUANT_BACKUP_ARTIFACT_VOLUME: artifactVolume, STOCKQUANT_BACKUP_COMPOSE_FILE: composeFile };
    quiesceAttempted = true;
    await runCommand(quiesceHook, ["cluster", artifactVolume], hookEnv);
    if (abortRequested) throw new Error("backup interrupted after quiescence; capture not started");
    const producerEnv = {
      PATH: env.PATH ?? "/usr/bin:/bin",
      HOME: env.HOME ?? "/var/lib/stockquant-backup",
      ...(env.DOCKER_CONFIG ? { DOCKER_CONFIG: env.DOCKER_CONFIG } : {}),
      STOCKQUANT_BACKUP_DIR: backupRoot,
      STOCKQUANT_BACKUP_ARTIFACT_VOLUME: artifactVolume,
      STOCKQUANT_BACKUP_COMPOSE_FILE: composeFile,
      ...(env.STOCKQUANT_BACKUP_HELPER_IMAGE ? { STOCKQUANT_BACKUP_HELPER_IMAGE: env.STOCKQUANT_BACKUP_HELPER_IMAGE } : {}),
      ...(env.STOCKQUANT_BACKUP_TIMEOUT_MS ? { STOCKQUANT_BACKUP_TIMEOUT_MS: env.STOCKQUANT_BACKUP_TIMEOUT_MS } : {}),
    };
    await runCommand(process.execPath, [producer, `--confirm-writes-quiesced=cluster/${artifactVolume}`], producerEnv);
    result = { status: "PASS", scope: "cluster", artifactVolume, backupRoot };
  } catch (error) {
    failure = error;
  } finally {
    if (quiesceAttempted) {
      try {
        await runCommand(resumeHook, ["cluster", artifactVolume], {
          PATH: env.PATH ?? "/usr/bin:/bin",
          HOME: env.HOME ?? "/var/lib/stockquant-backup",
          STOCKQUANT_BACKUP_SCOPE: "cluster",
          STOCKQUANT_BACKUP_ARTIFACT_VOLUME: artifactVolume,
          STOCKQUANT_BACKUP_COMPOSE_FILE: composeFile,
          STOCKQUANT_BACKUP_QUIESCE_RESULT: failure ? "FAILED" : "PASS",
        });
      } catch (error) {
        failure = failure ? new AggregateError([failure, error], "backup operation and writer resume hook both failed") : new Error(`backup completed but writer resume hook failed: ${String(error)}`);
      }
    }
    await lock.close();
    const currentLock = await lstat(lockPath).catch(() => null);
    if (currentLock && currentLock.dev === lockInfo.dev && currentLock.ino === lockInfo.ino) await rm(lockPath, { force: false });
  }
  if (failure) throw failure;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let terminationSignal = null;
  const terminate = (signal) => {
    terminationSignal ??= signal;
    abortRequested = true;
    activeChild?.kill("SIGTERM");
  };
  const onSigterm = () => terminate("SIGTERM");
  const onSigint = () => terminate("SIGINT");
  process.on("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  try {
    process.stdout.write(`${JSON.stringify(await runScheduledPairedBackup())}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "scheduled paired backup failed"}\n`);
    process.exitCode = terminationSignal ? (terminationSignal === "SIGTERM" ? 143 : 130) : 1;
  } finally {
    process.off("SIGTERM", onSigterm);
    process.off("SIGINT", onSigint);
  }
}
