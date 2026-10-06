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
  if (stage === "V2.3") {
    commands.push(["pnpm", ["test:service-auth:http"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/platform-api-service", "v23:qlib-fixture-testrun-smoke"]]);
  }
  if (stage === "V1.2") {
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_DATABASE_URL:market_data_test:market_data_test", "--", "pnpm", "--filter", "@stockquant/market-data-service", "artifact-task:http-restart-smoke"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
    commands.push(["pnpm", ["test:e2e", "--", "--stage", "V1.2"]]);
  }
  if (stage === "V2.2") {
    commands.push([process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--admin-env", "STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "v22:upload-web-http-smoke"]]);
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
