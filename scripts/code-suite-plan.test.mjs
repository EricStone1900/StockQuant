import test from "node:test";
import assert from "node:assert/strict";
import { codeSuiteCommands } from "./code-suite-plan.mjs";
import { serviceAuthAdminEndpoint } from "./service-auth-admin-endpoint.mjs";

test("service-auth HTTP smoke accepts only its fixed local or helper-marked isolated PostgreSQL endpoint", () => {
  assert.equal(serviceAuthAdminEndpoint(undefined).port, "5433");
  assert.equal(serviceAuthAdminEndpoint("postgresql://postgres@127.0.0.1:61234/postgres", "sq-test-postgres-0123456789abcdef").port, "61234");
  for (const [endpoint, marker] of [
    ["postgresql://postgres@127.0.0.1:61234/postgres", ""],
    ["postgresql://postgres@example.test:5433/postgres", ""],
    ["postgresql://other@127.0.0.1:5433/postgres", ""],
    ["postgresql://postgres@127.0.0.1:5433/other", ""],
    ["postgresql://postgres@127.0.0.1:61234/postgres", "arbitrary-container"],
  ]) assert.throws(() => serviceAuthAdminEndpoint(endpoint, marker));
});

test("the V2.3 code suite executes the real isolated Qlib fixture-fit component", () => {
  const command = codeSuiteCommands("V2.3").find(([, args]) => args.includes("qlib:fit-smoke"));
  assert.deepEqual(command, ["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
  assert.deepEqual(codeSuiteCommands("V2.3").at(-1), ["pnpm", ["--filter", "@stockquant/platform-api-service", "v23:qlib-fixture-testrun-smoke"]]);
});

test("the V1.2 code suite executes the real isolated Qlib CPU fit component", () => {
  assert.deepEqual(codeSuiteCommands("V1.2").at(-2), ["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
  assert.deepEqual(codeSuiteCommands("V1.2").at(-1), ["pnpm", ["test:e2e", "--", "--stage", "V1.2"]]);
});

test("V1.2, V1.3, and V1.4 execute Governance, Replay, and Quant HTTP identity boundaries", () => {
  for (const stage of ["V1.2", "V1.3", "V1.4"]) {
    assert.ok(codeSuiteCommands(stage).some(([, args]) => args.includes("test:service-auth:http")), stage);
  }
  assert.equal(codeSuiteCommands("V1.1").some(([, args]) => args.includes("test:service-auth:http")), false);
  assert.equal(codeSuiteCommands("V1.5").some(([, args]) => args.includes("test:service-auth:http")), false);
});

test("the V1.1 code suite verifies platform migration and unified-store persistence on disposable PostgreSQL", () => {
  const command = codeSuiteCommands("V1.1").at(-1);
  assert.deepEqual(command, [
    process.execPath,
    ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:integration:persistence"],
  ]);
});

test("V1.1 through V1.5 code suites preflight and apply their service-owned migrations on disposable PostgreSQL", () => {
  for (const stage of ["V1.1", "V1.2", "V1.3", "V1.4", "V1.5"]) {
    assert.ok(codeSuiteCommands(stage).some(([command, args]) => command === "pnpm" && args.includes("test:db:migrate:v1") && args.includes(stage)), stage);
  }
});

test("the V1.2 code suite verifies durable Artifact task HTTP state across a Market Data process restart", () => {
  const commands = codeSuiteCommands("V1.2");
  assert.ok(commands.some(([, args]) => args.includes("artifact-task:http-restart-smoke")));
});

test("the V1.4 code suite compares Quant, real Governance grants, Trade fills, and the Portfolio ledger in disposable databases", () => {
  const command = codeSuiteCommands("V1.4").find(([, args]) => args.includes("services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs"));
  assert.deepEqual(command, [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "TRADE_EXECUTION_TEST_DATABASE_URL:trade_execution_test:trade_execution_test", "--url-env", "PORTFOLIO_RISK_TEST_DATABASE_URL:portfolio_risk:portfolio_risk_test", "--url-env", "DECISION_GOVERNANCE_TEST_DATABASE_URL:decision_governance:decision_governance_test", "--",
    process.execPath, "services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs",
  ]]);
});

test("the V1.5 code suite includes the real TestRun/Outbox rollback check on disposable PostgreSQL", () => {
  const command = codeSuiteCommands("V1.5").find(([, args]) => args.includes("test:v15-outbox-atomicity"));
  assert.deepEqual(command, [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--",
    "pnpm", "--filter", "@stockquant/platform-api-service", "test:v15-outbox-atomicity",
  ]]);
  assert.deepEqual(codeSuiteCommands("V1.5").slice(0, 12).map(([, args]) => args), codeSuiteCommands("V1.1").slice(0, 12).map(([, args]) => args));
});

test("the V1.5 code suite exercises owner-scoped Run incident projection and acknowledgement on disposable PostgreSQL", () => {
  const command = codeSuiteCommands("V1.5").find(([, args]) => args.includes("test:v15-run-incidents"));
  assert.deepEqual(command?.[1], [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test",
    "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v15-run-incidents",
  ]);
});

test("the V1.4 code suite tests report Artifact cancellation/publication fencing on disposable PostgreSQL", () => {
  const command = codeSuiteCommands("V1.4").find(([, args]) => args.includes("test:v14-report-publication-fencing"));
  assert.deepEqual(command, [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--",
    "pnpm", "--filter", "@stockquant/platform-api-service", "test:v14-report-publication-fencing",
  ]]);
});

test("the V1.4 code suite verifies the Quant Research migration ledger on disposable PostgreSQL", () => {
  const command = codeSuiteCommands("V1.4").find(([, args]) => args.some((argument) => argument.includes("test-schema-migrations.mjs")));
  assert.deepEqual(command, [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "QUANT_RESEARCH_TEST_DATABASE_URL:quant_research:quant_research_test", "--",
    process.execPath, "services/quant-research-service/scripts/test-schema-migrations.mjs",
  ]]);
});

test("the V1.2 and V1.4 code suites verify the Market Data migration ledger on disposable PostgreSQL", () => {
  const expected = [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_TEST_DATABASE_URL:md_test:md_test", "--",
    process.execPath, "services/market-data-service/scripts/test-schema-migrations.mjs",
  ]];
  for (const stage of ["V1.2", "V1.4"]) {
    const command = codeSuiteCommands(stage).find(([, args]) => args.some((argument) => argument.includes("market-data-service/scripts/test-schema-migrations.mjs")));
    assert.deepEqual(command, expected, stage);
  }
});

test("the V2.3 code suite exercises Governance, Replay Worker, and Quant HTTP identity boundaries", () => {
  const commands = codeSuiteCommands("V2.3");
  const authIndex = commands.findIndex(([, args]) => args.includes("test:service-auth:http"));
  const qlibIndex = commands.findIndex(([, args]) => args.includes("qlib:fit-smoke"));
  assert.ok(authIndex > 0);
  assert.ok(qlibIndex > authIndex);
  assert.deepEqual(commands[authIndex], ["pnpm", ["test:service-auth:http"]]);
});

test("other stage code suites do not build or execute the heavyweight Qlib model container", () => {
  for (const stage of ["V1.1", "V1.3", "V1.4", "V1.5", "V2.1", "V2.2", "V2.4", "V2.5"]) {
    assert.equal(codeSuiteCommands(stage).some(([, args]) => args.includes("qlib:fit-smoke")), false, stage);
    assert.equal(codeSuiteCommands(stage).some(([, args]) => args.includes("v23:qlib-fixture-testrun-smoke")), false, stage);
  }
});

test("V2.2 code suite executes the real upload Web/API flow against only a disposable PostgreSQL container", () => {
  const command = codeSuiteCommands("V2.2").at(-1);
  assert.deepEqual(command, [process.execPath, [
    "scripts/run-isolated-postgres-command.mjs", "--admin-env", "STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL", "--",
    "pnpm", "--filter", "@stockquant/platform-api-service", "v22:upload-web-http-smoke",
  ]]);
  assert.equal(JSON.stringify(command).includes("127.0.0.1:5433"), false);
});

test("V2.3 retains all shared code and database checks before its scoped component smokes", () => {
  const commands = codeSuiteCommands("V2.3");
  assert.deepEqual(commands.slice(0, 12).map(([, args]) => args), [
    ["baseline:check"], ["build"], ["lint"], ["typecheck"], ["test"],
    ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PORTFOLIO_RISK_TEST_DATABASE_URL:portfolio_risk:portfolio_risk_test", "--", "pnpm", "--filter", "@stockquant/portfolio-risk-service", "test:integration"],
    ["--filter", "@stockquant/trade-execution-service", "test:integration"],
    ["test:contract"], ["test:python-adapter"], ["test:ops"],
    ["--filter", "@stockquant/market-data-service", "service-auth:http-smoke"],
    ["scripts/run-isolated-postgres-command.mjs", "--url-env", "MARKET_DATA_TEST_DATABASE_URL:market_data_test:market_data_test", "--", "pnpm", "test:integration:market-data"],
  ]);
  assert.equal(commands.at(-2)[1].at(-1), "qlib:fit-smoke");
  assert.equal(commands.at(-1)[1].at(-1), "v23:qlib-fixture-testrun-smoke");
});

test("V2.4 runs isolated observation persistence, Paper execution/recovery, Web/CLI, and Linux container boundary smokes", () => {
  const commands = codeSuiteCommands("V2.4");
  assert.deepEqual(commands.slice(0, 12).map(([, args]) => args), codeSuiteCommands("V2.1").slice(0, 12).map(([, args]) => args));
  assert.deepEqual(commands.slice(-2), [
    [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "TRADE_EXECUTION_TEST_DATABASE_URL:trade_execution_test:trade_execution_test", "--", "pnpm", "--filter", "@stockquant/trade-execution-service", "test:v24-readiness"]],
    ["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness:container"]]
  ]);
  assert.deepEqual(commands.at(-4), [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--url-env", "PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "test:v24-observation-persistence"]]);
  assert.deepEqual(commands.at(-3), [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--admin-env", "V24_PAPER_SMOKE_ADMIN_DATABASE_URL", "--", "pnpm", "--filter", "@stockquant/platform-api-service", "v24:paper-http-smoke"]]);
  assert.equal(JSON.stringify(commands).includes("127.0.0.1:5433"), false, "code suite must never target the shared Compose PostgreSQL port");
  assert.equal(commands.some(([, args]) => args.includes("qlib:fit-smoke")), false);
});

test("V2.5 runs the existing 100k Parquet upload/read API capacity scenario in isolated Linux containers", () => {
  assert.deepEqual(codeSuiteCommands("V2.5").at(-1), ["pnpm", ["--filter", "@stockquant/market-data-service", "minute-parquet:container-capacity-smoke"]]);
});
