import { describe, expect, it } from "vitest";
import { isAuthorizedPlatformApi, isProtectedPlatformApiRequest, loadMarketDataServiceTokens } from "../../src/service-auth.js";

const token = "market-data-platform-test-token-2026-09";
const tokens = loadMarketDataServiceTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token });

describe("Market Data internal minute-upload identity", () => {
  it("derives platform identity from its Bearer token and treats the service id as an optional consistency check", () => {
    expect(isAuthorizedPlatformApi({ serviceId: "platform-api-service", authorization: `Bearer ${token}`, tokens })).toBe(true);
    expect(isAuthorizedPlatformApi({ serviceId: undefined, authorization: `Bearer ${token}`, tokens })).toBe(true);
    expect(isAuthorizedPlatformApi({ serviceId: "platform-api-service", authorization: "Bearer forged", tokens })).toBe(false);
    expect(isAuthorizedPlatformApi({ serviceId: "runner-host", authorization: `Bearer ${token}`, tokens })).toBe(false);
    expect(isAuthorizedPlatformApi({ serviceId: undefined, authorization: undefined, tokens })).toBe(false);
    expect(() => loadMarketDataServiceTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "short" })).toThrow(/at least 32/u);
  });

  it("protects minute file writes, upload sessions, and persisted import reads", () => {
    for (const path of ["/v2/minute/import", "/v2/minute/csv/preview", "/v2/minute/csv/import", "/v2/minute/csv/uploads", "/v2/minute/csv/uploads/abc/chunks/0", "/v2/minute/parquet/uploads/abc/finalize", "/v2/minute/imports/v1", "/v2/minute/imports/v1/bars"]) {
      expect(isProtectedPlatformApiRequest("GET", path)).toBe(true);
    }
    for (const [method, path] of [["GET", "/v2/calendar/CN_A?date=2026-09-27"], ["GET", "/v2/quotes/snapshot"], ["POST", "/v2/collection-scheduler/enable"], ["POST", "/v2/collection-runs"], ["POST", "/v2/minute/backfills"], ["POST", "/__test/minute-import-gate"], ["GET", "/v2/minute/imports"], ["GET", "/v2/minute/imports/v1/other"]]) {
      expect(isProtectedPlatformApiRequest(method, path)).toBe(false);
    }
    for (const path of ["/v2/collection-scheduler/status", "/v2/collection-scheduler/plan?from=x", "/v2/collection/health?subscriptionId=sub", "/v2/collection-schedules", "/v2/collection-schedules/sub", "/v2/collection-runs", "/v2/collection-runs/run-id", "/v2/minute/gaps/sub", "/v2/minute/backfills", "/v2/minute/backfills/task-id", "/v2/minute/sources"]) expect(isProtectedPlatformApiRequest("GET", path.split("?", 1)[0])).toBe(true);
    expect(isProtectedPlatformApiRequest("GET", "/v2/alerts")).toBe(true);
    expect(isProtectedPlatformApiRequest("POST", "/v2/alerts/123e4567-e89b-42d3-a456-426614174000/acknowledge")).toBe(true);
    expect(isProtectedPlatformApiRequest("POST", "/v2/alerts/not-a-uuid/acknowledge")).toBe(false);
    expect(isProtectedPlatformApiRequest("GET", "/v2/minute/preview")).toBe(true);
    expect(isProtectedPlatformApiRequest("POST", "/v2/minute/quality")).toBe(true);
    expect(isProtectedPlatformApiRequest("POST", "/v2/minute/coverage")).toBe(true);
    for (const [method, path] of [["GET", "/v2/watchlist"], ["PUT", "/v2/watchlist"], ["GET", "/v2/sources"], ["GET", "/v2/sampling"], ["PUT", "/v2/sampling"], ["GET", "/v2/quote/preview"], ["GET", "/v2/news/preview"], ["GET", "/v2/news/live"], ["GET", "/v2/sources/smoke"], ["POST", "/v2/sources/tencent-quote/fail"]]) expect(isProtectedPlatformApiRequest(method, path)).toBe(true);
    expect(isProtectedPlatformApiRequest("POST", "/v2/watchlist")).toBe(true, "unsupported methods on a protected resource still require identity before 404");
  });

  it("protects both V1.2 fixed daily Fixture previews", () => {
    expect(isProtectedPlatformApiRequest("GET", "/v1/fixtures/normal/preview")).toBe(true);
    expect(isProtectedPlatformApiRequest("GET", "/v1/fixtures/bad-future/preview")).toBe(true);
    expect(isProtectedPlatformApiRequest("GET", "/v1/fixtures/research-preview")).toBe(true);
  });
});
