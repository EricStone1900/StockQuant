import { describe, expect, it } from "vitest";
import { isReplayWorkerPlatformRequest, loadReplayWorkerTokens } from "../../src/service-auth.js";

const tokens = loadReplayWorkerTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) });

describe("replay worker inbound service identity", () => {
  it("requires distinct strong platform and worker credentials", () => {
    expect(() => loadReplayWorkerTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "short", STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) })).toThrow();
    expect(() => loadReplayWorkerTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "x".repeat(40) })).toThrow("must be distinct");
  });
  it("rejects missing, forged and mismatched caller identity", () => {
    expect(isReplayWorkerPlatformRequest({ serviceId: "platform-api-service", authorization: `Bearer ${tokens.self}`, tokens })).toBe(false);
    expect(isReplayWorkerPlatformRequest({ serviceId: "platform-api-service", authorization: `Bearer ${"q".repeat(40)}`, tokens })).toBe(false);
    expect(isReplayWorkerPlatformRequest({ serviceId: "platform-api-service", authorization: "Bearer short", tokens })).toBe(false);
    expect(isReplayWorkerPlatformRequest({ serviceId: "platform-api-service", authorization: undefined, tokens })).toBe(false);
    expect(isReplayWorkerPlatformRequest({ serviceId: "forged", authorization: `Bearer ${tokens.platformApi}`, tokens })).toBe(false);
    expect(isReplayWorkerPlatformRequest({ serviceId: "platform-api-service", authorization: `Bearer ${tokens.platformApi}`, tokens })).toBe(true);
  });
});
