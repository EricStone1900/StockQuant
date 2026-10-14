import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);

const services = {
  "portfolio-risk": {
    package: "services/portfolio-risk-service",
    role: "portfolio_risk",
    schemaVersion: 3,
    markers: ["portfolio_risk_schema_migrations", "accounts", "ledger_entries", "resource_reservations"],
    ledger: "portfolio_risk_schema_migrations",
    async migrate(pool, base) {
      const { PostgresAccountRepository } = await import(pathToFileURL(resolve(base, "dist/adapters/postgres-account-repository.js")));
      await new PostgresAccountRepository(pool).migrate();
    },
  },
  "decision-governance": {
    package: "services/decision-governance-service",
    role: "decision_governance",
    markers: ["decision_governance_schema_migrations", "execution_authorizations", "proposals", "auto_policy_mandates", "governed_strategy_snapshots"],
    ledger: "decision_governance_schema_migrations",
    migrationModule: "dist/adapters/postgres-schema-migrations.js",
    migrationFunction: "migrateDecisionGovernanceSchema",
  },
  "trade-execution": {
    package: "services/trade-execution-service",
    role: "trade_execution",
    schemaVersion: 3,
    markers: ["trade_execution_schema_migrations", "fake_broker_orders", "fake_broker_fills", "fake_broker_outbox"],
    ledger: "trade_execution_schema_migrations",
    migrationModule: "dist/adapters/postgres-schema-migrations.js",
    migrationFunction: "migrateTradeExecutionSchema",
  },
  "historical-replay": {
    package: "services/historical-replay-worker",
    role: "historical_replay",
    markers: ["historical_replay_schema_migrations", "replay_worker_runs"],
    ledger: "historical_replay_schema_migrations",
    migrationModule: "dist/adapters/postgres-schema-migrations.js",
    migrationFunction: "migrateHistoricalReplaySchema",
  },
  "quant-research": {
    package: "services/quant-research-service",
    role: "quant_research",
    markers: ["quant_research_schema_migrations", "research_backtest_runs", "research_candidates"],
    ledger: "quant_research_schema_migrations",
    migrationModule: "dist/adapters/postgres-schema-migrations.js",
    migrationFunction: "migrateQuantResearchSchema",
  },
  "market-data": {
    package: "services/market-data-service",
    role: "market_data",
    markers: ["market_data_schema_migrations", "market_data_collection_runs", "market_data_minute_imports", "market_data_projects"],
    ledger: "market_data_schema_migrations",
    migrationModule: "dist/adapters/postgres-schema-migrations.js",
    migrationFunction: "migrateMarketDataSchema",
  },
  "platform-api": {
    package: "services/platform-api-service",
    role: "platform_api",
    markers: ["platform_local_sessions", "test_runs", "acceptance_stage_runs", "v15_workflow_dispatch_outbox", "qlib_fixture_artifacts", "v24_scheduler_state", "v24_observation_days"],
    async migrate(pool, base) {
      const [sessions, testRuns, stageRuns, artifacts, contentStore, observations] = await Promise.all([
        import(pathToFileURL(resolve(base, "dist/adapters/postgres-local-session-repository.js"))),
        import(pathToFileURL(resolve(base, "dist/adapters/postgres-test-run-repository.js"))),
        import(pathToFileURL(resolve(base, "dist/adapters/postgres-stage-run-repository.js"))),
        import(pathToFileURL(resolve(base, "dist/adapters/postgres-qlib-fixture-artifact-repository.js"))),
        import(pathToFileURL(resolve(base, "dist/adapters/qlib-artifact-content-store.js"))),
        import(pathToFileURL(resolve(base, "dist/adapters/postgres-v24-observation-repository.js"))),
      ]);
      // Preserve Platform API startup order: parent TestRun tables precede stage,
      // artifact and observation tables that reference them.
      await new sessions.PostgresLocalSessionRepository(pool, "acceptance-owner-1").migrate();
      await new testRuns.PostgresTestRunRepository(pool).migrate();
      await new stageRuns.PostgresStageRunRepository(pool).migrate();
      const store = new contentStore.QlibArtifactContentStore(process.env.STOCKQUANT_ARTIFACT_CONTENT_ROOT ?? "/var/lib/stockquant/research-artifacts");
      await new artifacts.PostgresQlibFixtureArtifactRepository(pool, store).migrate();
      await new observations.PostgresV24ObservationRepository(pool).migrate();
    },
  },
};

function parseArgs(argv) {
  let service;
  let apply = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--service") service = argv[++index];
    else if (arg === "--apply") apply = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!service || !Object.hasOwn(services, service)) throw new Error(`usage: node scripts/migrate-v1-service-database.mjs --service ${Object.keys(services).join("|")} [--apply]`);
  return { service, apply };
}

async function main() {
  const { service, apply } = parseArgs(process.argv.slice(2));
  const descriptor = services[service];
  const connectionString = process.env.STOCKQUANT_DATABASE_URL;
  if (!connectionString) throw new Error("STOCKQUANT_DATABASE_URL must point to the selected service's database");
  const url = new URL(connectionString);
  if (!/^postgres(?:ql)?:$/u.test(url.protocol)) throw new Error("STOCKQUANT_DATABASE_URL must use the PostgreSQL protocol");
  const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
  if (database !== descriptor.role && database !== `${descriptor.role}_test` && !database.startsWith(`${descriptor.role}_shadow_`)) {
    throw new Error(`database name does not match selected service; expected ${descriptor.role}, ${descriptor.role}_test, or ${descriptor.role}_shadow_<id>`);
  }

  const serviceRoot = resolve(root, descriptor.package);
  const requireService = createRequire(resolve(serviceRoot, "package.json"));
  const { Pool } = requireService("pg");
  const pool = new Pool({ connectionString, max: 1, application_name: `stockquant-v1-migration-${service}` });
  try {
    const identity = await pool.query("SELECT current_database() AS database, current_user AS role, inet_server_addr()::text AS server_addr, inet_server_port() AS server_port, current_setting('transaction_read_only') AS transaction_read_only");
    const target = identity.rows[0];
    assert.equal(target.database, database);
    assert.equal(target.role, descriptor.role, `database role must be ${descriptor.role}`);
    if (target.transaction_read_only === "on") throw new Error("database is read-only");

    if (apply) {
      if (descriptor.migrationModule) {
        const module = await import(pathToFileURL(resolve(serviceRoot, descriptor.migrationModule)));
        await module[descriptor.migrationFunction](pool);
      } else {
        await descriptor.migrate(pool, serviceRoot);
      }
    }

    const relations = await pool.query("SELECT relation_name, to_regclass(relation_name) IS NOT NULL AS exists FROM unnest($1::text[]) AS relation_name ORDER BY relation_name", [descriptor.markers]);
    const missing = relations.rows.filter((row) => !row.exists).map((row) => row.relation_name);
    let migrationVersion = null;
    if (descriptor.ledger && !missing.includes(descriptor.ledger)) {
      const ledger = await pool.query(`SELECT max(version)::int AS version FROM ${descriptor.ledger}`);
      migrationVersion = ledger.rows[0]?.version ?? 0;
    }
    const expectedSchemaVersion = descriptor.schemaVersion ?? 1;
    const unsupportedVersion = migrationVersion !== null && migrationVersion > expectedSchemaVersion;
    const ledgerIncomplete = Boolean(descriptor.ledger) && migrationVersion !== expectedSchemaVersion;
    const status = unsupportedVersion ? "UNSUPPORTED_SCHEMA_VERSION"
      : missing.length === 0 && !ledgerIncomplete ? "READY"
        : apply ? "INCOMPLETE" : "MIGRATION_REQUIRED";
    console.log(JSON.stringify({
      status,
      service,
      action: apply ? "apply" : "check",
      target: { database: target.database, role: target.role, serverAddress: target.server_addr, serverPort: target.server_port },
      migrationVersion,
      requiredRelations: relations.rows,
      missingRelations: missing,
      rollback: "A prior release requires a separately verified paired database backup; this CLI provides no down-migration.",
    }, null, 2));
    if (unsupportedVersion) process.exitCode = 1;
    else if (missing.length || ledgerIncomplete) process.exitCode = apply ? 1 : 2;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "V1 database migration failed");
  process.exitCode = 1;
});
