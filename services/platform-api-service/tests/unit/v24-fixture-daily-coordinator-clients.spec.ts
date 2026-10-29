import { describe, expect, it, vi } from "vitest";
import { createV24FixtureDailyCoordinator } from "../../src/adapters/v24-fixture-daily-coordinator-clients.js";
import { loadV24DailyDirectionFixture } from "../../src/adapters/v24-daily-direction-fixture.js";

describe("C5 isolated coordinator service clients", () => {
  it("uses the generated clients with the exact scoped inputs and does not issue order requests", async () => {
    const testRunId = "11111111-1111-4111-8111-111111111111";
    const scope = { ownerId: "owner", accountId: "22222222-2222-4222-8222-222222222222", namespace: `v24-paper-v2-${testRunId}`, testRunId };
    const token = "p".repeat(40); const fixture = await loadV24DailyDirectionFixture();
    const completions = fixture.input.bars.map((bar, i) => ({ status: "COMPLETED_FIXTURE", reason: null, completionId: `completion-${i}`, dataVersion: "test-v1", fixtureVersion: `test-${i}`, sessionDate: bar.sessionDate, sourceId: "fixture:daily", dataMode: "FIXTURE", scope: { market: "CN_A", ...scope }, availableAt: bar.availableAt, bars: [{ securityId: bar.securityId, sessionDate: bar.sessionDate, close: bar.close }] }));
    const request = vi.fn(async (value: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(value));
      if (url.pathname.startsWith("/v2/calendar/")) return Response.json({ date: url.pathname.split("/").at(-1), status: "TRADING", calendarVersion: "test-calendar" });
      const headers = options?.headers as Record<string, string>;
      expect(headers.authorization).toBe(`Bearer ${token}`); expect(headers["x-stockquant-service-id"]).toBe("platform-api-service");
      if (url.pathname === "/v2/daily-bars/completions/sessions") {
        expect(url.searchParams.getAll("sessionDate")).toEqual(["2026-10-14", "2026-10-15"]);
        expect(url.searchParams.get("testRunId")).toBe(testRunId);
        expect(url.searchParams.get("asOf")).toBe("2026-10-15T15:10:00+08:00");
        return Response.json({ completions });
      }
      if (url.pathname === `/internal/v1/accounts/${scope.accountId}/snapshot`) {
        expect(headers["x-stockquant-owner-id"]).toBe(scope.ownerId);
        return Response.json({ ...scope, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [] });
      }
      throw new Error(`Unexpected request ${url.pathname}`);
    });
    const targets = { save: vi.fn(async (target) => ({ target, created: true })), find: vi.fn(async () => null) };
    const coordinator = createV24FixtureDailyCoordinator({ marketDataUrl: "http://market.test", portfolioUrl: "http://portfolio.test", platformToken: token, targets, request: request as typeof fetch });
    const result = await coordinator.materialize({ scope, sourceId: "fixture:daily", dataVersion: "test-v1", asOf: "2026-10-15T15:10:00+08:00", evaluatedAt: "2026-10-16T09:31:00+08:00" });
    expect(result.target).toMatchObject({ clientOrderId: null, decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" }, dailyBarProvenance: { completionIds: ["completion-0", "completion-1"] } });
    expect(request).toHaveBeenCalledTimes(5);
    expect(request.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
});
