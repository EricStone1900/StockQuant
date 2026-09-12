import test from "node:test";
import assert from "node:assert/strict";
import { buildRepairPlan, classifyReady, supervise } from "./dc08a-supervise.mjs";

test("ready classification distinguishes disabled executor", () => {
  assert.equal(classifyReady({ status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }), "HEALTHY");
  assert.equal(classifyReady({ status: "ready", collectionPersistence: "POSTGRES", collectionExecutor: "DISABLED" }), "WAITING_CONFIGURATION");
  assert.equal(classifyReady({ status: "ready", collectionPersistence: "DISABLED", collectionExecutor: "DISABLED" }), "WAITING_CONFIGURATION");
  assert.equal(classifyReady({}, 503), "UNHEALTHY");
});

test("repair plan only starts market-data-service", () => {
  const plan = buildRepairPlan("UNHEALTHY", "repair");
  assert.deepEqual(plan, [["docker", ["compose", "-f", "infra/compose/docker-compose.yml", "up", "-d", "market-data-service"]]]);
  assert.deepEqual(buildRepairPlan("WAITING_CONFIGURATION", "repair"), []);
  assert.deepEqual(buildRepairPlan("UNHEALTHY", "check-only"), []);
});

test("failed repair returns failure without a second mutation", async () => {
  const commands = [];
  const result = await supervise({
    mode: "repair",
    probe: async () => ({ state: "UNHEALTHY", status: 0, body: {} }),
    command: (binary, args) => { commands.push([binary, args]); return { status: 1 }; },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(commands.length, 1);
  assert.equal(result.state, "REPAIR_FAILED");
});

test("enabled repair preserves the approved worker configuration", async () => {
  let options;
  const result = await supervise({
    mode: "repair",
    preserveEnabled: true,
    probe: async () => ({ state: "UNHEALTHY", status: 0, body: {} }),
    command: (_binary, _args, receivedOptions) => { options = receivedOptions; return { status: 1 }; },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(options.env.STOCKQUANT_SCHEDULER_WORKER, "1");
  assert.equal(options.env.STOCKQUANT_COLLECTION_EXECUTOR, "1");
});
