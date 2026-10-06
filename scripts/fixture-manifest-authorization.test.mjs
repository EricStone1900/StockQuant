import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schema = JSON.parse(await readFile(new URL("../fixtures/manifests/fixture-manifest.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const manifest = (overrides = {}) => ({
  fixtureId: "market-input-test",
  fixtureVersion: "market-input-test-1",
  stageId: "V2.3",
  status: "FROZEN",
  dataMode: "FIXTURE",
  usageEligibility: "SIMULATION_ONLY",
  source: { kind: "SYNTHETIC", description: "synthetic bars", license: "internal synthetic fixture", retrievedAt: null },
  createdAt: "2026-10-01T00:00:00Z",
  files: [{ path: "fixtures/v2/v2.3/replay_bars.csv", sha256: "a".repeat(64), mediaType: "text/csv", schemaRef: "minute-bar-v1" }],
  expectedAssertions: [{ assertionId: "W4-MANIFEST-001", description: "source authorization is bound to immutable data" }],
  ...overrides,
});

test("synthetic fixtures retain the existing lightweight provenance contract", () => {
  assert.equal(validate(manifest()), true);
  assert.equal(validate(manifest({ source: { kind: "PROVIDER", description: "bars", license: "terms", retrievedAt: null } })), false);
});

test("RECORDED or REAL inputs cannot pass without retrievable authorization and scoped use", () => {
  for (const dataMode of ["RECORDED", "REAL"]) {
    const candidate = manifest({
      dataMode,
      source: { kind: "PROVIDER", description: "market bars", license: "provider terms", retrievedAt: "2026-09-30T00:00:00Z" },
    });
    assert.equal(validate(candidate), false);
    assert.ok(validate.errors?.some((error) => error.keyword === "required" && ["authorizationRef", "authorizedUse"].includes(String(error.params?.missingProperty))));
  }
});

test("authorized REAL research input must name the evidence and exact permitted use", () => {
  const candidate = manifest({
    dataMode: "REAL",
    usageEligibility: "RESEARCH_ONLY",
    source: {
      kind: "PROVIDER", description: "licensed historical bars", license: "research agreement R-2026-01",
      retrievedAt: "2026-09-30T00:00:00Z", authorizationRef: "evidence/licenses/R-2026-01.md", authorizationSha256: "b".repeat(64), authorizedUse: ["RESEARCH"],
    },
  });
  assert.equal(validate(candidate), true);
});

test("PRODUCTION_ELIGIBLE cannot be assigned to synthetic or recorded data", () => {
  for (const dataMode of ["FIXTURE", "RECORDED"]) {
    const candidate = manifest({ dataMode, usageEligibility: "PRODUCTION_ELIGIBLE" });
    assert.equal(validate(candidate), false);
  }
});

test("REAL production eligibility requires explicit authorization evidence", () => {
  const candidate = manifest({
    dataMode: "REAL",
    usageEligibility: "PRODUCTION_ELIGIBLE",
    source: {
      kind: "USER_PROVIDED", description: "licensed historical bars", license: "research and simulation agreement",
      retrievedAt: "2026-09-30T00:00:00Z", authorizationRef: "evidence/licenses/user-data-approval.md", authorizationSha256: "c".repeat(64), authorizedUse: ["RESEARCH", "SIMULATION"],
    },
  });
  assert.equal(validate(candidate), true);
});
