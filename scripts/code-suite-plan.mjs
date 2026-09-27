const baseCommands = [
  ["pnpm", ["baseline:check"]],
  ["pnpm", ["build"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:integration"], { TRADE_EXECUTION_TEST_DATABASE_URL: "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test" }],
  ["pnpm", ["--filter", "@stockquant/portfolio-risk-service", "test:integration"], { PORTFOLIO_RISK_TEST_DATABASE_URL: "postgresql://portfolio_risk@127.0.0.1:5433/portfolio_risk_test" }],
  ["pnpm", ["test:contract"]],
  ["pnpm", ["test:python-adapter"]],
  ["pnpm", ["test:ops"]],
  ["pnpm", ["--filter", "@stockquant/market-data-service", "service-auth:http-smoke"]],
  ["pnpm", ["test:integration:market-data"]],
];

export function codeSuiteCommands(stage) {
  const commands = baseCommands.map(([command, args, env]) => [command, [...args], env ? { ...env } : undefined]);
  if (stage === "V2.3") {
    commands.push(["pnpm", ["test:service-auth:http"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
  }
  if (stage === "V2.4") {
    commands.push(["pnpm", ["--filter", "@stockquant/platform-api-service", "v24:waiting-http-smoke"]]);
    commands.push(["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness"], { TRADE_EXECUTION_TEST_DATABASE_URL: "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test" }]);
    commands.push(["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness:container"]]);
  }
  return commands;
}
