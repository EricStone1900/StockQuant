import { describe, expect, it, vi } from "vitest";
import type { V32PromotionRequest } from "../../src/contracts/generated-types.js";
import { createQuantPromotionSubmitter, V32PromotionSubmissionService } from "../../src/application/v32-promotion-submission.js";

const request = {
  schemaVersion: "v3.2-promotion-request-v1",
  promotionRequestId: "11111111-1111-4111-8111-111111111111",
  testRunId: "22222222-2222-4222-8222-222222222222",
  experimentId: "33333333-3333-4333-8333-333333333333",
  candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate", namespace: "research/test/experiment/outputs", sha256: "a".repeat(64) },
  codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64),
  budget: { allocationId: "budget", currency: "USD", reservedMinor: 100, consumedMinor: 23 },
  idempotencyKey: "v32-test-idempotency-key",
} as V32PromotionRequest;
const prepared = { status: "READY_FOR_GATE_CHECK" as const, blockers: [] as [], promotionRequest: request };
const accepted = { testRunId: request.testRunId, stageStatus: "PASS" as const, humanAcceptance: "ACCEPTED" as const, evidenceSha256: "f".repeat(64) };
const freshJournal = () => ({
  begin: vi.fn(async () => ({ action: "SUBMIT" as const })),
  markSubmitted: vi.fn(async () => undefined),
  markUnknown: vi.fn(async () => undefined),
});

describe("V32PromotionSubmissionService", () => {
  it("does not call Quant when the authoritative V3.1 acceptance record is absent", async () => {
    const submitToQuant = vi.fn();
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => null, submitToQuant, journal: freshJournal() });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "WAITING", quantResult: null });
    expect(submitToQuant).not.toHaveBeenCalled();
  });

  it("requires exact-run stage PASS, human acceptance, and evidence hash before submission", async () => {
    const submitToQuant = vi.fn();
    const service = new V32PromotionSubmissionService({
      prepare: async () => prepared,
      getV31Gate: async () => ({ ...accepted, humanAcceptance: "NOT_RUN" }),
      submitToQuant,
      journal: freshJournal(),
    });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "WAITING" });
    expect(submitToQuant).not.toHaveBeenCalled();
  });

  it.each([
    ["failed stage", { ...accepted, stageStatus: "FAIL" as const }],
    ["rejected human acceptance", { ...accepted, humanAcceptance: "REJECTED" as const }],
    ["malformed evidence hash", { ...accepted, evidenceSha256: "not-a-sha256" }],
  ])("fails closed for %s", async (_reason, gate) => {
    const submitToQuant = vi.fn();
    const journal = freshJournal();
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => gate, submitToQuant, journal });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "WAITING" });
    expect(journal.begin).not.toHaveBeenCalled();
    expect(submitToQuant).not.toHaveBeenCalled();
  });

  it("rejects a gate record belonging to a different TestRun before opening the journal", async () => {
    const submitToQuant = vi.fn();
    const journal = freshJournal();
    const service = new V32PromotionSubmissionService({
      prepare: async () => prepared,
      getV31Gate: async () => ({ ...accepted, testRunId: "44444444-4444-4444-8444-444444444444" }),
      submitToQuant,
      journal,
    });
    await expect(service.submit(request.testRunId, request.experimentId)).rejects.toThrow(/different TestRun/u);
    expect(journal.begin).not.toHaveBeenCalled();
    expect(submitToQuant).not.toHaveBeenCalled();
  });

  it("submits the immutable payload only after the exact gate passes", async () => {
    const submitToQuant = vi.fn(async () => ({ status: "ACCEPTED" as const, promotionRequestId: request.promotionRequestId, testRunId: request.testRunId, quantStatus: "AWAITING_INDEPENDENT_VALIDATION" as const, idempotent: false }));
    const journal = freshJournal();
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => accepted, submitToQuant, journal });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "SUBMITTED", promotionRequestId: request.promotionRequestId });
    expect(submitToQuant).toHaveBeenCalledWith(request);
    expect(journal.markSubmitted).toHaveBeenCalledWith(request, expect.objectContaining({ status: "ACCEPTED" }));
  });

  it("preserves an ambiguous submission as UNKNOWN for exact-key reconciliation", async () => {
    const journal = freshJournal();
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => accepted, submitToQuant: async () => ({ status: "UNKNOWN", reason: "timeout" }), journal });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "SUBMISSION_UNKNOWN", idempotencyKey: request.idempotencyKey });
    expect(journal.markUnknown).toHaveBeenCalledWith(request, "timeout");
  });

  it("does not repeat a submission left in progress by a crash", async () => {
    const submitToQuant = vi.fn();
    const journal = { ...freshJournal(), begin: vi.fn(async () => ({ action: "RECONCILE" as const, state: "SUBMITTING" as const })) };
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => accepted, submitToQuant, journal });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "SUBMISSION_UNKNOWN" });
    expect(submitToQuant).not.toHaveBeenCalled();
  });

  it("replays a journaled successful state without another Quant request", async () => {
    const submitToQuant = vi.fn();
    const journal = { ...freshJournal(), begin: vi.fn(async () => ({ action: "EXISTING_SUBMISSION" as const, state: "SUBMITTED" as const, quantStatus: "AWAITING_INDEPENDENT_VALIDATION" as const })) };
    const service = new V32PromotionSubmissionService({ prepare: async () => prepared, getV31Gate: async () => accepted, submitToQuant, journal });
    await expect(service.submit(request.testRunId, request.experimentId)).resolves.toMatchObject({ status: "SUBMITTED", idempotent: true });
    expect(submitToQuant).not.toHaveBeenCalled();
  });
});

describe("createQuantPromotionSubmitter", () => {
  it("uses only the research Bearer and exact immutable request on POST", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${"r".repeat(40)}`);
      expect(new Headers(init?.headers).get("x-stockquant-service-id")).toBe("research-automation-service");
      expect(JSON.parse(String(init?.body))).toEqual(request);
      return Response.json({ schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: request.promotionRequestId, testRunId: request.testRunId, status: "AWAITING_INDEPENDENT_VALIDATION", createdAt: "2026-09-27T00:00:00.000Z", idempotent: true }, { status: 200 });
    });
    const submit = createQuantPromotionSubmitter({ baseUrl: "http://127.0.0.1:9001", bearerToken: "r".repeat(40), fetchImpl });
    await expect(submit(request)).resolves.toMatchObject({ status: "ACCEPTED", idempotent: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("never treats a mismatched or error response as a successful submission", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: request.promotionRequestId, testRunId: "44444444-4444-4444-8444-444444444444", status: "AWAITING_INDEPENDENT_VALIDATION", idempotent: false }, { status: 409 }));
    const submit = createQuantPromotionSubmitter({ baseUrl: "http://127.0.0.1:9001", bearerToken: "r".repeat(40), fetchImpl });
    await expect(submit(request)).resolves.toMatchObject({ status: "UNKNOWN" });
  });

  it("rejects credential-bearing URLs and weak service tokens", () => {
    expect(() => createQuantPromotionSubmitter({ baseUrl: "http://user:pass@127.0.0.1:9001", bearerToken: "r".repeat(40) })).toThrow(/base URL/u);
    expect(() => createQuantPromotionSubmitter({ baseUrl: "http://127.0.0.1:9001", bearerToken: "short" })).toThrow(/Bearer token/u);
  });
});
