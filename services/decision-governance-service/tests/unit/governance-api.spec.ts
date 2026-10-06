import { describe, expect, it, vi } from "vitest";
import { GovernanceApi } from "../../src/application/governance-api.js";
import type { GovernanceTokens } from "../../src/application/service-auth.js";
import type { ApprovedRegistryClient } from "../../src/ports/approved-registry-client.js";
import type { ExecutionAuthorizationRepository } from "../../src/ports/execution-authorization-repository.js";

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
});
