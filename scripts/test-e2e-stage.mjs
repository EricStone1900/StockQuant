import { spawnSync } from "node:child_process";
import { e2eStageCommand } from "./e2e-stage-command.mjs";

const args = process.argv.slice(2);
const stage = args.includes("--stage") ? args[args.indexOf("--stage") + 1] : undefined;
const implementedStages = ["V1.1", "V1.2", "V1.3", "V1.4", "V1.5", "V2.1", "V2.2", "V2.3", "V2.4", "V2.5", "V3.1", "V3.2", "V3.3"];

if (stage && !implementedStages.includes(stage)) {
  console.error(`no Web E2E is implemented for ${stage}`);
  process.exit(2);
}

const env = { ...process.env };
const result = spawnSync("pnpm", e2eStageCommand(stage), { stdio: "inherit", env });
process.exit(result.status ?? 1);
