import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const stage = process.argv[process.argv.indexOf("--stage") + 1];
const stageServices = {
  "V1.1": [["portfolio-risk", "portfolio_risk"], ["platform-api", "platform_api"]],
  "V1.2": [["market-data", "market_data"], ["decision-governance", "decision_governance"], ["quant-research", "quant_research"]],
  "V1.3": [["trade-execution", "trade_execution"], ["portfolio-risk", "portfolio_risk"], ["decision-governance", "decision_governance"]],
  "V1.4": [["historical-replay", "historical_replay"], ["quant-research", "quant_research"], ["market-data", "market_data"], ["platform-api", "platform_api"]],
  "V1.5": [["platform-api", "platform_api"], ["decision-governance", "decision_governance"], ["trade-execution", "trade_execution"], ["portfolio-risk", "portfolio_risk"]],
};
if (!stageServices[stage]) throw new Error("usage: node scripts/test-v1-migration-cli-suite.mjs --stage V1.1|V1.2|V1.3|V1.4|V1.5|V1.5");

for (const [service, role] of stageServices[stage]) {
  const result = spawnSync(process.execPath, [
    resolve(root, "scripts/run-isolated-postgres-command.mjs"),
    "--url-env", `STOCKQUANT_DATABASE_URL:${role}:${role}_test`,
    "--", process.execPath, resolve(root, "scripts/test-v1-migration-cli.mjs"), service,
  ], { cwd: root, env: process.env, stdio: "inherit", timeout: 300_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${stage} ${service} migration CLI acceptance failed`);
}
console.log(JSON.stringify({ status: "PASS", stage, services: stageServices[stage].map(([service]) => service), isolatedDatabasePerService: true }));
