import { describe, expect, it } from "vitest";
import { authorizeGovernanceRequest, loadGovernanceTokens } from "../../src/service-auth.js";

const tokens = loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40) });
const platformTokens = loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) });
const allowed = (method: string, pathname: string, caller: string, token: string) => authorizeGovernanceRequest({ method, pathname, serviceId: caller, authorization: `Bearer ${token}`, tokens });

describe("governance service Bearer scopes", () => {
  it("requires two distinct strong service tokens", () => {
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "short", STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40) })).toThrow();
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "x".repeat(40) })).toThrow("must be distinct");
  });
  it("allows replay to request and execution to consume authorization", () => {
    expect(allowed("POST", "/internal/v1/authorizations", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(true);
    expect(allowed("POST", "/internal/v1/authorizations/validate", "trade-execution-service", tokens["trade-execution-service"])).toBe(true);
    expect(allowed("POST", "/internal/v1/authorizations", "trade-execution-service", tokens["trade-execution-service"])).toBe(false);
    expect(allowed("POST", "/internal/v1/authorizations/validate", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
  });
  it("rejects missing and forged identities", () => {
    expect(authorizeGovernanceRequest({ method: "POST", pathname: "/internal/v1/authorizations", serviceId: "historical-replay-worker", authorization: undefined, tokens })).toBe(false);
    expect(allowed("POST", "/internal/v1/authorizations", "historical-replay-worker", "q".repeat(40))).toBe(false);
    expect(authorizeGovernanceRequest({ method: "POST", pathname: "/internal/v1/authorizations", serviceId: "historical-replay-worker", authorization: "Bearer short", tokens })).toBe(false);
    expect(allowed("POST", "/internal/v1/authorizations", "forged", tokens["historical-replay-worker"])).toBe(false);
  });
  it("allows Platform API only to request candidate binding readiness", () => {
    const path = "/internal/v1/candidate-mandates/readiness";
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: platformTokens })).toBe(true);
    expect(authorizeGovernanceRequest({ method: "GET", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: platformTokens })).toBe(false);
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens })).toBe(false);
    expect(allowed("POST", path, "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "r".repeat(40) })).toThrow("must be distinct");
  });
});
