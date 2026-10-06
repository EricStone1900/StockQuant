import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { isIsolatedPostgresTarget } from "./isolated-postgres-target.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const suffix = randomBytes(8).toString("hex");
const containerName = `sq-test-postgres-${suffix}`;
const image = process.env.STOCKQUANT_POSTGRES_IMAGE ?? "postgres:16.9-alpine";
const databaseName = "trade_execution_test";
const username = "trade_execution_test";
let containerStarted = false;
let suiteExitCode = 1;

function docker(args, { quiet = false } = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed (${result.status ?? "no exit status"}): ${quiet ? result.stderr?.trim() : "see Docker output above"}`);
  return result.stdout?.trim() ?? "";
}

function inspectTarget(databaseUrl) {
  return isIsolatedPostgresTarget(databaseUrl, containerName, (name) => {
    const result = spawnSync("docker", ["inspect", name], { encoding: "utf8", timeout: 5_000, maxBuffer: 1024 * 1024 });
    if (result.error || result.status !== 0) return null;
    try { return JSON.parse(result.stdout)[0] ?? null; } catch { return null; }
  });
}

try {
  const imageId = docker(["image", "inspect", image, "--format", "{{.Id}}"], { quiet: true });
  assert.match(imageId, /^sha256:[a-f0-9]{64}$/u, "PostgreSQL test image must resolve to a digest");
  docker(["run", "--detach", "--name", containerName, "--pull", "never", "--publish", "127.0.0.1::5432",
    "--read-only", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m", "--tmpfs", "/run/postgresql:rw,nosuid,nodev,size=16m", "--tmpfs", "/tmp:rw,nosuid,nodev,size=16m",
    "--security-opt", "no-new-privileges", "--pids-limit", "64", "--memory", "512m", "--cpus", "1",
    "--env", `POSTGRES_USER=${username}`, "--env", `POSTGRES_DB=${databaseName}`, "--env", "POSTGRES_HOST_AUTH_METHOD=trust", imageId], { quiet: true });
  containerStarted = true;
  const inspected = JSON.parse(docker(["inspect", containerName], { quiet: true }))[0];
  const containerImageId = inspected.Image;
  assert.equal(inspected.Config?.Image, imageId, "container must be started from the inspected immutable image digest");
  const binding = inspected.NetworkSettings?.Ports?.["5432/tcp"]?.[0];
  assert.ok(binding?.HostPort && binding.HostIp === "127.0.0.1", "temporary PostgreSQL must publish only on loopback");
  const databaseUrl = `postgresql://${username}@127.0.0.1:${binding.HostPort}/${databaseName}`;
  assert.equal(inspectTarget(databaseUrl), true, "database URL must resolve to the bounded disposable container");

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", username, "-d", databaseName], { encoding: "utf8", timeout: 5_000 });
    if (result.status === 0) { ready = true; break; }
    await delay(250);
  }
  assert.equal(ready, true, "isolated PostgreSQL did not become ready");

  const suite = spawnSync("pnpm", ["exec", "node", "services/trade-execution-service/scripts/test-persistence.mjs"], {
    cwd: repositoryRoot, env: { ...process.env, TRADE_EXECUTION_TEST_DATABASE_URL: databaseUrl }, stdio: "inherit", timeout: 120_000,
  });
  suiteExitCode = suite.status ?? 1;
  assert.equal(suiteExitCode, 0, "FakeBroker isolated PostgreSQL persistence test failed");
  console.log(JSON.stringify({ status: "PASS", databaseImageId: containerImageId, databaseBinding: "ephemeral loopback only", containerName, activeServices: "NOT_CONNECTED" }));
} finally {
  if (containerStarted) {
    const removed = spawnSync("docker", ["rm", "--force", containerName], { encoding: "utf8", timeout: 15_000 });
    if (removed.error || removed.status !== 0) suiteExitCode ||= removed.status ?? 1;
    const remaining = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", timeout: 5_000 });
    assert.notEqual(remaining.status, 0, `isolated PostgreSQL container remains: ${containerName}`);
  }
}
process.exitCode = suiteExitCode;
