import test from "node:test";
import assert from "node:assert/strict";
import { readActiveSubscription, readEnabledSubscriptionCount, selectActiveSubscription } from "./dc08a-active-subscription.mjs";

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

test("enabled subscription inventory reports zero or multiple schedules without selecting one", async () => {
  const env = { STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) };
  for (const [schedules, expected] of [[[], 0], [[{ enabled: true }, { enabled: true }, { enabled: false }], 2]]) {
    const calls = [];
    const count = await readEnabledSubscriptionCount({ baseUrl: "http://test", env, fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ schedules }) };
    } });
    assert.equal(count, expected);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v2\/collection-schedules$/);
    assert.equal(calls[0].options.headers.authorization, `Bearer ${env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`);
  }
});
