import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const stage = args[args.indexOf("--stage") + 1];
if (!['V1.1','V1.2','V1.3'].includes(stage)) {
  console.error("usage: pnpm stack:up -- --stage V1.1|V1.2|V1.3");
  process.exit(2);
}

const services = stage === 'V1.1' ? ["postgres", "portfolio-risk-service", "platform-api-service"] : ["postgres", "portfolio-risk-service", "platform-api-service", "market-data-service", "qlib-worker", "quant-research-service"];
const result = spawnSync("docker", ["compose", "-f", "infra/compose/docker-compose.yml", "up", "--build", "-d", ...services], { stdio: "inherit" });
process.exit(result.status ?? 1);
