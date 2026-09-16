import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluatePromotion, persistRuntimeConfig, promotionConfig, rollbackSql, verifyPromotedRuntime } from "./dc08a-promote-20.mjs";

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
