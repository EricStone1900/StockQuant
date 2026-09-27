import { describe, expect, it, vi } from "vitest";
import { UnauthorizedException, ForbiddenException, ConflictException, NotFoundException } from "@nestjs/common";
import { V32AcceptanceController } from "../../src/bootstrap/app.module.js";

const id = "123e4567-e89b-42d3-a456-426614174010";
const sourceRunId = "123e4567-e89b-42d3-a456-426614174011";
function controller() {
  return new V32AcceptanceController({ quantResearchHeaders: () => ({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` }), portfolioHeaders: (extra = {}) => ({ ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` }), stageRuns: { find: vi.fn(async () => ({ testRunId: sourceRunId, stageId: "V3.1", scenarioId: "normal" })), getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED" })) } } as never);
}

describe("V3.2 read-only evidence proxy", () => {
  it("requires the local user session before calling Quant", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(controller().promotion(undefined, undefined, id)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().promotion("sq_session=other-user", undefined, id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("reads request detail and optional report with the Platform service credential", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ promotionRequestId: id, status: "AWAITING_INDEPENDENT_VALIDATION", request: { testRunId: sourceRunId } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ reportFingerprint: "abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await controller().promotion("sq_session=acceptance-owner-1", undefined, id);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1]?.headers).toEqual({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` });
    expect(result).toEqual({ request: { promotionRequestId: id, status: "AWAITING_INDEPENDENT_VALIDATION", request: { testRunId: sourceRunId } }, validationReport: { reportFingerprint: "abc" }, registryMutation: "NOT_PERFORMED", activation: "DISABLED_UNTIL_MANDATE", testRunId: sourceRunId });
    vi.unstubAllGlobals();
  });
});

describe("V3.2 exact-version owner decision", () => {
  const promotionId = "123e4567-e89b-42d3-a456-426614174020";
  const runId = "123e4567-e89b-42d3-a456-426614174021";
  const reportFingerprint = "a".repeat(64);
  const makeController = () => new V32AcceptanceController({
    quantResearchHeaders: () => ({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` }),
    stageRuns: {
      find: vi.fn(async () => ({ testRunId: runId, stageId: "V3.1", scenarioId: "normal" })),
      getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED" })),
    },
  } as never);

  it("requires user session before loading or mutating the PromotionRequest", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(makeController().decidePromotionVersion(undefined, undefined, promotionId, { decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION" })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("binds the decision to the owner's accepted V3.1 TestRun and persisted report fingerprint", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ request: { testRunId: runId } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ promotionRequestId: promotionId, reportFingerprint, report: { testRunId: runId } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ decision: "APPROVE", versionFingerprint: "b".repeat(64), activation: "DISABLED_UNTIL_MANDATE" }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const result = await makeController().decidePromotionVersion("sq_session=acceptance-owner-1", undefined, promotionId, { decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION" });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body))).toEqual({ schemaVersion: "v3.2-promotion-decision-command-v1", decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint, actorId: "acceptance-owner-1" });
    expect(result).toEqual({ schemaVersion: "v3.2-user-promotion-decision-result-v1", testRunId: runId, decision: { decision: "APPROVE", versionFingerprint: "b".repeat(64), activation: "DISABLED_UNTIL_MANDATE" } });
    vi.unstubAllGlobals();
  });

  it("refuses an owner without persisted exact-run V3.1 acceptance", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ request: { testRunId: runId } }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const subject = makeController();
    vi.spyOn((subject as never as { container: { stageRuns: { getV31PromotionGate: () => Promise<unknown> } } }).container.stageRuns, "getV31PromotionGate").mockResolvedValue({ stageStatus: "PASS", humanAcceptance: "NOT_RUN" });
    await expect(subject.decidePromotionVersion("sq_session=acceptance-owner-1", undefined, promotionId, { decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION" })).rejects.toBeInstanceOf(ConflictException);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not expose another owner's PromotionRequest or report", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ request: { testRunId: runId } }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const subject = new V32AcceptanceController({
      quantResearchHeaders: () => ({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` }),
      stageRuns: { find: vi.fn(async () => null) },
    } as never);
    await expect(subject.promotion("sq_session=acceptance-owner-1", undefined, promotionId)).rejects.toBeInstanceOf(NotFoundException);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("V3.2 candidate Mandate exact binding", () => {
  const runId = sourceRunId;
  const body = { schemaVersion: "v3.2-candidate-mandate-binding-command-v1", mandateId: "123e4567-e89b-42d3-a456-426614174032", testRunId: runId, ownerId: "acceptance-owner-1", accountId: "123e4567-e89b-42d3-a456-426614174033", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", strategyVersion: "a".repeat(64), candidateArtifact: { artifactId: "candidate-1", namespace: "research/run/outputs", sha256: "b".repeat(64) } };
  it("requires an owner session and persisted accepted source run before Governance lookup", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(controller().assessCandidateMandateBinding(undefined, undefined, body)).rejects.toBeInstanceOf(UnauthorizedException);
    const unaccepted = controller();
    vi.spyOn((unaccepted as never as { container: { stageRuns: { getV31PromotionGate: () => Promise<unknown> } } }).container.stageRuns, "getV31PromotionGate").mockResolvedValue({ stageStatus: "PASS", humanAcceptance: "NOT_RUN" });
    await expect(unaccepted.assessCandidateMandateBinding("sq_session=acceptance-owner-1", undefined, body)).rejects.toBeInstanceOf(ConflictException);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals(); vi.restoreAllMocks();
  });
  it("forwards only the authenticated owner's request to Governance and returns its read-only result", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW", reason: "APPROVED_VERSION_AND_CANDIDATE_ARTIFACT_MATCH", mandateId: body.mandateId, strategyVersion: body.strategyVersion, activation: "DISABLED_UNTIL_MANDATE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const subject = controller();
    await expect(subject.assessCandidateMandateBinding("sq_session=acceptance-owner-1", undefined, body)).resolves.toMatchObject({ status: "EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW", activation: "DISABLED_UNTIL_MANDATE" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(body);
    await expect(subject.assessCandidateMandateBinding("sq_session=acceptance-owner-1", undefined, { ...body, ownerId: "other-user" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
