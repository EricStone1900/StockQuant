import { describe, expect, it, vi } from "vitest";
import { GeneratedPaperAuthorizationClient } from "../../src/contracts/generated-paper-authorization-client.js";

describe("GeneratedPaperAuthorizationClient", () => {
  it("uses the OpenAPI path, Trade Execution bearer identity and exact authorization command", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{\"valid\":true,\"replayed\":false}", { status: 200 }));
    const body = { authorizationId: "auth-1", accountId: "account-1", command: { testRunId: "run-1" } };
    const client = new GeneratedPaperAuthorizationClient("http://governance.test/", "t".repeat(40), request);
    const response = await client.validateV24PaperFixtureRun(body as never);
    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("http://governance.test/internal/v1/paper-authorizations/validate");
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${"t".repeat(40)}` }, body: JSON.stringify(body) });
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects untrusted URLs and missing service credentials", () => {
    expect(() => new GeneratedPaperAuthorizationClient("file:///tmp", "t".repeat(40))).toThrow("HTTP(S)");
    expect(() => new GeneratedPaperAuthorizationClient("http://governance.test", "short")).toThrow("bearer token");
  });
});
