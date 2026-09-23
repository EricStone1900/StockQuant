import test from "node:test";
import assert from "node:assert/strict";
import { runNatsPersistenceSmoke } from "./nats-persistence-smoke.mjs";

test("NATS persistence smoke executes through the platform container without shell interpolation", () => {
  let invocation;
  const result = runNatsPersistenceSmoke("verify", (binary, args, input) => {
    invocation = { binary, args, input };
    return { status: 0, stdout: JSON.stringify({ mode: "verify", status: "PASS" }), stderr: "" };
  });
  assert.equal(invocation.binary, "docker");
  assert.ok(invocation.args.includes("platform-api-service"));
  assert.ok(invocation.args.includes("/workspace/services/platform-api-service"));
  assert.ok(invocation.args.includes("--input-type=module"));
  assert.match(invocation.input, /SQPH5PERSIST/);
  assert.equal(result.status, "PASS");
});

test("NATS persistence smoke refuses unsupported modes", () => {
  assert.throws(() => runNatsPersistenceSmoke("anything", () => { throw new Error("must not invoke Docker"); }), /usage:/);
});
