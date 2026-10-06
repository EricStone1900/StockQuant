import test from "node:test";
import assert from "node:assert/strict";
import { activate, defaultActivationConfig, evaluateActivation } from "./dc08a-activate.mjs";

const expected = { subscriptionId: "dc08a-20260914", calendarVersion: "sse-cn-a-share-2026-1", fromDate: "2026-09-14", toDate: "2026-11-30" };
const schedule = { ...expected, enabled: true, subscriptionVersion: 1 };
const sourceAuthorizedEnv = { STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF: "evidence/source-use-authorization.json", STOCKQUANT_COLLECTION_DATA_VERSION: "minute-v1", STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS: "sina,baostock" };

test("activation defaults remain the frozen approved short subscription", () => {
  assert.deepEqual(defaultActivationConfig, { subscriptionId: "dc08a-20260914-short-v1", calendarVersion: "sse-cn-a-share-2026-1", fromDate: "2026-09-14", toDate: "2026-10-19" });
});

test("activation requires exactly one matching enabled subscription", () => {
  const ready = { status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" };
  assert.equal(evaluateActivation({ ready, schedules: [schedule], expected }).ok, true);
  assert.equal(evaluateActivation({ ready, schedules: [], expected }).ok, false);
  assert.equal(evaluateActivation({ ready, schedules: [{ ...schedule, subscriptionId: "old-test" }], expected }).ok, false);
});

test("blocked activation never runs compose", async () => {
  let called = false;
  const result = await activate({
    env: { ...sourceAuthorizedEnv, DC08A_SUBSCRIPTION_ID: expected.subscriptionId, DC08A_CALENDAR_VERSION: expected.calendarVersion, DC08A_FROM_DATE: expected.fromDate, DC08A_TO_DATE: expected.toDate },
    ready: async () => ({ status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "DISABLED", collectionExecutor: "DISABLED" }),
    read: async () => [{ ...schedule, subscriptionId: "old-test" }],
    command: () => { called = true; return { status: 0, stdout: "", stderr: "" }; },
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.exitCode, 2);
  assert.equal(called, false);
});

test("activation refuses to inspect or change runtime while source authorization is absent", async () => {
  let inspected = false;
  const result = await activate({ env: {}, ready: async () => { inspected = true; return {}; }, read: async () => [], command: () => { throw new Error("must not run compose"); } });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.exitCode, 2);
  assert.equal(inspected, false);
});

test("activation requires the data version before inspecting runtime or running compose", async () => {
  let inspected = false;
  let composed = false;
  const result = await activate({
    env: { ...sourceAuthorizedEnv, STOCKQUANT_COLLECTION_DATA_VERSION: "" },
    ready: async () => { inspected = true; return {}; },
    read: async () => [],
    command: () => { composed = true; return { status: 0, stdout: "", stderr: "" }; },
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.exitCode, 2);
  assert.equal(inspected, false);
  assert.equal(composed, false);
});

test("activation can enable a consistently disabled worker pair", () => {
  const ready = { status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "DISABLED", collectionExecutor: "DISABLED" };
  assert.equal(evaluateActivation({ ready, schedules: [schedule], expected }).ok, true);
});

test("activation blocks an inconsistent worker pair", () => {
  const ready = { status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "ENABLED", collectionExecutor: "DISABLED" };
  assert.equal(evaluateActivation({ ready, schedules: [schedule], expected }).ok, false);
});

test("approved activation passes explicit enable flags to compose", async () => {
  let call;
  const result = await activate({
    env: { ...sourceAuthorizedEnv, DC08A_SUBSCRIPTION_ID: expected.subscriptionId, DC08A_CALENDAR_VERSION: expected.calendarVersion, DC08A_FROM_DATE: expected.fromDate, DC08A_TO_DATE: expected.toDate },
    ready: async () => ({ status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "DISABLED", collectionExecutor: "DISABLED" }),
    read: async () => [schedule],
    command: (args, options) => { call = { args, options }; return { status: 0, stdout: "", stderr: "" }; },
  });
  assert.equal(result.status, "ENABLED");
  assert.equal(call.options.env.STOCKQUANT_SCHEDULER_WORKER, "1");
  assert.equal(call.options.env.STOCKQUANT_COLLECTION_EXECUTOR, "1");
  assert.equal(call.options.env.STOCKQUANT_COLLECTION_SUBSCRIPTION_ID, expected.subscriptionId);
});

test("check-only never runs compose after all guards pass", async () => {
  let called = false;
  const result = await activate({
    dryRun: true,
    env: { ...sourceAuthorizedEnv, DC08A_SUBSCRIPTION_ID: expected.subscriptionId, DC08A_CALENDAR_VERSION: expected.calendarVersion, DC08A_FROM_DATE: expected.fromDate, DC08A_TO_DATE: expected.toDate },
    ready: async () => ({ status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "DISABLED", collectionExecutor: "DISABLED" }),
    read: async () => [schedule],
    command: () => { called = true; return { status: 0, stdout: "", stderr: "" }; },
  });
  assert.equal(result.status, "READY_TO_ENABLE");
  assert.equal(called, false);
});

test("already enabled activation is idempotent and does not recreate the service", async () => {
  let called = false;
  const result = await activate({
    env: { ...sourceAuthorizedEnv, DC08A_SUBSCRIPTION_ID: expected.subscriptionId, DC08A_CALENDAR_VERSION: expected.calendarVersion, DC08A_FROM_DATE: expected.fromDate, DC08A_TO_DATE: expected.toDate },
    ready: async () => ({ status: "ready", collectionPersistence: "POSTGRES", collectionSourceAuthorization: "AUTHORIZED", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }),
    read: async () => [schedule],
    command: () => { called = true; return { status: 0, stdout: "", stderr: "" }; },
  });
  assert.equal(result.status, "ALREADY_ENABLED");
  assert.equal(result.exitCode, 0);
  assert.equal(called, false);
});
