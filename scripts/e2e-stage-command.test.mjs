import assert from "node:assert/strict";
import test from "node:test";
import { e2eStageCommand } from "./e2e-stage-command.mjs";

test("V2.4 E2E provisions the integrated isolated HTTP/browser harness", () => {
  assert.deepEqual(e2eStageCommand("V2.4"), ["--filter", "@stockquant/platform-api-service", "v24:paper-http-smoke"]);
});

test("V1.4 E2E uses its integrated isolated Quant, Platform, Web and CLI harness", () => {
  assert.deepEqual(e2eStageCommand("V1.4"), ["test:integration:v14-backtest"]);
});

test("V1.2 E2E uses the isolated Platform, Market Data, Quant, Qlib Worker, Web and CLI harness", () => {
  assert.deepEqual(e2eStageCommand("V1.2"), ["exec", "node", "scripts/test-v12-e2e-isolated.mjs"]);
});

test("other stage E2E commands continue to run their matching Web tests", () => {
  assert.deepEqual(e2eStageCommand("V3.2"), ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", "V3\\.2"]);
  assert.deepEqual(e2eStageCommand(undefined), ["--filter", "@stockquant/web", "test:e2e"]);
});
