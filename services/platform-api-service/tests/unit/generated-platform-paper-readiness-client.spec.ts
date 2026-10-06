import { describe, expect, it, vi } from "vitest";
import { GeneratedPlatformPaperReadinessClient } from "../../src/contracts/generated-platform-paper-readiness-client.js";

describe("GeneratedPlatformPaperReadinessClient", () => {
  it("queries only the requested market with the Platform service identity", async () => {
    const result = { schemaVersion: "v24-paper-execution-readiness-v1", market: "CN_A", status: "BLOCKED", orderSubmissionEnabled: false };
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const client = new GeneratedPlatformPaperReadinessClient("http://execution.test/", "p".repeat(40), request);
    await expect(client.getV24PaperExecutionReadiness("CN_A")).resolves.toMatchObject({ status: 200, body: result });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("http://execution.test/internal/v1/v24/paper-readiness?market=CN_A");
    expect(request.mock.calls[0][1]).toMatchObject({ headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` } });
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects an unsupported market, non-HTTP URL, or missing Platform credential", async () => {
    const client = new GeneratedPlatformPaperReadinessClient("http://execution.test", "p".repeat(40), vi.fn());
    await expect(client.getV24PaperExecutionReadiness("BAD" as never)).rejects.toThrow();
    expect(() => new GeneratedPlatformPaperReadinessClient("file:///tmp", "p".repeat(40))).toThrow("HTTP(S)");
    expect(() => new GeneratedPlatformPaperReadinessClient("http://execution.test", "short")).toThrow("bearer token");
  });
});
