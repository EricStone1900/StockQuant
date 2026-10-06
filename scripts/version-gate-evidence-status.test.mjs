import test from "node:test";
import assert from "node:assert/strict";
import { applyEvidenceAudit } from "./version-gate-evidence-status.mjs";

test("version cannot pass when linked evidence is incomplete", () => {
  assert.equal(applyEvidenceAudit("PASS", "INCOMPLETE"), "INCOMPLETE");
});

test("evidence integrity failures fail the combined version gate", () => {
  assert.equal(applyEvidenceAudit("PASS", "FAIL"), "FAIL");
  assert.equal(applyEvidenceAudit("INCOMPLETE", "FAIL"), "FAIL");
});

test("valid linked evidence preserves the requirement-derived version status", () => {
  assert.equal(applyEvidenceAudit("PASS", "PASS"), "PASS");
  assert.equal(applyEvidenceAudit("INCOMPLETE", "PASS"), "INCOMPLETE");
});
