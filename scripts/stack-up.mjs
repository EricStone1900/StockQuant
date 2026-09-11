import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const stage = args[args.indexOf("--stage") + 1];
const implementedStages = ['V1.1', 'V1.2', 'V1.3', 'V1.4', 'V1.5', 'V2.1', 'V2.2', 'V2.3', 'V2.4'];
if (!implementedStages.includes(stage)) {
  console.error("usage: pnpm stack:up -- --stage V1.1|V1.2|V1.3|V1.4|V1.5|V2.1|V2.2|V2.3|V2.4");
  process.exit(2);
}

const services = stage === 'V1.1'
  ? ["postgres", "portfolio-risk-service", "platform-api-service"]
  : ["postgres", "portfolio-risk-service", "platform-api-service", "market-data-service", "qlib-worker", "quant-research-service"];
const profileArgs = stage.startsWith("V2.") ? ["--profile", "web"] : [];
const result = spawnSync("docker", ["compose", "-f", "infra/compose/docker-compose.yml", ...profileArgs, "up", "--build", "-d", ...services, ...(stage.startsWith("V2.") ? ["web"] : [])], { stdio: "inherit" });
process.exit(result.status ?? 1);
