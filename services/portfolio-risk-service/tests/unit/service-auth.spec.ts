import { describe, expect, it } from "vitest";
import { authorizePortfolioRequest } from "../../src/application/service-auth.js";

const platformToken = "platform_secret_0123456789abcdefghijklmnop";
const credentials = { "platform-api-service": platformToken, "trade-execution-service": "trade_secret_0123456789abcdefghijklmnop", "historical-replay-worker": "replay_secret_0123456789abcdefghijklmnop" };

describe("portfolio service bearer identities", () => {
  it("requires a configured bearer and ignores service-id headers as credentials", () => {
    const request = { callerId: "platform-api-service", method: "GET", path: "/internal/v1/accounts/id/snapshot", credentials };
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${platformToken}` })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ ...request, authorization: undefined })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: "platform-api-service" })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${"x".repeat(platformToken.length)}` })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ ...request, authorization: `Bearer ${platformToken}`, credentials: {} })).toBe("NOT_CONFIGURED");
  });

  it("scopes each identity to its routes and prevents identity-header escalation", () => {
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "POST", path: "/internal/v1/accounts/id/fills", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/resource-reservations", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/initialize", credentials })).toBe("UNAUTHENTICATED");
    expect(authorizePortfolioRequest({ callerId: "historical-replay-worker", authorization: `Bearer ${credentials["historical-replay-worker"]}`, method: "GET", path: "/internal/v1/accounts/id/snapshot", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "trade-execution-service", authorization: `Bearer ${credentials["trade-execution-service"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations/reservation-id/resolve", credentials })).toBe("AUTHORIZED");
    expect(authorizePortfolioRequest({ callerId: "platform-api-service", authorization: `Bearer ${platformToken}`, method: "POST", path: "/internal/v1/accounts/id/reservations", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "historical-replay-worker", authorization: `Bearer ${credentials["historical-replay-worker"]}`, method: "POST", path: "/internal/v1/accounts/id/reservations/id/resolve", credentials })).toBe("FORBIDDEN");
    expect(authorizePortfolioRequest({ callerId: "test-harness", authorization: `Bearer ${"t".repeat(40)}`, method: "POST", path: "/internal/v1/faults/fill", credentials: { ...credentials, "test-harness": "t".repeat(40) } })).toBe("AUTHORIZED");
  });
});
