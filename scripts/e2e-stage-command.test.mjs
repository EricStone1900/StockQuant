import assert from "node:assert/strict";
import test from "node:test";
import { e2eStageCommand } from "./e2e-stage-command.mjs";

test("V2.4 E2E provisions the integrated isolated HTTP/browser harness", () => {
  assert.deepEqual(e2eStageCommand("V2.4"), ["--filter", "@stockquant/platform-api-service", "v24:waiting-http-smoke"]);
});

test("other stage E2E commands continue to run their matching Web tests", () => {
  assert.deepEqual(e2eStageCommand("V3.2"), ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", "V3\\.2"]);
  assert.deepEqual(e2eStageCommand(undefined), ["--filter", "@stockquant/web", "test:e2e"]);
});
