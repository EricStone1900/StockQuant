import { GeneratedV31AcceptanceGateClient } from "../contracts/generated-v31-acceptance-gate-client.js";
import type { V31ExactRunPromotionGate } from "../contracts/generated-types.js";
import type { V31PromotionSubmissionGate } from "./v32-promotion-submission.js";

export class V31GateUnavailableError extends Error {}

export function createV31PromotionGateReader(input: {
  platformBaseUrl: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
}) {
  const client = new GeneratedV31AcceptanceGateClient(input.platformBaseUrl, input.bearerToken, input.fetchImpl);
  return async (testRunId: string): Promise<V31PromotionSubmissionGate | null> => {
    let result;
    try {
      result = await client.readV31PromotionGate(testRunId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("V3.1 gate testRunId")) throw error;
      throw new V31GateUnavailableError(`V3.1 gate read failed: ${error instanceof Error ? error.name : "transport-error"}`);
    }
    if (result.status === 404) return null;
    if (result.status !== 200 || !result.body) throw new V31GateUnavailableError(`V3.1 gate read returned HTTP ${result.status}`);
    const value = result.body;
    if (value.schemaVersion !== "v3.1-promotion-gate-v1" || value.testRunId !== testRunId
      || !["PASS", "NOT_RUN"].includes(value.stageStatus)
      || !["ACCEPTED", "NOT_RUN"].includes(value.humanAcceptance)
      || !/^[a-f0-9]{64}$/u.test(value.evidenceSha256)) {
      throw new Error("V3.1 gate response does not match the exact-run contract");
    }
    return { testRunId: value.testRunId, stageStatus: value.stageStatus, humanAcceptance: value.humanAcceptance, evidenceSha256: value.evidenceSha256 };
  };
}
