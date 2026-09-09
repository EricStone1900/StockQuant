import { spawnSync } from "node:child_process";

const scenarios = ["normal", "rejection", "recovery"];
for (const scenario of scenarios) {
  const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.1", "--scenario", scenario, "--seed", "20260907"], {
    stdio: "inherit",
    env: process.env
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
