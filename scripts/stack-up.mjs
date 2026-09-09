import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const stage = args[args.indexOf("--stage") + 1];
if (stage !== "V1.1") {
  console.error("usage: pnpm stack:up -- --stage V1.1");
  process.exit(2);
}

const result = spawnSync("docker", ["compose", "-f", "infra/compose/docker-compose.yml", "up", "--build", "-d", "postgres", "portfolio-risk-service", "platform-api-service"], { stdio: "inherit" });
process.exit(result.status ?? 1);
