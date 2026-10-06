import type { V32PromotionRequest } from "../contracts/generated-types.js";
import { GeneratedQuantPromotionSubmitClient } from "../contracts/generated-quant-promotion-submit-client.js";
import type { V32PromotionPreparationResult } from "./v32-promotion-preparation.js";

export type V32PromotionSubmissionJournalPort = {
  getSubmittedRequest(promotionRequestId: string): Promise<V32PromotionRequest | null>;
  begin(request: V32PromotionRequest, gateEvidenceSha256: string): Promise<
    | { action: "SUBMIT" }
    | { action: "EXISTING_SUBMISSION"; state: "SUBMITTED"; quantStatus: "AWAITING_INDEPENDENT_VALIDATION" }
    | { action: "RECONCILE"; state: "SUBMITTING" | "UNKNOWN" }
  >;
  markSubmitted(request: V32PromotionRequest, response: { promotionRequestId: string; testRunId: string; quantStatus: "AWAITING_INDEPENDENT_VALIDATION"; idempotent: boolean }): Promise<void>;
  markUnknown(request: V32PromotionRequest, reason: string): Promise<void>;
};

export type V31PromotionSubmissionGate = {
  testRunId: string;
  stageStatus: "PASS" | "NOT_RUN" | "FAIL";
  humanAcceptance: "ACCEPTED" | "NOT_RUN" | "REJECTED";
  evidenceSha256: string;
};

export type V32PromotionSubmissionResult =
  | { status: "WAITING"; blockers: string[]; quantResult: null }
  | { status: "SUBMITTED"; promotionRequestId: string; quantStatus: "AWAITING_INDEPENDENT_VALIDATION"; idempotent: boolean }
  | { status: "SUBMISSION_UNKNOWN"; promotionRequestId: string; idempotencyKey: string; reason: string };

const SHA256 = /^[a-f0-9]{64}$/;

/**
 * Submit only after an authoritative V3.1 stage PASS and explicit human acceptance
 * for the same TestRun. Gate retrieval is an injected trusted platform port; callers
 * cannot assert acceptance through the public preparation route.
 */
export class V32PromotionSubmissionService {
  constructor(private readonly ports: {
    prepare(testRunId: string, experimentId: string): Promise<V32PromotionPreparationResult>;
    getV31Gate(testRunId: string): Promise<V31PromotionSubmissionGate | null>;
    journal: V32PromotionSubmissionJournalPort;
    submitToQuant(request: V32PromotionRequest): Promise<
      | { status: "ACCEPTED"; promotionRequestId: string; testRunId: string; quantStatus: "AWAITING_INDEPENDENT_VALIDATION"; idempotent: boolean }
      | { status: "UNKNOWN"; reason: string }
    >;
  }) {}

  async submit(testRunId: string, experimentId: string): Promise<V32PromotionSubmissionResult> {
    const prepared = await this.ports.prepare(testRunId, experimentId);
    if (prepared.status !== "READY_FOR_GATE_CHECK") return { status: "WAITING", blockers: prepared.blockers, quantResult: null };

    const gate = await this.ports.getV31Gate(testRunId);
    if (!gate) return { status: "WAITING", blockers: ["authoritative V3.1 acceptance record is unavailable"], quantResult: null };
    if (gate.testRunId !== testRunId) throw new Error("V3.1 acceptance record is scoped to a different TestRun");
    if (gate.stageStatus !== "PASS" || gate.humanAcceptance !== "ACCEPTED" || !SHA256.test(gate.evidenceSha256)) {
      return { status: "WAITING", blockers: ["V3.1 stage PASS, exact TestRun human acceptance, and evidence hash are required"], quantResult: null };
    }

    const journal = await this.ports.journal.begin(prepared.promotionRequest, gate.evidenceSha256);
    if (journal.action === "EXISTING_SUBMISSION") return {
      status: "SUBMITTED",
      promotionRequestId: prepared.promotionRequest.promotionRequestId,
      quantStatus: journal.quantStatus,
      idempotent: true,
    };
    if (journal.action === "RECONCILE") return {
      status: "SUBMISSION_UNKNOWN",
      promotionRequestId: prepared.promotionRequest.promotionRequestId,
      idempotencyKey: prepared.promotionRequest.idempotencyKey,
      reason: `prior submission is ${journal.state}; exact-key reconciliation is required before any retry`,
    };
    try {
      const response = await this.ports.submitToQuant(prepared.promotionRequest);
      if (response.status === "UNKNOWN") {
        await this.ports.journal.markUnknown(prepared.promotionRequest, response.reason);
        return {
          status: "SUBMISSION_UNKNOWN",
          promotionRequestId: prepared.promotionRequest.promotionRequestId,
          idempotencyKey: prepared.promotionRequest.idempotencyKey,
          reason: response.reason,
        };
      }
      if (response.promotionRequestId !== prepared.promotionRequest.promotionRequestId || response.testRunId !== testRunId || response.quantStatus !== "AWAITING_INDEPENDENT_VALIDATION") {
        await this.ports.journal.markUnknown(prepared.promotionRequest, "quant-response-mismatch");
        throw new Error("Quant response does not match the submitted immutable PromotionRequest");
      }
      await this.ports.journal.markSubmitted(prepared.promotionRequest, response);
      return {
        status: "SUBMITTED",
        promotionRequestId: response.promotionRequestId,
        quantStatus: response.quantStatus,
        idempotent: response.idempotent,
      };
    } catch (error) {
      await this.ports.journal.markUnknown(prepared.promotionRequest, "submission-operation-failed").catch(() => undefined);
      throw error;
    }
  }
}

/** Bounded, fail-closed OpenAPI adapter. Ambiguous outcomes are surfaced for exact-key reconciliation, never blindly retried. */
export function createQuantPromotionSubmitter(input: {
  baseUrl: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const timeoutMs = input.timeoutMs ?? 5_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error("Quant submission timeout must be between 100 and 30000 ms");
  const client = new GeneratedQuantPromotionSubmitClient(input.baseUrl, input.bearerToken, input.fetchImpl ?? fetch);

  return async (request: V32PromotionRequest) => {
    try {
      const response = await client.submitPromotionRequest(request, timeoutMs);
      if (response.promotionRequestId !== request.promotionRequestId || response.testRunId !== request.testRunId) {
        return { status: "UNKNOWN" as const, reason: "quant-response-binding-mismatch" };
      }
      return {
        status: "ACCEPTED" as const,
        promotionRequestId: response.promotionRequestId,
        testRunId: response.testRunId,
        quantStatus: "AWAITING_INDEPENDENT_VALIDATION" as const,
        idempotent: response.idempotent,
      };
    } catch (error) {
      return { status: "UNKNOWN" as const, reason: error instanceof Error ? error.name : "transport-error" };
    }
  };
}
