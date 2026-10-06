import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { QlibFitFixtureRequest, QlibFitFixtureResult } from "../contracts/generated-types.js";

const inputPath = fileURLToPath(new URL("../../../../fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json", import.meta.url));
const manifestPath = fileURLToPath(new URL("../../../../fixtures/v2/v2.3/qlib-fit/manifest.json", import.meta.url));

export function buildV23QlibFixtureRequest(): QlibFitFixtureRequest {
  const raw = readFileSync(inputPath);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { fixtureVersion?: string; files?: Array<{ path?: string; sha256?: string }> };
  const declared = manifest.files?.find((file) => file.path === "fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json")?.sha256;
  const actual = createHash("sha256").update(raw).digest("hex");
  if (manifest.fixtureVersion !== "v2.3-qlib-fit-input-1" || declared !== actual) throw new Error("V2.3 Qlib synthetic fixture failed its frozen manifest hash check");
  const request = JSON.parse(raw.toString("utf8")) as QlibFitFixtureRequest;
  if (request.sourceMode !== "FIXTURE" || request.featureRows.length !== 120 || request.labels.length !== 120 || request.temporalMetadata?.length !== 120 || request.splits.train[1] !== request.splits.valid[0] || request.splits.valid[1] !== request.splits.test[0]) throw new Error("V2.3 Qlib synthetic fixture has invalid dimensions or splits");
  return request;
}

export function v23QlibFixtureInputSha256(request: QlibFitFixtureRequest): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

export function assertV23QlibFixtureResult(result: QlibFitFixtureResult): string[] {
  const errors: string[] = [];
  if (result.status !== "COMPLETED" || result.sourceMode !== "FIXTURE" || result.modelTraining !== "PASS") errors.push("Qlib fixture model training did not complete");
  if (result.temporalValidation !== "PASS") errors.push("temporal leakage guard did not pass");
  if (result.modelValidation !== "NOT_RUN" || result.candidateSourceExecution !== "NOT_PERFORMED") errors.push("fixture result claims an unsupported validation or candidate execution");
  if (result.testPredictionCount !== 24 || result.testPredictionsFinite !== true) errors.push("Qlib test predictions are missing, non-finite, or have the wrong count");
  if (!/^[a-f0-9]{64}$/u.test(result.modelSha256) || !/^[a-f0-9]{64}$/u.test(result.testPredictionsSha256)) errors.push("Qlib model/prediction result hashes are invalid");
  if (result.profitabilityClaim !== "NOT_MADE") errors.push("Fixture run must not claim profitability");
  return errors;
}
