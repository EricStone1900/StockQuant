import type { V31PromotionSubmissionGate } from "./v32-promotion-submission.js";

export class V31GateUnavailableError extends Error {}

export function createV31PromotionGateReader(input: {
  platformBaseUrl: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
}) {
  const base = new URL(input.platformBaseUrl);
  if (!/^https?:$/u.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("Platform API base URL must be an HTTP(S) origin/path without credentials, query, or fragment");
  if (input.bearerToken.length < 32 || !/^[A-Za-z0-9_-]+$/u.test(input.bearerToken)) throw new Error("Research Automation service Bearer token is invalid");
  const fetchImpl = input.fetchImpl ?? fetch;
  return async (testRunId: string): Promise<V31PromotionSubmissionGate | null> => {
    const endpoint = new URL(`/internal/v1/acceptance/v3/v3.1/gate/${encodeURIComponent(testRunId)}`, base);
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: "GET", redirect: "error", signal: AbortSignal.timeout(3_000),
        headers: { authorization: `Bearer ${input.bearerToken}`, "x-stockquant-service-id": "research-automation-service" },
      });
    } catch (error) {
      throw new V31GateUnavailableError(`V3.1 gate read failed: ${error instanceof Error ? error.name : "transport-error"}`);
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new V31GateUnavailableError(`V3.1 gate read returned HTTP ${response.status}`);
    const body: unknown = await response.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("V3.1 gate response is invalid JSON");
    const value = body as Record<string, unknown>;
    if (value.schemaVersion !== "v3.1-promotion-gate-v1" || value.testRunId !== testRunId
      || !["PASS", "NOT_RUN"].includes(String(value.stageStatus))
      || !["ACCEPTED", "NOT_RUN"].includes(String(value.humanAcceptance))
      || typeof value.evidenceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.evidenceSha256)) {
      throw new Error("V3.1 gate response does not match the exact-run contract");
    }
    return { testRunId, stageStatus: value.stageStatus as "PASS" | "NOT_RUN", humanAcceptance: value.humanAcceptance as "ACCEPTED" | "NOT_RUN", evidenceSha256: value.evidenceSha256 };
  };
}
