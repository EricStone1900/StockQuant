import { describe, expect, it } from "vitest";
import { authorizeTradeExecutionRequest, loadTradeExecutionServiceTokens } from "../../src/service-auth.js";

const tokens = loadTradeExecutionServiceTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) });
const request = (method: string, pathname: string, serviceId: string | undefined, token: string | undefined) => authorizeTradeExecutionRequest({ method, pathname, serviceId, authorization: token ? `Bearer ${token}` : undefined, tokens });

describe("trade execution service identity and route scopes", () => {
  it("requires distinct sufficiently strong caller credentials", () => {
    expect(() => loadTradeExecutionServiceTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "short", STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) })).toThrow();
    expect(() => loadTradeExecutionServiceTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "x".repeat(40) })).toThrow("must be distinct");
  });
  it("rejects missing, forged, mismatched and unknown identities", () => {
    expect(request("POST", "/internal/v1/historical-orders/execute", "historical-replay-worker", undefined)).toBe(false);
    expect(request("POST", "/internal/v1/historical-orders/execute", "platform-api-service", tokens["historical-replay-worker"])).toBe(false);
    expect(request("GET", "/internal/v1/orders/o1", "forged", tokens["platform-api-service"])).toBe(false);
  });
  it("allows only the replay service to execute governed historical commands", () => {
    expect(request("POST", "/internal/v1/historical-orders/execute", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(true);
    expect(request("POST", "/internal/v1/historical-orders/execute", "platform-api-service", tokens["platform-api-service"])).toBe(false);
  });
  it("scopes operational routes to platform and read routes to authenticated callers", () => {
    expect(request("GET", "/internal/v1/reconciliation/summary", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/orders/o1/cancel", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/orders/o1/cancel", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("GET", "/internal/v1/reconciliation/summary", "platform-api-service", undefined)).toBe(false);
  });
  it("allows the platform API to read readiness but rejects replay and write verbs", () => {
    expect(request("GET", "/internal/v1/v24/paper-readiness", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("GET", "/internal/v1/v24/paper-readiness", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/v24/paper-readiness", "platform-api-service", tokens["platform-api-service"])).toBe(false);
  });
});
