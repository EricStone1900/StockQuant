import { describe, expect, it, vi } from "vitest";
import { GeneratedPlatformPaperAuthorizationClient } from "../../src/contracts/generated-platform-paper-authorization-client.js";

describe("GeneratedPlatformPaperAuthorizationClient", () => {
  it("sends the exact Fixture grant with Platform service identity and preserves rejection status", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{\"error\":\"fixture grant rejected\"}", { status: 422 }));
    const body = { grant: { testRunId: "run-1", namespace: "v24-paper-v2-run-1" } };
    const client = new GeneratedPlatformPaperAuthorizationClient("http://governance.test/", "p".repeat(40), request);
    await expect(client.authorizeV24PaperFixtureRun(body as never)).resolves.toMatchObject({ status: 422, body: { error: "fixture grant rejected" } });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("http://governance.test/internal/v1/paper-authorizations");
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` }, body: JSON.stringify(body) });
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects non-HTTP Governance URLs and malformed service credentials", () => {
    expect(() => new GeneratedPlatformPaperAuthorizationClient("file:///tmp", "p".repeat(40))).toThrow("HTTP(S)");
    expect(() => new GeneratedPlatformPaperAuthorizationClient("http://governance.test", "short")).toThrow("bearer token");
  });
});
