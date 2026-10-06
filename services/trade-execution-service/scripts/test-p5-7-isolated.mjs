import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const suffix = randomBytes(8).toString("hex");
const containerName = `sq-test-postgres-${suffix}`;
const networkName = `sq-p57-net-${suffix}`;
const image = process.env.STOCKQUANT_POSTGRES_IMAGE ?? "postgres:16.9-alpine";
let networkCreated = false;
let containerStarted = false;
let suiteExitCode = 1;
let runEvidence;
const cleanupFailures = [];

function run(command, args, { quiet = false, env = process.env, timeout = 30_000 } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout, maxBuffer: 1024 * 1024, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed (${result.status ?? "no exit status"}): ${quiet ? result.stderr?.trim() : "see command output above"}`);
  return result.stdout?.trim() ?? "";
}

function inspect(name) { return JSON.parse(run("docker", ["inspect", name], { quiet: true }))[0]; }

try {
  const imageId = run("docker", ["image", "inspect", image, "--format", "{{.Id}}"], { quiet: true });
  assert.match(imageId, /^sha256:[a-f0-9]{64}$/u, "PostgreSQL image must resolve to an immutable digest");
  run("docker", ["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.enable_ip_masquerade=false", networkName], { quiet: true });
  networkCreated = true;
  const network = JSON.parse(run("docker", ["network", "inspect", networkName], { quiet: true }))[0];
  assert.equal(network.Name, networkName);
  assert.equal(network.Internal, false, "published localhost port must use a regular bridge");
  assert.equal(network.Options?.["com.docker.network.bridge.enable_ip_masquerade"], "false");

  run("docker", ["run", "--detach", "--name", containerName, "--pull", "never", "--network", networkName, "--publish", "127.0.0.1::5432",
    "--read-only", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=512m", "--tmpfs", "/run/postgresql:rw,nosuid,nodev,size=16m", "--tmpfs", "/tmp:rw,nosuid,nodev,size=16m",
    "--security-opt", "no-new-privileges", "--pids-limit", "96", "--memory", "768m", "--cpus", "1",
    "--env", "POSTGRES_USER=postgres", "--env", "POSTGRES_DB=postgres", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", imageId], { quiet: true });
  containerStarted = true;
  const container = inspect(containerName);
  assert.equal(container.Config.Image, imageId);
  assert.equal(container.Image, imageId);
  assert.equal(container.HostConfig.NetworkMode, networkName);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks ?? {}), [networkName], "database container must join only its generated test network");
  assert.equal(container.Config.Labels?.["com.docker.compose.project"], undefined, "database container must not belong to a Compose project");
  const binding = container.NetworkSettings.Ports["5432/tcp"]?.[0];
  assert.ok(binding?.HostPort && binding.HostIp === "127.0.0.1", "test PostgreSQL must bind to a random loopback-only port");
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert.ok(container.HostConfig.Tmpfs?.["/var/lib/postgresql/data"]);
  assert.ok(container.HostConfig.Memory > 0 && container.HostConfig.PidsLimit > 0);

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    // The official image runs a temporary socket-only postmaster during init.
    // Probe TCP so readiness can only be satisfied by the final long-running
    // server, not the temporary process that is about to shut down.
    const result = spawnSync("docker", ["exec", containerName, "psql", "-h", "127.0.0.1", "-p", "5432", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-Atqc", "SELECT 1"], { encoding: "utf8", timeout: 5_000 });
    if (result.status === 0) { ready = true; break; }
    await delay(250);
  }
  assert.equal(ready, true, "disposable PostgreSQL did not become ready");
  for (const [role, database] of [["trade_execution_test", "trade_execution_test"], ["portfolio_risk", "portfolio_risk_test"]]) {
    run("docker", ["exec", containerName, "psql", "-h", "127.0.0.1", "-p", "5432", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", `CREATE ROLE ${role} LOGIN`], { quiet: true });
    run("docker", ["exec", containerName, "psql", "-h", "127.0.0.1", "-p", "5432", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", `CREATE DATABASE ${database} OWNER ${role}`], { quiet: true });
  }

  const host = `127.0.0.1:${binding.HostPort}`;
  const smokeEnv = {
    ...process.env,
    STOCKQUANT_P57_ISOLATED_PG_CONTAINER: containerName,
    TRADE_EXECUTION_TEST_DATABASE_URL: `postgresql://trade_execution_test@${host}/trade_execution_test`,
    PORTFOLIO_RISK_TEST_DATABASE_URL: `postgresql://portfolio_risk@${host}/portfolio_risk_test`,
  };
  const suite = spawnSync("pnpm", ["exec", "node", "scripts/p5-7-outbox-http-smoke.mjs"], {
    cwd: process.cwd(), env: smokeEnv, stdio: "inherit", timeout: 180_000,
  });
  suiteExitCode = suite.status ?? 1;
  assert.equal(suiteExitCode, 0, "isolated Trade → Portfolio HTTP/PG recovery smoke failed");
  runEvidence = { databaseImageId: container.Image, databaseBinding: "random loopback port", network: "isolated bridge/no masquerade", containerName, activeServices: "NOT_CONNECTED" };
} finally {
  if (containerStarted) {
    const removed = spawnSync("docker", ["rm", "--force", containerName], { encoding: "utf8", timeout: 15_000 });
    if (removed.error || removed.status !== 0) cleanupFailures.push(`container removal failed: ${removed.stderr?.trim() ?? removed.error?.message ?? removed.status}`);
    const remaining = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", timeout: 5_000 });
    if (!remaining.error && remaining.status === 0) cleanupFailures.push(`disposable PostgreSQL container remains: ${containerName}`);
  }
  if (networkCreated) {
    const removed = spawnSync("docker", ["network", "rm", networkName], { encoding: "utf8", timeout: 15_000 });
    if (removed.error || removed.status !== 0) cleanupFailures.push(`network removal failed: ${removed.stderr?.trim() ?? removed.error?.message ?? removed.status}`);
    const remaining = spawnSync("docker", ["network", "inspect", networkName], { encoding: "utf8", timeout: 5_000 });
    if (!remaining.error && remaining.status === 0) cleanupFailures.push(`isolated Docker network remains: ${networkName}`);
  }
}
if (cleanupFailures.length) { suiteExitCode = 1; console.error(JSON.stringify({ status: "CLEANUP_FAILED", containerName, networkName, cleanupFailures })); }
if (suiteExitCode === 0) console.log(JSON.stringify({ status: "PASS", ...runEvidence, cleanup: "container/network removed and verified" }));
process.exitCode = suiteExitCode;
