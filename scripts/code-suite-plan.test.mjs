import test from "node:test";
import assert from "node:assert/strict";
import { codeSuiteCommands } from "./code-suite-plan.mjs";

test("the V2.3 code suite executes the real isolated Qlib fixture-fit component", () => {
  const command = codeSuiteCommands("V2.3").find(([, args]) => args.includes("qlib:fit-smoke"));
  assert.deepEqual(command, ["pnpm", ["--filter", "@stockquant/quant-research-service", "qlib:fit-smoke"]]);
});

test("the V2.3 code suite exercises Governance, Replay Worker, and Quant HTTP identity boundaries", () => {
  const commands = codeSuiteCommands("V2.3");
  const authIndex = commands.findIndex(([, args]) => args.includes("test:service-auth:http"));
  const qlibIndex = commands.findIndex(([, args]) => args.includes("qlib:fit-smoke"));
  assert.ok(authIndex > 0);
  assert.ok(qlibIndex > authIndex);
  assert.deepEqual(commands[authIndex], ["pnpm", ["test:service-auth:http"]]);
});

test("other V2 stage code suites do not build or execute the heavyweight Qlib model container", () => {
  for (const stage of ["V2.1", "V2.2", "V2.4", "V2.5"]) {
    assert.equal(codeSuiteCommands(stage).some(([, args]) => args.includes("qlib:fit-smoke")), false, stage);
  }
});

test("V2.3 retains all shared code and database checks before its scoped component smokes", () => {
  const commands = codeSuiteCommands("V2.3");
  assert.deepEqual(commands.slice(0, 12).map(([, args]) => args), [
    ["baseline:check"], ["build"], ["lint"], ["typecheck"], ["test"],
    ["--filter", "@stockquant/trade-execution-service", "test:integration"],
    ["--filter", "@stockquant/portfolio-risk-service", "test:integration"],
    ["test:contract"], ["test:python-adapter"], ["test:ops"],
    ["--filter", "@stockquant/market-data-service", "service-auth:http-smoke"],
    ["test:integration:market-data"],
  ]);
  assert.equal(commands.at(-1)[1].at(-1), "qlib:fit-smoke");
});

test("V2.4 runs WAITING, Paper readiness HTTP, and Linux container boundary smokes", () => {
  const commands = codeSuiteCommands("V2.4");
  assert.deepEqual(commands.slice(0, 12).map(([, args]) => args), codeSuiteCommands("V2.1").map(([, args]) => args));
  assert.deepEqual(commands.slice(-2), [
    ["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness"], { TRADE_EXECUTION_TEST_DATABASE_URL: "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test" }],
    ["pnpm", ["--filter", "@stockquant/trade-execution-service", "test:v24-readiness:container"]]
  ]);
  assert.deepEqual(commands.at(-3), ["pnpm", ["--filter", "@stockquant/platform-api-service", "v24:waiting-http-smoke"]]);
  assert.equal(commands.some(([, args]) => args.includes("qlib:fit-smoke")), false);
});
