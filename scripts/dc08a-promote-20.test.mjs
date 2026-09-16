import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluatePromotion, persistRuntimeConfig, promote, promotionConfig, rollbackSql, verifyPromotedRuntime } from "./dc08a-promote-20.mjs";

const config = promotionConfig({ DC08A_SHORT_SUBSCRIPTION_ID: "short", DC08A_20_SUBSCRIPTION_ID: "target", DC08A_PROMOTION_DATES: "2026-09-14,2026-09-15" });
const short = { subscriptionId: "short", enabled: true, fromDate: "2026-09-14", toDate: "2026-09-16", calendarVersion: "sse-cn-a-share-2026-1" };

test("promotion requires both short observation reports to pass", () => {
  const result = evaluatePromotion({ config, schedules: [short], reports: [{ status: "PASS" }, { status: "INCOMPLETE" }] });
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(" "), /daily reports/);
});

test("promotion is ready only with the unique short subscription and 20 securities", () => {
  const result = evaluatePromotion({ config, schedules: [short], reports: [{ status: "PASS" }, { status: "PASS" }] });
  assert.equal(result.ok, true);
  assert.equal(result.alreadyPromoted, false);
});

test("already promoted target is idempotent", () => {
  const result = evaluatePromotion({ config, schedules: [{ subscriptionId: "target", enabled: true, fromDate: config.fromDate, toDate: config.toDate, calendarVersion: config.calendarVersion }], reports: [{ status: "PASS" }, { status: "PASS" }] });
  assert.equal(result.ok, true);
  assert.equal(result.alreadyPromoted, true);
});

test("promotion runtime must expose the frozen 20-security configuration", () => {
  assert.equal(verifyPromotedRuntime({ status: "ready", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSecurityIds: config.securityIds }, config), true);
  assert.equal(verifyPromotedRuntime({ status: "ready", collectionSchedulerWorker: "ENABLED", collectionExecutor: "DISABLED", collectionSecurityIds: config.securityIds }, config), false);
});

test("promotion persists the verified runtime configuration for subsequent repair", async () => {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-promotion-"));
  const file = join(directory, ".env.local");
  await writeFile(file, "STOCKQUANT_COLLECTION_SUBSCRIPTION_ID=short\nSTOCKQUANT_COLLECTION_SECURITY_IDS=600000.SH\n", "utf8");
  await persistRuntimeConfig({ file, subscriptionId: "target", securityIds: ["600000.SH", "600004.SH"] });
  const content = await readFile(file, "utf8");
  assert.match(content, /^STOCKQUANT_COLLECTION_SUBSCRIPTION_ID=target$/m);
  assert.match(content, /^STOCKQUANT_COLLECTION_SECURITY_IDS=600000\.SH,600004\.SH$/m);
});

test("rollback SQL is transactional and enforces the unique active subscription postcondition", () => {
  const sql = rollbackSql("short", "target");
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /changed_count <> 2/);
  assert.match(sql, /count\(\*\).*enabled/);
  assert.match(sql, /COMMIT;/);
});

function failureScenario({ restartFails = false, apiRollbackFails = false, persistFails = false } = {}) {
  const env = { DC08A_SHORT_SUBSCRIPTION_ID: "short", DC08A_20_SUBSCRIPTION_ID: "target", DC08A_PROMOTION_DATES: "", DC08A_SHORT_SECURITY_IDS: "600000.SH,000001.SZ,600519.SH", STOCKQUANT_COLLECTION_CONTROL_TOKEN: "test" };
  const state = { active: "short", runtime: "short", rollbackSqlSeen: false };
  const shortSchedule = { subscriptionId: "short", enabled: true, fromDate: "2026-09-14", toDate: "2026-10-19", calendarVersion: "sse-cn-a-share-2026-1" };
  const targetSchedule = { subscriptionId: "target", enabled: false, fromDate: "2026-09-17", toDate: "2026-12-31", calendarVersion: "sse-cn-a-share-2026-1" };
  const requestFn = async (_base, path, options = {}) => {
    if (path.includes("/short")) return { ...shortSchedule, enabled: state.active === "short" };
    if (path.includes("/target") && !options.method) { if (state.active !== "target") throw new Error("HTTP 404"); return { ...targetSchedule, enabled: true }; }
    if (path === "/v2/collection-schedules") return targetSchedule;
    if (path.endsWith("/switch")) {
      const body = JSON.parse(options.body);
      if (apiRollbackFails && body.sourceSubscriptionId === "target") throw new Error("HTTP 503 rollback unavailable");
      state.active = body.targetSubscriptionId;
      return {};
    }
    if (path === "/ready") {
      const ids = state.runtime === "target" ? promotionConfig(env).securityIds : ["600000.SH", "000001.SZ", "600519.SH"];
      return { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSecurityIds: ids };
    }
    return {};
  };
  let upCalls = 0;
  const command = (args) => {
    if (args.includes("build")) return { status: 0, stdout: "", stderr: "" };
    if (args.includes("psql")) { state.rollbackSqlSeen = true; state.active = "short"; return { status: 0, stdout: "", stderr: "" }; }
    if (args.includes("up")) { upCalls += 1; if (restartFails && upCalls === 1) return { status: 1, stdout: "", stderr: "restart failed" }; state.runtime = upCalls === 1 ? "target" : "short"; return { status: 0, stdout: "", stderr: "" }; }
    return { status: 0, stdout: "", stderr: "" };
  };
  const persistConfigFn = async ({ subscriptionId }) => { if (persistFails && subscriptionId === "target") throw new Error("config write interrupted"); state.runtime = subscriptionId; };
  return { env, state, requestFn, command, persistConfigFn };
}

test("service restart failure rolls back subscription, runtime and exits 1", async () => {
  const scenario = failureScenario({ restartFails: true });
  const result = await promote({ ...scenario, baseUrl: "http://test", outputDir: "/tmp/does-not-exist" });
  assert.equal(result.exitCode, 1);
  assert.equal(scenario.state.active, "short");
  assert.equal(scenario.state.runtime, "short");
});

test("API rollback failure uses checked database rollback and exits 1", async () => {
  const scenario = failureScenario({ restartFails: true, apiRollbackFails: true });
  const result = await promote({ ...scenario, baseUrl: "http://test", outputDir: "/tmp/does-not-exist" });
  assert.equal(result.exitCode, 1);
  assert.equal(scenario.state.active, "short");
  assert.equal(scenario.state.rollbackSqlSeen, true);
});

test("configuration write failure triggers runtime rollback and exits 1", async () => {
  const scenario = failureScenario({ persistFails: true });
  const result = await promote({ ...scenario, baseUrl: "http://test", outputDir: "/tmp/does-not-exist" });
  assert.equal(result.exitCode, 1);
  assert.equal(scenario.state.active, "short");
  assert.equal(scenario.state.runtime, "short");
});

test("configuration write interruption leaves the previous file intact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-promotion-"));
  const file = join(directory, ".env.local");
  const original = "STOCKQUANT_COLLECTION_SUBSCRIPTION_ID=short\nSTOCKQUANT_COLLECTION_SECURITY_IDS=600000.SH\n";
  await writeFile(file, original, "utf8");
  await assert.rejects(() => persistRuntimeConfig({ file, subscriptionId: "target", securityIds: ["600000.SH", "600004.SH"], writeFileFn: async () => { throw new Error("simulated disk interruption"); } }), /disk interruption/);
  assert.equal(await readFile(file, "utf8"), original);
});
