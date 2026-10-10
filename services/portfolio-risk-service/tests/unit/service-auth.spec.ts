import { describe, expect, it } from "vitest";
import { authorizePortfolioRequest } from "../../src/application/service-auth.js";

const platformToken = "platform_secret_0123456789abcdefghijklmnop";
const credentials = { "platform-api-service": platformToken, "trade-execution-service": "trade_secret_0123456789abcdefghijklmnop", "historical-replay-worker": "replay_secret_0123456789abcdefghijklmnop" };
const testCredentials = { ...credentials, "test-harness": "harness_secret_0123456789abcdefghijklm" };
const routeCallers = [
  { id: "platform-api-service", token: credentials["platform-api-service"], credentials },
  { id: "trade-execution-service", token: credentials["trade-execution-service"], credentials },
  { id: "historical-replay-worker", token: credentials["historical-replay-worker"], credentials },
  { id: "test-harness", token: testCredentials["test-harness"], credentials: testCredentials },
] as const;
const portfolioRoutes = [
  { method: "POST", path: "/internal/v1/accounts/initialize", callers: ["platform-api-service", "historical-replay-worker"] },
  { method: "POST", path: "/internal/v1/accounts/account-id/fills", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/accounts/account-id/fills/fill-id/fee-corrections", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/accounts/account-id/reservations", callers: ["trade-execution-service"] },
  { method: "POST", path: "/internal/v1/accounts/account-id/reservations/reservation-id/resolve", callers: ["trade-execution-service"] },
  { method: "GET", path: "/internal/v1/accounts/account-id/snapshot", callers: ["platform-api-service", "historical-replay-worker"] },
  { method: "POST", path: "/internal/v1/faults/fill", callers: ["test-harness"] },
] as const;

describe("portfolio service bearer identities", () => {
  it("requires a configured bearer and ignores service-id headers as credentials", () => {
    const request = { callerId: "platform-api-service", method: "GET", path: "/internal/v1/accounts/id/snapshot", credentials };
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${platformToken}` })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ ...request, authorization: undefined })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: "platform-api-service" })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${"x".repeat(platformToken.length)}` })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${platformToken}`, credentials: {} })).toBe("NOT_CONFIGURED");
  });

  it("fails closed when required caller credentials are missing, weak, or reused", () => {
    const path = "/internal/v1/accounts/id/snapshot";
    const replayToken = credentials["historical-replay-worker"];
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "GET", path, credentials: { ...credentials, "trade-execution-service": platformToken } })).toBe("NOT_CONFIGURED");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "GET", path, credentials: { ...credentials, "historical-replay-worker": platformToken } })).toBe("NOT_CONFIGURED");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "GET", path, credentials: { ...credentials, "historical-replay-worker": replayToken?.slice(0, 20) } })).toBe("NOT_CONFIGURED");
  });

  it("scopes each identity to its routes and prevents identity-header escalation", () => {
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "POST", path: "/internal/v1/accounts/id/fills", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/fills/fill-1/fee-corrections", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "POST", path: "/internal/v1/accounts/id/fills/fill-1/fee-corrections", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/resource-reservations", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/initialize", credentials })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ callerId: "historical-replay-worker", authorization: `Bearer ${credentials["historical-replay-worker"]}`, method: "GET", path: "/internal/v1/accounts/id/snapshot", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations/reservation-id/resolve", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "POST", path: "/internal/v1/accounts/id/reservations", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "historical-replay-worker", authorization: `Bearer ${credentials["historical-replay-worker"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations/id/resolve", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "test-harness", authorization: `Bearer ${"t".repeat(40)}`, method: "POST", path: "/internal/v1/faults/fill", credentials: { ...credentials, "test-harness": "t".repeat(40) } })).toBe("AUTHORIZED");
  });

  it("enumerates every admitted Portfolio route across all four caller identities and methods", () => {
    for (const route of portfolioRoutes) {
      for (const caller of routeCallers) {
        const shouldAllow = (route.callers as readonly string[]).includes(caller.id);
        const request = { callerId: caller.id, authorization: `Bearer ${caller.token}`, method: route.method, path: route.path, credentials: caller.credentials };
        expect(authorizePortfolioRequest(request), `${route.method} ${route.path} as ${caller.id}`).toBe(shouldAllow ? "AUTHORIZED" : "FORBIDDEN");
        if (shouldAllow) {
          const wrongToken = routeCallers.find((candidate) => candidate.id !== caller.id)!.token;
          expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${wrongToken}` }), `${route.method} ${route.path} with wrong token for ${caller.id}`).toBe("UNAUTHENTICATED");
        }
        expect(authorizePortfolioRequest({ ...request, method: route.method === "GET" ? "POST" : "GET" }), `wrong method ${route.path} as ${caller.id}`).toBe("FORBIDDEN");
      }
    }
  });
});
