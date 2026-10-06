import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratorRegistration } from "./contract-generator-registration.mjs";

test("all client generators must be part of generation and drift checks", () => {
  const result = validateGeneratorRegistration(
    ["generate-alpha-client.mjs", "generate-beta-client.mjs"],
    "node scripts/generate-alpha-client.mjs && node scripts/generate-beta-client.mjs",
    "node scripts/generate-alpha-client.mjs --check && node scripts/generate-beta-client.mjs --check",
  );
  assert.deepEqual(result, { generateMissing: [], checkMissing: [] });
});

test("reports a missing generation command and stale-artifact check separately", () => {
  const result = validateGeneratorRegistration(
    ["generate-alpha-client.mjs", "generate-beta-client.mjs"],
    "node scripts/generate-alpha-client.mjs",
    "node scripts/generate-alpha-client.mjs --check && node scripts/generate-beta-client.mjs",
  );
  assert.deepEqual(result, {
    generateMissing: ["generate-beta-client.mjs"],
    checkMissing: ["generate-beta-client.mjs"],
  });
});
