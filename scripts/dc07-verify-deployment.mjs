import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];
const outputDir = resolve(process.env.DC07_OUTPUT_DIR ?? "/tmp/stockquant-dc07");
const marketUrl = process.env.DC07_MARKET_URL ?? "http://127.0.0.1:3002";
const platformUrl = process.env.DC07_PLATFORM_URL ?? "http://127.0.0.1:3000";

function run(args, options = {}) {
  const result = spawnSync("docker", [...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
  if (result.status !== 0) throw new Error(`command failed (${result.status}): docker ${args.join(" ")}\n${result.stderr ?? ""}`);
  return result.stdout ?? Buffer.alloc(0);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

await mkdir(outputDir, { recursive: true });
run([...compose, "config", "--quiet"]);
const ps = run([...compose, "ps", "--format", "json"]).trim().split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
const healthy = new Map(ps.map((item) => [item.Service, item.Health || item.Status]));
for (const service of ["postgres", "market-data-service", "platform-api-service"]) {
  if (!String(healthy.get(service)).includes("healthy")) throw new Error(`${service} is not healthy: ${healthy.get(service)}`);
}
const before = await getJson(`${marketUrl}/ready`);
if (before.status !== 200 || before.body.collectionPersistence !== "POSTGRES") throw new Error(`market-data before restart failed: ${JSON.stringify(before)}`);
const platform = await getJson(`${platformUrl}/live`);
if (platform.status !== 200 || platform.body.status !== "live") throw new Error(`platform live failed: ${JSON.stringify(platform)}`);

const restartStarted = Date.now();
run([...compose, "restart", "market-data-service"]);
let after;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try { after = await getJson(`${marketUrl}/ready`); if (after.status === 200) break; } catch {}
  await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
}
if (!after || after.status !== 200 || after.body.collectionPersistence !== "POSTGRES") throw new Error(`market-data restart recovery failed: ${JSON.stringify(after)}`);

const backup = run([...compose, "exec", "-T", "postgres", "pg_dump", "-U", "market_data", "-Fc", "market_data"], { encoding: null });
const backupPath = resolve(outputDir, "market_data.dump");
await writeFile(backupPath, backup);
const sha256 = createHash("sha256").update(backup).digest("hex");
const restoreDb = `dc07_restore_${Date.now()}`;
run([...compose, "exec", "-T", "postgres", "createdb", "-U", "postgres", restoreDb]);
try {
  const restore = spawnSync("docker", [...compose, "exec", "-T", "postgres", "pg_restore", "-U", "postgres", "-d", restoreDb, "--no-owner"], { input: backup });
  if (restore.status !== 0) throw new Error(`isolated restore failed: ${restore.stderr ?? ""}`);
  const tableCount = run([...compose, "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", restoreDb, "-tAc", "SELECT count(*) FROM pg_tables WHERE schemaname='public'"]).trim();
  if (Number(tableCount) < 1) throw new Error(`isolated restore has no public tables: ${tableCount}`);
  const report = { stageId: "DC-07", status: "PASS", architecture: process.arch, composeServices: Object.fromEntries(healthy), health: { before, after, platform }, restartRecoverySeconds: Number(((Date.now() - restartStarted) / 1000).toFixed(3)), backup: { path: backupPath, bytes: backup.length, sha256, restoredDatabase: restoreDb, restoredPublicTables: Number(tableCount) } };
  await writeFile(resolve(outputDir, "dc07-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  run([...compose, "exec", "-T", "postgres", "dropdb", "-U", "postgres", "--if-exists", restoreDb]);
}
