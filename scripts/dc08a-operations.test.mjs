import test from "node:test";
import assert from "node:assert/strict";
import { classifySourceRecovery } from "./dc08a-operations.mjs";

test("source recovery marks adapter failures as an explicit degradation", () => {
  assert.deepEqual(classifySourceRecovery({ status: "COMPLETED", attempts: [{ sourceId: "baostock", status: "FAIL", code: "TIMEOUT" }] }), {
    status: "DEGRADED", alert: true, attempts: [{ sourceId: "baostock", status: "FAIL", code: "TIMEOUT" }]
  });
});

test("inconclusive or skipped recovery probes do not page", () => {
  assert.deepEqual(classifySourceRecovery({ status: "COMPLETED", attempts: [{ sourceId: "baostock", status: "INCONCLUSIVE", code: "EMPTY_RESULT" }] }), {
    status: "CHECKED", alert: false, attempts: [{ sourceId: "baostock", status: "INCONCLUSIVE", code: "EMPTY_RESULT" }]
  });
});
