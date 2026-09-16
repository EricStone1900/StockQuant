import { spawnSync } from "node:child_process";

const result = spawnSync("docker", ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "down"], { stdio: "inherit" });
process.exit(result.status ?? 1);
