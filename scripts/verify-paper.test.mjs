import assert from "node:assert/strict";
import test from "node:test";
import { paperVerificationCommand } from "./verify-paper-core.mjs";

test("verify:paper delegates to the complete isolated V1.3 FakeBroker E2E suite", () => {
  assert.deepEqual(paperVerificationCommand([]), ["pnpm", ["test:e2e", "--", "--stage", "V1.3"]]);
  assert.equal(paperVerificationCommand(["--help"]), null);
  assert.throws(() => paperVerificationCommand(["--stage", "V2.4"]), /usage:/);
});
