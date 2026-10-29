import { describe, expect, it, vi } from "vitest";
import { createV24LocalDailyCoordinator, loadV24LocalDailyFixture } from "../../src/adapters/v24-local-daily-coordinator-clients.js";

it("reads frozen scoped facts through service clients and never submits an order", async () => {
  const fixture = await loadV24LocalDailyFixture();
  const testRunId = "11111111-1111-4111-8111-111111111111";
  const scope = { ownerId: "owner", accountId: "22222222-2222-4222-8222-222222222222", namespace: `v24-paper-v2-${testRunId}`, testRunId };
  const token = "p".repeat(40); const mandateId = "33333333-3333-4333-8333-333333333333"; const contentHash = "a".repeat(64);
  const completions = fixture.sessions.slice(0, 2).map((bar, i) => ({ status: "COMPLETED_FIXTURE", dataMode: "FIXTURE", sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionId: `completion-${i}`, sessionDate: bar.date, availableAt: bar.availableAt, scope: { ...scope, market: "CN_A" }, bars: [{ securityId: "600000.SH", sessionDate: bar.date, close: bar.close }] }));
  const request = vi.fn(async (value: string | URL | Request, options?: RequestInit) => {
    const url = new URL(String(value)); const headers = options?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${token}`); expect(headers["x-stockquant-service-id"]).toBe("platform-api-service");
    expect(options?.method ?? "GET").toBe("GET");
    if (url.pathname === `/internal/v1/auto-mandates/${mandateId}/runs/${testRunId}`) {
      expect(headers["x-stockquant-owner-id"]).toBe(scope.ownerId);
      return Response.json({ mandateId, mandateVersion: 1, contentHash, ownerId: scope.ownerId, testRunId, accountId: scope.accountId, strategyVersion: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], status: "ACTIVE", validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00" });
    }
    if (url.pathname === `/internal/v1/accounts/${scope.accountId}/snapshot`) {
      expect(headers["x-stockquant-owner-id"]).toBe(scope.ownerId);
      return Response.json({ ...scope, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [] });
    }
    if (url.pathname === `/internal/v1/accounts/${scope.accountId}/sellable`) {
      expect(headers["x-stockquant-owner-id"]).toBe(scope.ownerId);
      expect(url.searchParams.get("asOf")).toBe("2024-01-04T09:31:00+08:00");
      return Response.json({ ...scope, security: "600000.SH", asOf: url.searchParams.get("asOf"), sellableQuantity: 0 });
    }
    if (url.pathname === "/v2/daily-bars/completions/sessions") {
      expect(url.searchParams.getAll("sessionDate")).toEqual(["2024-01-02", "2024-01-03"]);
      expect(url.searchParams.get("testRunId")).toBe(testRunId);
      return Response.json({ completions });
    }
    throw new Error(`Unexpected request ${url.pathname}`);
  });
  const targets = { save: vi.fn(async (target) => ({ target, created: true })), find: vi.fn(async () => null) };
  const coordinator = createV24LocalDailyCoordinator({ marketDataUrl: "http://market.test", portfolioUrl: "http://portfolio.test", governanceUrl: "http://governance.test", platformToken: token, targets, request: request as typeof fetch });
  const result = await coordinator.materialize({ scope, sessionDate: "2024-01-04", evaluatedAt: "2024-01-04T09:31:00+08:00", mandateId, mandateContentHash: contentHash });
  expect(result.target).toMatchObject({ decision: { action: "BUY", quantity: 100 }, dailyBarProvenance: { completionIds: ["completion-0", "completion-1"] } });
  expect(request).toHaveBeenCalledTimes(3);
  expect(request.mock.calls.some(([value]) => new URL(String(value)).pathname.endsWith("/sellable"))).toBe(false);
});
