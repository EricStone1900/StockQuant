import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { postgresSecretProblems, privateFileMode } from "./postgres-secret-preflight.mjs";

const args = process.argv.slice(2);
const stage = args[args.indexOf("--stage") + 1];
const implementedStages = ['V1.1', 'V1.2', 'V1.3', 'V1.4', 'V1.5', 'V2.1', 'V2.2', 'V2.3', 'V2.4', 'V2.5', 'V3.1'];
if (!implementedStages.includes(stage)) {
  console.error("usage: pnpm stack:up -- --stage V1.1|V1.2|V1.3|V1.4|V1.5|V2.1|V2.2|V2.3|V2.4|V2.5|V3.1");
  process.exit(2);
}

let localEnv;
try {
  localEnv = readFileSync(".env.local", "utf8");
} catch {
  console.error("PostgreSQL credentials are required in ignored .env.local; see .env.example and generate independent values with openssl rand -hex 32.");
  process.exit(2);
}
const insecureMode = !privateFileMode(statSync(".env.local").mode);
const secretProblems = postgresSecretProblems(localEnv);
if (insecureMode || secretProblems.length > 0) {
  if (insecureMode) console.error(".env.local permissions are too broad; run chmod 600 .env.local.");
  if (secretProblems.length > 0) console.error(`Missing or invalid independent PostgreSQL credentials: ${secretProblems.join(", ")}. Use distinct 64-character lowercase hex values; secret values are not displayed.`);
  process.exit(2);
}

const services = stage === 'V1.1'
  ? ["postgres", "portfolio-risk-service", "platform-api-service"]
  : ["postgres", "portfolio-risk-service", "platform-api-service", "market-data-service", "qlib-worker", "quant-research-service", ...(stage === "V3.1" ? ["research-automation-service"] : [])];
const profileArgs = stage.startsWith("V2.") || stage === "V3.1" ? ["--profile", "web"] : [];
const result = spawnSync("docker", ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", ...profileArgs, "up", "--build", "-d", ...services, ...(stage.startsWith("V2.") || stage === "V3.1" ? ["web"] : [])], { stdio: "inherit" });
process.exit(result.status ?? 1);
