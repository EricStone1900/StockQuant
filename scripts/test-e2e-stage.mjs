import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const stage = args.includes("--stage") ? args[args.indexOf("--stage") + 1] : undefined;
const implementedStages = ["V1.1", "V1.2", "V1.3", "V1.4", "V1.5", "V2.1", "V2.2", "V2.3", "V2.4", "V2.5"];

if (stage && !implementedStages.includes(stage)) {
  console.error(`no Web E2E is implemented for ${stage}`);
  process.exit(2);
}

const playwrightArgs = stage
  ? ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", stage.replace(".", "\\.")]
  : ["--filter", "@stockquant/web", "test:e2e"];
const result = spawnSync("pnpm", playwrightArgs, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
