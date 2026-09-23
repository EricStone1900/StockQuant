import test from "node:test";
import assert from "node:assert/strict";
import { probeSourceRecovery, recoveryProbeRequest } from "./dc08a-source-recovery-probe.mjs";

test("recovery request probes one symbol over the last five calendar days", () => {
  assert.deepEqual(recoveryProbeRequest({ securityIds: ["600000.SH", "000001.SZ"], today: "2026-09-23" }), {
    operation: "RECOVERY_PROBE",
    securityIds: ["600000.SH"],
    startDate: "2026-09-19",
    endDate: "2026-09-23",
    probeTimeoutSeconds: 3,
  });
});

test("recovery command uses the running market-data container and returns its audit result", async () => {
  let invocation;
  const response = { status: "COMPLETED", operation: "RECOVERY_PROBE", attempts: [{ sourceId: "baostock", status: "INCONCLUSIVE", code: "EMPTY_RESULT" }] };
  const result = await probeSourceRecovery({
    securityIds: ["600000.SH"],
    today: "2026-09-23",
    command: (binary, args, input) => {
      invocation = { binary, args, input };
      return { status: 0, stdout: JSON.stringify(response), stderr: "" };
    },
  });
  assert.equal(invocation.binary, "docker");
  assert.ok(invocation.args.includes("run"));
  assert.ok(invocation.args.includes("--rm"));
  assert.ok(invocation.args.includes("--no-deps"));
  assert.ok(!invocation.args.includes("exec"));
  assert.ok(invocation.args.includes("market-data-service"));
  assert.equal(JSON.parse(invocation.input).operation, "RECOVERY_PROBE");
  assert.deepEqual(result.attempts, response.attempts);
});

test("recovery command skips safely when there is no active universe", async () => {
  const result = await probeSourceRecovery({ securityIds: [], today: "2026-09-23" });
  assert.equal(result.status, "SKIPPED");
  assert.equal(result.reason, "NO_ACTIVE_SECURITIES");
});
