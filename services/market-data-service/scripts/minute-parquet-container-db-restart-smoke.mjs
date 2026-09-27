import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const suffix = randomBytes(6).toString("hex");
const databaseContainer = `sq-md-parquet-pg-restart-${suffix}`;
const image = process.env.STOCKQUANT_PARQUET_DB_RESTART_IMAGE ?? "postgres:16.9-alpine";
let containerCreated = false;

function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `docker ${args[0]} failed: ${(result.stderr ?? "").slice(0, 2000)}`);
  return result.stdout?.trim() ?? "";
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

try {
  const imageId = docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  assert.match(imageId, /^sha256:[a-f0-9]{64}$/u, "PostgreSQL test image must already exist locally");
  const port = await freePort();
  docker(["run", "--detach", "--pull", "never", "--name", databaseContainer, "--platform", "linux/arm64", "--publish", `127.0.0.1:${port}:5432`, "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--health-cmd", "pg_isready -U postgres", "--health-interval", "1s", "--health-timeout", "3s", "--health-retries", "60", image]);
  containerCreated = true;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const health = docker(["inspect", databaseContainer, "--format", "{{.State.Health.Status}}"]);
    if (health === "healthy") break;
    await delay(250);
  }
  const health = docker(["inspect", databaseContainer, "--format", "{{.State.Health.Status}}"]);
  assert.equal(health, "healthy", "isolated PostgreSQL must become healthy");
  const published = docker(["port", databaseContainer, "5432/tcp"]);
  assert.equal(published, `127.0.0.1:${port}`, "PostgreSQL must stay bound to a stable loopback-only port across container restarts");
  const smoke = spawnSync(process.execPath, ["scripts/minute-parquet-upload-restart-smoke.mjs"], {
    cwd: resolve(root, "services/market-data-service"),
    encoding: "utf8",
    timeout: 600_000,
    maxBuffer: 2 * 1024 * 1024,
    env: {
      ...process.env,
      STOCKQUANT_PARQUET_UPLOAD_ADMIN_DATABASE_URL: `postgresql://postgres@127.0.0.1:${port}/postgres`,
      STOCKQUANT_PARQUET_UPLOAD_RESTART_POSTGRES_CONTAINER: databaseContainer,
    },
  });
  assert.equal(smoke.status, 0, smoke.stderr || "PostgreSQL restart smoke failed");
  const report = JSON.parse(smoke.stdout);
  assert.equal(report.status, "PASS");
  assert.equal(report.databaseRestartPreservedChunk, true);
  const imageAfter = docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  assert.equal(imageAfter, imageId, "test must leave the pinned local PostgreSQL image unchanged");
  console.log(JSON.stringify({ status: "PASS", databaseContainer, postgresImage: imageId, boundAddress: `127.0.0.1:${port}`, report }, null, 2));
} finally {
  if (containerCreated) {
    try { docker(["rm", "--force", databaseContainer]); }
    catch { throw new Error(`could not remove exact isolated PostgreSQL container ${databaseContainer}`); }
    assert.equal(docker(["ps", "-a", "--filter", `name=^/${databaseContainer}$`, "--format", "{{.Names}}"]), "", "isolated PostgreSQL container must be removed");
  }
}
