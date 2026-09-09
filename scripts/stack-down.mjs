import { spawnSync } from "node:child_process";

const result = spawnSync("docker", ["compose", "-f", "infra/compose/docker-compose.yml", "down"], { stdio: "inherit" });
process.exit(result.status ?? 1);
