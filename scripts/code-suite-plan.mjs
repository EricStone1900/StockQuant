const baseCommands = [
  ["pnpm", ["baseline:check"]],
  ["pnpm", ["build"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PORTFOLIO_RISK_TEST_DATABASE_URL:portfolio_risk:portfolio_risk_test", "--", "pnpm", "--filter", "@stockquant/portfolio-risk-service", "test:integration"]],
  ["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:integration"]],
  ["pnpm", ["test:contract"]],
  ["pnpm", ["test:python-adapter"]],
  ["pnpm", ["test:ops"]],
  ["pnpm", ["--filter", "@stockquant/market-data-service", "service-auth:http-smoke"]],
  [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_TEST_DATABASE_URL:market_data_test:market_data_test", "--", "pnpm", "test:integration:market-data"]],
];

export function codeSuiteCommands(stage) {
  const commands = baseCommands.map(([command, args, env]) => [command, [...args], env ? { ...env } : undefined]);
  if (["V1.2", "V1.3", "V1.4"].includes(stage)) {
    commands.push(["pnpm", ["test:service-auth:http"]]);
  }
  if (stage === "V1.1") {
    commands.push(["pnpm", ["test:db:migrate:v1", "--", "--stage", "V1.1"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:integration:persistence"]]);
  }
  if (stage === "V1.4") {
    commands.push(["pnpm", ["test:db:migrate:v1", "--", "--stage", "V1.4"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "QUANT_RESEARCH_TEST_DATABASE_URL:quant_research:quant_research_test", "--", process.execPath, "services/quant-research-service/scripts/test-schema-migrations.mjs"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_TEST_DATABASE_URL:md_test:md_test", "--", process.execPath, "services/market-data-service/scripts/test-schema-migrations.mjs"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "TRADE_EXECUTION_TEST_DATABASE_URL:trade_execution_test:trade_execution_test", "--url-env", "PORTFOLIO_RISK_TEST_DATABASE_URL:portfolio_risk:portfolio_risk_test", "--url-env", "DECISION_GOVERNANCE_TEST_DATABASE_URL:decision_governance:decision_governance_test", "--", process.execPath, "services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v14-report-publication-fencing"]]);
  }
  if (stage === "V1.5") {
    commands.push(["pnpm", ["test:db:migrate:v1", "--", "--stage", "V1.5"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v15-outbox-atomicity"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v15-run-incidents"]]);
  }
  if (stage === "V2.3") {
    commands.push(["pnpm", ["test:service-auth:http"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/platform-api-service", "v23:qlib-fixture-testrun-smoke"]]);
  }
  if (stage === "V1.2") {
    commands.push(["pnpm", ["test:db:migrate:v1", "--", "--stage", "V1.2"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_TEST_DATABASE_URL:md_test:md_test", "--", process.execPath, "services/market-data-service/scripts/test-schema-migrations.mjs"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_DATABASE_URL:market_data_test:market_data_test", "--", "pnpm", "--filter", "@stockquant/market-data-service", "artifact-task:http-restart-smoke"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v12-run-lifecycle"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
    commands.push(["pnpm", ["test:e2e", "--", "--stage", "V1.2"]]);
  }
  if (stage === "V1.3") {
    commands.push(["pnpm", ["test:db:migrate:v1", "--", "--stage", "V1.3"]]);
  }
  if (stage === "V2.2") {
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--admin-env", "STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "v22:upload-web-http-smoke"]]);
  }
  if (stage === "V2.1") {
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_DATABASE_URL:market_data_test:market_data_test", "--url-env", "MARKET_MONITOR_DATABASE_URL:monitor_test:monitor_test", "--", "pnpm", "--filter", "@stockquant/market-data-service", "exec", "node", "scripts/c2-source-pipeline-smoke.mjs"]]);
    for (const script of ["sampling-crash-recovery-smoke.mjs", "news-collection-persistence-smoke.mjs"]) {
      commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_DATABASE_URL:market_data_test:market_data_test", "--", "pnpm", "--filter", "@stockquant/market-data-service", "exec", "node", `scripts/${script}`]]);
    }
  }
  if (stage === "V2.4") {
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v24-observation-persistence"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--admin-env", "V24_PAPER_SMOKE_ADMIN_DATABASE_URL", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "v24:paper-http-smoke"]]);
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "TRADE_EXECUTION_TEST_DATABASE_URL:trade_execution_test:trade_execution_test", "--", "pnpm", "--filter", "@stockquant/trade-execution-service", "test:v24-readiness"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness:container"]]);
  }
  if (stage === "V2.5") {
    commands.push(["pnpm", ["--filter", "@stockquant/market-data-service", "minute-parquet:container-capacity-smoke"]]);
  }
  return commands;
}
