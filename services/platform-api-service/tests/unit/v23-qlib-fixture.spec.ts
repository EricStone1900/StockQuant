import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { assertV23QlibFixtureResult, buildV23QlibFixtureRequest, v23QlibFixtureInputSha256 } from "../../src/application/v23-qlib-fixture.js";

describe("V2.3 Qlib fixture TestRun inputs and assertions", () => {
  it("builds a deterministic, temporally ordered synthetic train/valid/test request", () => {
    const first = buildV23QlibFixtureRequest();
    const second = buildV23QlibFixtureRequest();
    expect(first).toEqual(second);
    expect(v23QlibFixtureInputSha256(first)).toBe(v23QlibFixtureInputSha256(second));
    expect(first.sourceMode).toBe("FIXTURE");
    expect(first.featureRows).toHaveLength(120);
    expect(first.temporalMetadata).toHaveLength(120);
    expect(first.temporalMetadata?.every((row) => Date.parse(row.featureAvailableAt) < Date.parse(row.decisionAt) && Date.parse(row.decisionAt) < Date.parse(row.labelAvailableAt))).toBe(true);
    expect(first.splits).toEqual({ train: [0, 72], valid: [72, 96], test: [96, 120] });
    const frozenBytes = readFileSync(resolve(process.cwd(), "../../fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json"));
    expect(createHash("sha256").update(frozenBytes).digest("hex")).toBe("1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e");
    expect(JSON.parse(frozenBytes.toString("utf8"))).toEqual(first);
  });

  it("only accepts actual Qlib training with temporal checks and refuses unsupported claims", () => {
    const valid = {
      schemaVersion: "qlib-fit-fixture-result-v1", status: "COMPLETED", sourceMode: "FIXTURE", modelTraining: "PASS", modelValidation: "NOT_RUN", temporalValidation: "PASS", candidateSourceExecution: "NOT_PERFORMED",
      qlibVersion: "0.9.6", lightgbmVersion: "4.7.0", model: "qlib.contrib.model.gbdt.LGBModel", segments: { train: { start: 0, end: 72, rows: 72 }, valid: { start: 72, end: 96, rows: 24 }, test: { start: 96, end: 120, rows: 24 } },
      testPredictionCount: 24, testPredictionsFinite: true, testPredictionsSha256: "a".repeat(64), modelSha256: "b".repeat(64), evaluationMetrics: {}, tracking: "temporary SQLite under /tmp; removed with the worker container", profitabilityClaim: "NOT_MADE",
    } as const;
    expect(assertV23QlibFixtureResult(valid as never)).toEqual([]);
    expect(assertV23QlibFixtureResult({ ...valid, modelValidation: "PASS", temporalValidation: "NOT_RUN" } as never)).toHaveLength(2);
  });
});
