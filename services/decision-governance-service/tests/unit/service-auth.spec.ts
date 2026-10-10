import { describe, expect, it } from "vitest";
import { authorizeGovernanceRequest, loadGovernanceTokens } from "../../src/service-auth.js";

const tokens = loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) });
const platformTokens = tokens;
const allowed = (method: string, pathname: string, caller: string, token: string) => authorizeGovernanceRequest({ method, pathname, serviceId: caller, authorization: `Bearer ${token}`, tokens });
const routeCallers = [
  { id: "platform-api-service", token: platformTokens["platform-api-service"]! },
  { id: "trade-execution-service", token: platformTokens["trade-execution-service"] },
  { id: "historical-replay-worker", token: platformTokens["historical-replay-worker"] }
] as const;
const authorizeAllCallers = (method: string, pathname: string, caller: string, token: string) => authorizeGovernanceRequest({ method, pathname, serviceId: caller, authorization: `Bearer ${token}`, tokens: platformTokens });

const governanceRoutes = [
  { method: "GET", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000", callers: ["platform-api-service", "trade-execution-service"] },
  { method: "GET", path: "/internal/v1/auto-mandates/123e4567-e89b-42d3-a456-426614174000/runs/123e4567-e89b-42d3-a456-426614174001", callers: ["platform-api-service"] },
  { method: "GET", path: "/internal/v1/auto-mandates/123e4567-e89b-42d3-a456-426614174000/runs/123e4567-e89b-42d3-a456-426614174001/versions/1/budget", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/v12/strategy-snapshots", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/authorizations", callers: ["historical-replay-worker"] },
  { method: "POST", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/execution-authorizations", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/execution-authorizations/validate", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/auto-mandates/123e4567-e89b-42d3-a456-426614174000/orders/authorize", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/auto-mandates/reservations/123e4567-e89b-42d3-a456-426614174000/settle", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/paper-authorizations", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/paper-authorizations/revoke", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/candidate-mandates/readiness", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/proposals", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/auto-mandates", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/auto-mandates/123e4567-e89b-42d3-a456-426614174000/activate", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/auto-mandates/123e4567-e89b-42d3-a456-426614174000/pause", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/approve", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/reject", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/revise", callers: ["platform-api-service"] },
  { method: "POST", path: "/internal/v1/paper-authorizations/validate", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/authorizations/validate", callers: ["trade-execution-service"] }
] as const;

describe("governance service Bearer scopes", () => {
  it("requires two distinct strong service tokens", () => {
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "short", STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40) })).toThrow();
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) })).toThrow("must be distinct");
  });
  it("requires a distinct Platform API Bearer because Governance exposes Platform-scoped V1 routes", () => {
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40) })).toThrow("Platform API");
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "r".repeat(40) })).toThrow("must be distinct");
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
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${tokens["trade-execution-service"]}`, tokens })).toBe(false);
    expect(allowed("POST", path, "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(() => loadGovernanceTokens({ STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: "t".repeat(40), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "r".repeat(40) })).toThrow("must be distinct");
  });
  it("allows only the authenticated Platform API to revoke Paper Fixture grants", () => {
    const path = "/internal/v1/paper-authorizations/revoke";
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: platformTokens })).toBe(true);
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "trade-execution-service", authorization: `Bearer ${"t".repeat(40)}`, tokens: platformTokens })).toBe(false);
    expect(authorizeGovernanceRequest({ method: "POST", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${tokens["trade-execution-service"]}`, tokens })).toBe(false);
    expect(authorizeGovernanceRequest({ method: "GET", pathname: path, serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: platformTokens })).toBe(false);
  });
  it("restricts proposal persistence and owner-scoped reads to Platform API", () => {
    const createPath = "/internal/v1/proposals";
    const readPath = "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000";
    const platformAllowed = (method: string, pathname: string, caller: string, token: string) => authorizeGovernanceRequest({ method, pathname, serviceId: caller, authorization: `Bearer ${token}`, tokens: platformTokens });
    expect(platformAllowed("POST", createPath, "platform-api-service", platformTokens["platform-api-service"]!)).toBe(true);
    const revisePath = "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/revise";
    expect(platformAllowed("POST", revisePath, "platform-api-service", platformTokens["platform-api-service"]!)).toBe(true);
    expect(platformAllowed("POST", revisePath, "trade-execution-service", platformTokens["trade-execution-service"])).toBe(false);
    expect(platformAllowed("GET", readPath, "platform-api-service", platformTokens["platform-api-service"]!)).toBe(true);
    expect(platformAllowed("GET", readPath, "trade-execution-service", platformTokens["trade-execution-service"])).toBe(true);
    expect(platformAllowed("POST", "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/approve", "trade-execution-service", platformTokens["trade-execution-service"])).toBe(false);
    expect(platformAllowed("POST", "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/execution-authorizations", "trade-execution-service", platformTokens["trade-execution-service"])).toBe(true);
    expect(platformAllowed("POST", "/internal/v1/proposals/123e4567-e89b-42d3-a456-426614174000/execution-authorizations/validate", "platform-api-service", platformTokens["platform-api-service"]!)).toBe(false);
  });

  it("enumerates every admitted Governance route and rejects other service identities and methods", () => {
    for (const route of governanceRoutes) {
      for (const caller of routeCallers) {
        const shouldAllow = (route.callers as readonly string[]).includes(caller.id);
        expect(authorizeAllCallers(route.method, route.path, caller.id, caller.token), `${route.method} ${route.path} as ${caller.id}`).toBe(shouldAllow);
        const otherMethod = route.method === "GET" ? "POST" : "GET";
        expect(authorizeAllCallers(otherMethod, route.path, caller.id, caller.token), `${otherMethod} ${route.path} as ${caller.id}`).toBe(false);
      }
    }
    expect(authorizeAllCallers("POST", "/internal/v1/proposals/not-a-uuid/approve", "platform-api-service", routeCallers[0].token)).toBe(false);
    expect(authorizeAllCallers("POST", "/internal/v1/unknown", "platform-api-service", routeCallers[0].token)).toBe(false);
  });
});
