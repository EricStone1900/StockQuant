import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
const separator = args.indexOf("--");
if (separator < 0 || separator === args.length - 1) {
  console.error("usage: node scripts/run-isolated-postgres-command.mjs [--url-env NAME:ROLE:DATABASE]... [--admin-env NAME] -- COMMAND [ARGS...]");
  process.exit(2);
}
const setupArgs = args.slice(0, separator);
const command = args[separator + 1];
const commandArgs = args.slice(separator + 2);
const urls = [];
let adminEnv;
for (let index = 0; index < setupArgs.length; index += 1) {
  const value = setupArgs[index + 1];
  if (setupArgs[index] === "--url-env" && value) {
    const [name, role, database, ...extra] = value.split(":");
    if (extra.length || !/^[A-Z][A-Z0-9_]*$/u.test(name ?? "") || !/^[a-z_][a-z0-9_]*$/u.test(role ?? "") || !/^[a-z_][a-z0-9_]*$/u.test(database ?? "")) throw new Error(`invalid isolated PostgreSQL URL mapping: ${value}`);
    urls.push({ name, role, database });
    index += 1;
  } else if (setupArgs[index] === "--admin-env" && value) {
    if (!/^[A-Z][A-Z0-9_]*$/u.test(value) || adminEnv) throw new Error(`invalid/duplicate isolated PostgreSQL admin mapping: ${value}`);
    adminEnv = value;
    index += 1;
  } else throw new Error(`unknown isolated PostgreSQL option: ${setupArgs[index]}`);
}
if (urls.length === 0 && !adminEnv) throw new Error("at least one isolated PostgreSQL URL or admin mapping is required");

const suffix = randomBytes(8).toString("hex");
const containerName = `sq-test-postgres-${suffix}`;
const networkName = `sq-test-net-${suffix}`;
const image = process.env.STOCKQUANT_POSTGRES_IMAGE ?? "postgres:16.9-alpine";
let containerStarted = false;
let networkCreated = false;
let exitCode = 1;
let evidence;
const cleanupFailures = [];
const uniqueRoles = [...new Set(urls.map(({ role }) => role))];
const uniqueDatabases = [...new Map(urls.map(({ role, database }) => [database, { role, database }])).values()];

function run(program, programArgs, { quiet = false, env = process.env, timeout = 30_000 } = {}) {
  const result = spawnSync(program, programArgs, { encoding: "utf8", timeout, maxBuffer: 1024 * 1024, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${programArgs[0]} failed (${result.status ?? "no exit status"}): ${quiet ? result.stderr?.trim() : "see command output above"}`);
  return result.stdout?.trim() ?? "";
}

function inspect(name) { return JSON.parse(run("docker", ["inspect", name], { quiet: true }))[0]; }

try {
  const imageId = run("docker", ["image", "inspect", image, "--format", "{{.Id}}"], { quiet: true });
  assert.match(imageId, /^sha256:[a-f0-9]{64}$/u);
  run("docker", ["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.enable_ip_masquerade=false", networkName], { quiet: true });
  networkCreated = true;
  const network = JSON.parse(run("docker", ["network", "inspect", networkName], { quiet: true }))[0];
  assert.equal(network.Name, networkName);
  assert.equal(network.Options?.["com.docker.network.bridge.enable_ip_masquerade"], "false");
  run("docker", ["run", "--detach", "--name", containerName, "--pull", "never", "--network", networkName, "--publish", "127.0.0.1::5432",
    "--read-only", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=512m", "--tmpfs", "/run/postgresql:rw,nosuid,nodev,size=16m", "--tmpfs", "/tmp:rw,nosuid,nodev,size=16m",
    "--security-opt", "no-new-privileges", "--pids-limit", "96", "--memory", "768m", "--cpus", "1",
    "--env", "POSTGRES_USER=postgres", "--env", "POSTGRES_DB=postgres", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", imageId], { quiet: true });
  containerStarted = true;
  const container = inspect(containerName);
  assert.equal(container.Config?.Image, imageId);
  assert.equal(container.Image, imageId);
  assert.equal(container.HostConfig?.NetworkMode, networkName);
  assert.deepEqual(Object.keys(container.NetworkSettings?.Networks ?? {}), [networkName]);
  assert.equal(container.Config?.Labels?.["com.docker.compose.project"], undefined);
  assert.equal(container.HostConfig?.ReadonlyRootfs, true);
  assert.ok(container.HostConfig?.Tmpfs?.["/var/lib/postgresql/data"]);
  assert.ok(container.HostConfig?.Memory > 0 && container.HostConfig?.PidsLimit > 0);
  const binding = container.NetworkSettings?.Ports?.["5432/tcp"]?.[0];
  assert.ok(binding?.HostPort && binding.HostIp === "127.0.0.1");
  let ready = false;
  let consecutiveReadyProbes = 0;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = spawnSync("docker", ["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-Atc", "SELECT 1"], { encoding: "utf8", timeout: 5_000 });
    // The official image briefly starts a temporary server during first-run
    // initialization. Require sustained SQL readiness so this probe cannot
    // mistake that short-lived server for the final instance.
    consecutiveReadyProbes = result.status === 0 ? consecutiveReadyProbes + 1 : 0;
    if (consecutiveReadyProbes >= 3) { ready = true; break; }
    await delay(250);
  }
  assert.equal(ready, true, "disposable PostgreSQL did not become ready");
  for (const role of uniqueRoles) run("docker", ["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", `CREATE ROLE ${role} LOGIN`], { quiet: true });
  for (const { role, database } of uniqueDatabases) run("docker", ["exec", containerName, "createdb", "-U", "postgres", "-O", role, database], { quiet: true });
  const port = binding.HostPort;
  const childEnv = { ...process.env, STOCKQUANT_ISOLATED_PG_CONTAINER: containerName };
  for (const { name, role, database } of urls) childEnv[name] = `postgresql://${role}@127.0.0.1:${port}/${database}`;
  if (adminEnv) childEnv[adminEnv] = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  const child = spawnSync(command, commandArgs, { cwd: process.cwd(), env: childEnv, stdio: "inherit", timeout: 240_000, maxBuffer: 1024 * 1024 });
  exitCode = child.status ?? 1;
  assert.equal(exitCode, 0, "command failed against the disposable PostgreSQL instance");
  evidence = { imageId: container.Image, hostBinding: `127.0.0.1:${port}`, network: networkName, containerName, databaseNames: [...new Set([...urls.map((item) => item.database), ...(adminEnv ? ["postgres"] : [])])] };
} finally {
  if (containerStarted) {
    const result = spawnSync("docker", ["rm", "--force", containerName], { encoding: "utf8", timeout: 15_000 });
    if (result.error || result.status !== 0) cleanupFailures.push(`container removal failed: ${result.stderr?.trim() ?? result.error?.message ?? result.status}`);
    const remaining = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", timeout: 5_000 });
    if (!remaining.error && remaining.status === 0) cleanupFailures.push(`container remains: ${containerName}`);
  }
  if (networkCreated) {
    const result = spawnSync("docker", ["network", "rm", networkName], { encoding: "utf8", timeout: 15_000 });
    if (result.error || result.status !== 0) cleanupFailures.push(`network removal failed: ${result.stderr?.trim() ?? result.error?.message ?? result.status}`);
    const remaining = spawnSync("docker", ["network", "inspect", networkName], { encoding: "utf8", timeout: 5_000 });
    if (!remaining.error && remaining.status === 0) cleanupFailures.push(`network remains: ${networkName}`);
  }
}
if (cleanupFailures.length) { exitCode = 1; console.error(JSON.stringify({ status: "CLEANUP_FAILED", cleanupFailures, containerName, networkName })); }
if (exitCode === 0) console.log(JSON.stringify({ status: "PASS", activeServices: "NOT_CONNECTED", cleanup: "container and network removed and verified", ...evidence }));
process.exitCode = exitCode;
