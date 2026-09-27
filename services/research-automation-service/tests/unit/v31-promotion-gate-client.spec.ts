import { describe, expect, it, vi } from "vitest";
import { createV31PromotionGateReader } from "../../src/application/v31-promotion-gate-client.js";

const testRunId = "11111111-1111-4111-8111-111111111111";
const gate = { schemaVersion: "v3.1-promotion-gate-v1", testRunId, stageStatus: "PASS", humanAcceptance: "ACCEPTED", evidenceSha256: "a".repeat(64) };

describe("V3.1 authoritative gate reader", () => {
  it("sends the independent service identity to the exact Platform run endpoint", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${"r".repeat(40)}`);
      expect(new Headers(init?.headers).get("x-stockquant-service-id")).toBe("research-automation-service");
      return Response.json(gate);
    });
    const read = createV31PromotionGateReader({ platformBaseUrl: "http://127.0.0.1:3000", bearerToken: "r".repeat(40), fetchImpl });
    await expect(read(testRunId)).resolves.toEqual({ testRunId, stageStatus: "PASS", humanAcceptance: "ACCEPTED", evidenceSha256: "a".repeat(64) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns no gate on 404 and rejects invalid or cross-run responses", async () => {
    const missing = createV31PromotionGateReader({ platformBaseUrl: "http://127.0.0.1:3000", bearerToken: "r".repeat(40), fetchImpl: async () => new Response(null, { status: 404 }) });
    await expect(missing(testRunId)).resolves.toBeNull();
    const mismatch = createV31PromotionGateReader({ platformBaseUrl: "http://127.0.0.1:3000", bearerToken: "r".repeat(40), fetchImpl: async () => Response.json({ ...gate, testRunId: "22222222-2222-4222-8222-222222222222" }) });
    await expect(mismatch(testRunId)).rejects.toThrow(/exact-run contract/u);
  });

  it("rejects weak credentials and URLs with userinfo", () => {
    expect(() => createV31PromotionGateReader({ platformBaseUrl: "http://user:pass@127.0.0.1:3000", bearerToken: "r".repeat(40) })).toThrow(/base URL/u);
    expect(() => createV31PromotionGateReader({ platformBaseUrl: "http://127.0.0.1:3000", bearerToken: "weak" })).toThrow(/Bearer token/u);
  });
});
