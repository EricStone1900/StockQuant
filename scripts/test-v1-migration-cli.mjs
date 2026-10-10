import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = resolve(root, "scripts/migrate-v1-service-database.mjs");
const service = process.argv[2];
if (!service) throw new Error("usage: node scripts/test-v1-migration-cli.mjs SERVICE");
const migrationLedgers = {
  "portfolio-risk": "portfolio_risk_schema_migrations",
  "decision-governance": "decision_governance_schema_migrations",
  "trade-execution": "trade_execution_schema_migrations",
  "historical-replay": "historical_replay_schema_migrations",
  "quant-research": "quant_research_schema_migrations",
  "market-data": "market_data_schema_migrations",
};

function invoke(...args) {
  const result = spawnSync(process.execPath, [cli, "--service", service, ...args], { cwd: root, encoding: "utf8", env: process.env, timeout: 120_000 });
  if (result.error) throw result.error;
  const match = result.stdout.match(/\{[\s\S]*\}/u);
  assert.ok(match, `migration CLI did not return JSON: ${result.stderr}`);
  return { exitCode: result.status, report: JSON.parse(match[0]) };
}

const initial = invoke();
assert.equal(initial.exitCode, 2, "fresh disposable target must report migration required without applying DDL");
assert.equal(initial.report.status, "MIGRATION_REQUIRED");
assert.equal(initial.report.action, "check");

const applied = invoke("--apply");
assert.equal(applied.exitCode, 0, JSON.stringify(applied.report));
assert.equal(applied.report.status, "READY");
assert.ok(applied.report.requiredRelations.every((relation) => relation.exists), "every required relation must exist after migration");
if (applied.report.migrationVersion !== null) assert.equal(applied.report.migrationVersion, 1);

const checked = invoke();
assert.equal(checked.exitCode, 0);
assert.equal(checked.report.status, "READY");

const reapplied = invoke("--apply");
assert.equal(reapplied.exitCode, 0, JSON.stringify(reapplied.report));
assert.equal(reapplied.report.status, "READY", "migration apply must be idempotent");

if (migrationLedgers[service]) {
  const packageName = service === "portfolio-risk" ? "portfolio-risk-service"
    : service === "decision-governance" ? "decision-governance-service"
      : service === "trade-execution" ? "trade-execution-service"
        : service === "historical-replay" ? "historical-replay-worker"
          : service === "quant-research" ? "quant-research-service" : "market-data-service";
  const requireService = createRequire(resolve(root, "services", packageName, "package.json"));
  const { Pool } = requireService("pg");
  const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL, max: 1 });
  try {
    await pool.query(`INSERT INTO ${migrationLedgers[service]}(version, description) VALUES (2, 'unsupported version probe')`);
    const unsupported = invoke();
    assert.equal(unsupported.exitCode, 1, "unknown migration versions must fail closed during preflight");
    assert.equal(unsupported.report.status, "UNSUPPORTED_SCHEMA_VERSION");
    await pool.query(`DELETE FROM ${migrationLedgers[service]} WHERE version=2`);
  } finally {
    await pool.end();
  }
}

console.log(JSON.stringify({ status: "PASS", service, states: [initial.report.status, applied.report.status, checked.report.status, reapplied.report.status], migrationVersion: reapplied.report.migrationVersion, relationCount: reapplied.report.requiredRelations.length }));
