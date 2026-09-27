import test from "node:test";
import assert from "node:assert/strict";
import { readActiveSubscription, selectActiveSubscription } from "./dc08a-active-subscription.mjs";

test("active subscription selection requires exactly one enabled schedule", () => {
  assert.equal(selectActiveSubscription([{ subscriptionId: "short", enabled: true }]).subscriptionId, "short");
  assert.throws(() => selectActiveSubscription([]), /exactly one/);
  assert.throws(() => selectActiveSubscription([{ enabled: true }, { enabled: true }]), /exactly one/);
});

test("active subscription reads the schedule and security set together", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, json: async () => url.endsWith("/ready") ? { collectionSecurityIds: ["600000.SH", "000001.SZ"] } : { schedules: [{ subscriptionId: "target", enabled: true }] } }; };
  const result = await readActiveSubscription({ baseUrl: "http://test", fetchImpl, env: { STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) } });
  assert.deepEqual(result, { subscriptionId: "target", securityIds: ["600000.SH", "000001.SZ"] });
  assert.equal(calls.find((call) => call.url.endsWith("/v2/collection-schedules")).options.headers.authorization, `Bearer ${"p".repeat(40)}`);
});
