import { describe, expect, it, vi } from "vitest";
import { GovernanceApi } from "../../src/application/governance-api.js";
import type { GovernanceTokens } from "../../src/application/service-auth.js";
import type { ApprovedRegistryClient } from "../../src/ports/approved-registry-client.js";
import type { ExecutionAuthorizationRepository } from "../../src/ports/execution-authorization-repository.js";
import type { ProposalRepository } from "../../src/ports/proposal-repository.js";
import type { AutoMandateRepository } from "../../src/ports/auto-mandate-repository.js";
import type { StrategySnapshotInput, StrategySnapshotRepository } from "../../src/ports/strategy-snapshot-repository.js";

const tokens: GovernanceTokens = {
  "historical-replay-worker": "h".repeat(48),
  "trade-execution-service": "t".repeat(48),
  "platform-api-service": "p".repeat(48),
};

function repository() {
  return {
    ready: vi.fn(async () => undefined),
    grantPaper: vi.fn(async () => null),
    revokePaper: vi.fn(async () => ({ status: "NOT_FOUND" as const })),
    validatePaper: vi.fn(async () => "INVALID" as const),
    grantReplay: vi.fn(async ({ authorizationId }: { authorizationId: string }) => authorizationId),
    validateReplay: vi.fn(async () => "VALID" as const),
  } satisfies ExecutionAuthorizationRepository;
}

const registry: ApprovedRegistryClient = { getApprovedPromotionRegistryVersion: vi.fn(async () => ({ status: 503 })) };

describe("Decision Governance application boundary", () => {
  it("receives immutable V1.2 strategy snapshots idempotently without creating proposals or orders", async () => {
    let saved: StrategySnapshotInput | undefined;
    const snapshots: StrategySnapshotRepository = {
      receive: vi.fn(async (input) => {
        if (saved && JSON.stringify(saved) !== JSON.stringify(input)) throw new Error("STRATEGY_SNAPSHOT_IDEMPOTENCY_CONFLICT");
        const replayed = Boolean(saved); saved ??= input;
        return { ...input, snapshotId: "d8c1d600-22f6-44ab-9c2f-5581462d90a9", status: "RECEIVED", receivedAt: "2026-10-07T00:00:00.000Z", replayed };
      }),
      find: vi.fn(async () => null),
    };
    const proposals = { create: vi.fn() } as unknown as ProposalRepository;
    const api = new GovernanceApi(repository(), tokens, registry, proposals, undefined, snapshots);
    const headers = { serviceId: "platform-api-service", authorization: `Bearer ${tokens["platform-api-service"]}` };
    const snapshot = { ownerId: "owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", artifactId: "sha256:artifact-1", artifactSha256: "a".repeat(64), fixtureVersion: "v1.2-market-data-4", dataVersion: "v1.2-market-data-4", factorVersion: "v1.2-momentum-volume-1", strategyId: "v1.2-qlib-topk-1", strategyHash: "b".repeat(64), mode: "TOPK", asOf: "2026-10-06", targets: [{ ticker: "600000.SH", market: "CN_A", currency: "CNY", reason: "fixed top rank" }] };
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", ...headers, rawBody: JSON.stringify(snapshot) })).toMatchObject({ status: 201, body: { status: "RECEIVED", replayed: false } });
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", ...headers, rawBody: JSON.stringify(snapshot) })).toMatchObject({ status: 200, body: { status: "RECEIVED", replayed: true } });
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", ...headers, rawBody: JSON.stringify({ ...snapshot, strategyHash: "c".repeat(64) }) })).toMatchObject({ status: 409 });
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", serviceId: "quant-research-service", authorization: `Bearer ${tokens["platform-api-service"]}`, rawBody: JSON.stringify(snapshot) })).toMatchObject({ status: 403 });
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", ...headers, rawBody: JSON.stringify({ ...snapshot, mode: "NO_TRADE" }) })).toMatchObject({ status: 422 });
    expect(await api.handle({ method: "POST", pathname: "/internal/v1/v12/strategy-snapshots", ...headers, rawBody: JSON.stringify({ ...snapshot, strategyId: "unknown-strategy-v99" }) })).toMatchObject({ status: 422 });
    expect(snapshots.receive).toHaveBeenCalledTimes(3);
    expect(proposals.create).not.toHaveBeenCalled();
  });

  it("limits AUTO Mandate create/activate to Platform and budget authorization to Trade", async () => {
    const mandates: AutoMandateRepository = {
      create: vi.fn(async (input, actorId) => ({ status: "PENDING", mandateId: input.mandateId, mandateVersion: input.mandateVersion, contentHash: "a".repeat(64) })),
      activate: vi.fn(async (input) => ({ status: "ACTIVE", mandateId: input.mandateId, mandateVersion: input.mandateVersion, contentHash: input.contentHash })),
      pause: vi.fn(async () => true),
      authorizeOrder: vi.fn(async (input) => ({ decision: { status: "AUTHORIZED" as const, mandateId: input.mandateId, mandateVersion: input.mandateVersion, proposalId: input.proposal.proposalId, proposalVersion: input.proposal.proposalVersion, contentHash: input.proposal.contentHash, reservedAmount: "500.00", orderCount: 1 }, reservationId: "d8c1d600-22f6-44ab-9c2f-5581462d90a5", replayed: false })),
      settleReservation: vi.fn(async () => true),
    };
    const persistedProposal = { proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "b".repeat(64), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", ownerId: "owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", market: "CN_A", currency: "CNY", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] };
    const proposals = { find: vi.fn(async () => persistedProposal) } as unknown as ProposalRepository;
    const api = new GovernanceApi(repository(), tokens, registry, proposals, mandates);
    const platform = { serviceId: "platform-api-service", authorization: `Bearer ${tokens["platform-api-service"]}`, ownerId: "owner-1", actorId: "owner-1" };
    const created = await api.handle({ method: "POST", pathname: "/internal/v1/auto-mandates", ...platform, rawBody: JSON.stringify({ mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1, testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1000.00", maxTotalAmount: "2000.00", maxOrderCount: 2, validFrom: "2026-10-07T09:00:00Z", expiresAt: "2026-10-07T15:00:00Z", reason: "test mandate", now: "2026-10-07T09:00:00Z" }) });
    expect(created).toMatchObject({ status: 201, body: { status: "PENDING", mandateVersion: 1 } });
    const mandateId = String((created.body as any).mandateId);
    const activated = await api.handle({ method: "POST", pathname: `/internal/v1/auto-mandates/${mandateId}/activate`, ...platform, rawBody: JSON.stringify({ mandateVersion: 1, testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", contentHash: "a".repeat(64), reason: "approve exact version", now: "2026-10-07T09:00:00Z" }) });
    expect(activated).toMatchObject({ status: 200, body: { status: "ACTIVE" } });
    const proposal = { proposalId: persistedProposal.proposalId, proposalVersion: persistedProposal.proposalVersion, contentHash: persistedProposal.contentHash, ownerId: persistedProposal.ownerId, testRunId: persistedProposal.testRunId, accountId: persistedProposal.accountId, strategyVersion: persistedProposal.strategyVersion, operation: persistedProposal.operation, market: persistedProposal.market, currency: persistedProposal.currency, legs: [{ securityId: "600000.SH", side: "BUY", quantity: 100, limitPrice: "10.00" }] };
    const authzPath = `/internal/v1/auto-mandates/${mandateId}/orders/authorize`;
    const command = { mandateVersion: 1, ownerId: "owner-1", clientOrderId: "auto-order-1", commandHash: "c".repeat(64), proposal, now: "2026-10-07T10:00:00Z" };
    const forged = await api.handle({ method: "POST", pathname: authzPath, ...platform, rawBody: JSON.stringify(command) });
    expect(forged.status).toBe(403);
    const stale = await api.handle({ method: "POST", pathname: authzPath, serviceId: "trade-execution-service", authorization: `Bearer ${tokens["trade-execution-service"]}`, rawBody: JSON.stringify({ ...command, proposal: { ...proposal, proposalVersion: 2 } }) });
    expect(stale.status).toBe(409);
    const authorized = await api.handle({ method: "POST", pathname: authzPath, serviceId: "trade-execution-service", authorization: `Bearer ${tokens["trade-execution-service"]}`, rawBody: JSON.stringify(command) });
    expect(authorized).toMatchObject({ status: 200, body: { decision: { status: "AUTHORIZED" }, reservationId: "d8c1d600-22f6-44ab-9c2f-5581462d90a5" } });
    expect(mandates.authorizeOrder).toHaveBeenCalledOnce();
  });
  it("rejects a forged service identity before reaching the repository", async () => {
    const repo = repository();
    const api = new GovernanceApi(repo, tokens, registry);
    const result = await api.handle({ method: "POST", pathname: "/internal/v1/authorizations", serviceId: "historical-replay-worker", authorization: `Bearer ${"x".repeat(48)}`, rawBody: "{}" });
    expect(result).toEqual({ status: 403, body: { error: "service identity or route scope is not allowed" } });
    expect(repo.grantReplay).not.toHaveBeenCalled();
  });

  it("keeps Replay authorization restricted to BACKTEST/FAKE", async () => {
    const repo = repository();
    const api = new GovernanceApi(repo, tokens, registry);
    const headers = { serviceId: "historical-replay-worker", authorization: `Bearer ${tokens["historical-replay-worker"]}` };
    const denied = await api.handle({ method: "POST", pathname: "/internal/v1/authorizations", ...headers, rawBody: JSON.stringify({ environmentMode: "PAPER", brokerMode: "FAKE" }) });
    expect(denied.status).toBe(422);
    expect(repo.grantReplay).not.toHaveBeenCalled();
    const allowed = await api.handle({ method: "POST", pathname: "/internal/v1/authorizations", ...headers, rawBody: JSON.stringify({ namespace: "fixture-run", accountId: "account", environmentMode: "BACKTEST", brokerMode: "FAKE", command: { event: 1 } }) });
    expect(allowed).toEqual({ status: 200, body: { authorizationId: expect.any(String) } });
    expect(repo.grantReplay).toHaveBeenCalledOnce();
  });

  it("preserves first-consumption and idempotent replay semantics through the port", async () => {
    const repo = repository();
    repo.validateReplay.mockResolvedValueOnce("VALID").mockResolvedValueOnce("REPLAYED");
    const api = new GovernanceApi(repo, tokens, registry);
    const request = { method: "POST", pathname: "/internal/v1/authorizations/validate", serviceId: "trade-execution-service", authorization: `Bearer ${tokens["trade-execution-service"]}`, rawBody: JSON.stringify({ authorizationId: "id", accountId: "account", command: { value: 1 } }) };
    expect(await api.handle(request)).toEqual({ status: 200, body: { valid: true, replayed: false } });
    expect(await api.handle(request)).toEqual({ status: 200, body: { valid: true, replayed: true } });
  });

  it("persists a PAPER/FAKE proposal through the platform-only boundary and binds approval to the trusted actor and exact version", async () => {
    const repo = repository();
    const proposals: ProposalRepository = {
      create: vi.fn(async (input) => ({ proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "a".repeat(64), status: "MANUAL_APPROVAL_PENDING", operation: input.operation, environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: input.expiresAt, legs: input.legs, ownerId: input.ownerId, testRunId: input.testRunId, accountId: input.accountId, strategyVersion: input.strategyVersion, replayed: false })),
      find: vi.fn(async () => null),
      decide: vi.fn(async (input) => ({ status: "APPROVED_MANUAL" as const, proposalId: input.proposalId, proposalVersion: input.expectedVersion, contentHash: input.expectedContentHash, decidedBy: input.actorId, reason: input.reason })),
      revise: vi.fn(async (input) => ({ status: "MANUAL_APPROVAL_PENDING" as const, proposalId: input.proposalId, proposalVersion: input.expectedVersion + 1, contentHash: "c".repeat(64), revisedBy: input.actorId, reason: input.reason })),
      grantExecution: vi.fn(async (input) => ({ authorizationId: "a1bf4b1a-bd5c-46cf-963a-8318a1155848", expiresAt: "2026-10-07T00:05:00.000Z", replayed: false })),
      validateExecution: vi.fn(async () => "VALID" as const),
    };
    const api = new GovernanceApi(repo, tokens, registry, proposals);
    const headers = { serviceId: "platform-api-service", authorization: `Bearer ${tokens["platform-api-service"]}` };
    const payload = { ownerId: "acceptance-owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-manual-v1", idempotencyKey: "proposal-1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: "2026-10-08T00:00:00Z", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] };
    expect((await api.handle({ method: "POST", pathname: "/internal/v1/proposals", ...headers, rawBody: JSON.stringify(payload) })).status).toBe(201);
    const rejectedModes = [["LIVE", "FAKE"], ["PAPER", "REAL"], ["LIVE", "REAL"]] as const;
    for (const [environmentMode, brokerMode] of rejectedModes) {
      const rejected = await api.handle({ method: "POST", pathname: "/internal/v1/proposals", ...headers, rawBody: JSON.stringify({ ...payload, idempotencyKey: `rejected-${environmentMode}-${brokerMode}`, environmentMode, brokerMode }) });
      expect(rejected.status).toBe(422);
    }
    expect(proposals.create).toHaveBeenCalledOnce();
    const revisionBody = { expectedVersion: 1, expectedContentHash: "a".repeat(64), operation: "REBALANCE", expiresAt: "2026-10-08T00:00:00Z", legs: payload.legs, reason: "correct sizing", now: "2026-10-07T00:00:00Z" };
    const revisionNoOwner = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/revise", ...headers, actorId: "owner-from-platform-session", rawBody: JSON.stringify(revisionBody) });
    expect(revisionNoOwner.status).toBe(403);
    const revised = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/revise", ...headers, actorId: "owner-from-platform-session", ownerId: payload.ownerId, rawBody: JSON.stringify(revisionBody) });
    expect(revised).toMatchObject({ status: 200, body: { proposalVersion: 2, status: "MANUAL_APPROVAL_PENDING" } });
    expect(proposals.revise).toHaveBeenCalledWith(expect.objectContaining({ ownerId: payload.ownerId, actorId: "owner-from-platform-session", expectedVersion: 1 }));
    const noActor = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/approve", ...headers, rawBody: JSON.stringify({ expectedVersion: 1, expectedContentHash: "a".repeat(64), reason: "reviewed", now: "2026-10-07T00:00:00Z" }) });
    expect(noActor.status).toBe(403);
    const approved = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/approve", ...headers, actorId: "owner-from-platform-session", rawBody: JSON.stringify({ expectedVersion: 1, expectedContentHash: "a".repeat(64), reason: "reviewed", now: "2026-10-07T00:00:00Z" }) });
    expect(approved).toMatchObject({ status: 200, body: { status: "APPROVED_MANUAL", decidedBy: "owner-from-platform-session" } });
    expect(proposals.decide).toHaveBeenCalledWith(expect.objectContaining({ actorId: "owner-from-platform-session", expectedVersion: 1 }));
    const execution = { proposalVersion: 1, contentHash: "a".repeat(64), ownerId: payload.ownerId, testRunId: payload.testRunId, accountId: payload.accountId, clientOrderId: "l01-order", commandHash: "b".repeat(64), now: "2026-10-07T00:00:00Z" };
    const tradeHeaders = { serviceId: "trade-execution-service", authorization: `Bearer ${tokens["trade-execution-service"]}` };
    const grant = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/execution-authorizations", ...tradeHeaders, rawBody: JSON.stringify(execution) });
    expect(grant).toMatchObject({ status: 200, body: { status: "ACTIVE", proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", clientOrderId: "l01-order" } });
    expect(proposals.grantExecution).toHaveBeenCalledWith(expect.objectContaining({ clientOrderId: "l01-order", proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3" }));
    const platformGrant = await api.handle({ method: "POST", pathname: "/internal/v1/proposals/d8c1d600-22f6-44ab-9c2f-5581462d90a3/execution-authorizations", ...headers, rawBody: JSON.stringify(execution) });
    expect(platformGrant.status).toBe(403);
    expect(proposals.grantExecution).toHaveBeenCalledOnce();
  });
});
