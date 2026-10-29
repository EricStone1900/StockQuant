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
  it("exhaustively scopes every V1 protected write route to its intended caller", () => {
    const routes = [
      ["POST", "/internal/v1/historical-orders/execute", "historical-replay-worker"],
      ["POST", "/internal/v1/c5-local/paper-orders/execute", "platform-api-service"],
      ["POST", "/internal/v1/c5-local/accounts/settlements", "platform-api-service"],
      ["POST", "/internal/v1/v13/paper-orders/execute-manual-proposal", "platform-api-service"],
      ["POST", "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", "platform-api-service"],
      ["POST", "/internal/v1/v13/paper-orders/execute-auto-proposal", "platform-api-service"],
      ["POST", "/internal/v1/v13/accounts/settlements", "platform-api-service"],
      ["POST", "/internal/v1/fake-broker/external-orders", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/cancel", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/cancel-result", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/expire", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/unknown", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/simulated-fill-reports", "platform-api-service"],
      ["POST", "/internal/v1/orders/o1/fills/f1/fee-corrections", "platform-api-service"],
      ["POST", "/internal/v1/outbox/e1/compensate", "platform-api-service"],
    ] as const;

    for (const [method, pathname, allowedCaller] of routes) {
      const deniedCaller = allowedCaller === "platform-api-service" ? "historical-replay-worker" : "platform-api-service";
      expect(request(method, pathname, allowedCaller, tokens[allowedCaller]), `${method} ${pathname} should allow ${allowedCaller}`).toBe(true);
      expect(request(method, pathname, deniedCaller, tokens[deniedCaller]), `${method} ${pathname} should reject ${deniedCaller}`).toBe(false);
      expect(request(method, pathname, allowedCaller, tokens[deniedCaller]), `${method} ${pathname} should reject a mismatched credential`).toBe(false);
      expect(request(method, pathname, undefined, undefined), `${method} ${pathname} should reject an anonymous caller`).toBe(false);
    }
  });
  it("scopes UNKNOWN recovery reads to the replay-only historical route", () => {
    expect(request("GET", "/internal/v1/historical-orders/o1", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(true);
    expect(request("GET", "/internal/v1/historical-orders/o1", "platform-api-service", tokens["platform-api-service"])).toBe(false);
    expect(request("GET", "/internal/v1/orders/o1", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("GET", "/internal/v1/orders/o1", "platform-api-service", tokens["platform-api-service"])).toBe(true);
  });
  it("scopes operational routes to platform and read routes to authenticated callers", () => {
    expect(request("GET", "/internal/v1/reconciliation/summary", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/orders/o1/cancel", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/orders/o1/cancel", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/orders/o1/cancel-result", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/orders/o1/cancel-result", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/orders/o1/fills/f1/fee-corrections", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/orders/o1/fills/f1/fee-corrections", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/orders/o1/simulated-fill-reports", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/orders/o1/simulated-fill-reports", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/fake-broker/external-orders", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("POST", "/internal/v1/fake-broker/external-orders", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("GET", "/internal/v1/reconciliation/summary", "platform-api-service", undefined)).toBe(false);
  });
  it("allows the platform API to read readiness but rejects replay and write verbs", () => {
    expect(request("GET", "/internal/v1/v24/paper-readiness", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("GET", "/internal/v1/v24/paper-readiness", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/v24/paper-readiness", "platform-api-service", tokens["platform-api-service"])).toBe(false);
  });
  it("allows scoped in-flight order reads only for the authenticated platform API", () => {
    expect(request("GET", "/internal/v1/accounts/a1/in-flight-orders", "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(request("GET", "/internal/v1/accounts/a1/in-flight-orders", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(request("POST", "/internal/v1/accounts/a1/in-flight-orders", "platform-api-service", tokens["platform-api-service"])).toBe(false);
    expect(request("GET", "/internal/v1/accounts/a1/in-flight-orders/other", "platform-api-service", tokens["platform-api-service"])).toBe(false);
  });
});
