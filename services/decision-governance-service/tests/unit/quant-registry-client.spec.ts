import { describe, expect, it, vi } from "vitest";
import { GeneratedQuantRegistryClient } from "../../src/contracts/generated-quant-registry-client.js";

const fingerprint = "a".repeat(64);

describe("generated Quant Registry client", () => {
  it("sends the Governance service identity and exact approved version path", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "NOT_FOUND" }), { status: 404 }));
    const client = new GeneratedQuantRegistryClient("http://quant.local/", "g".repeat(40), request);

    await expect(client.getApprovedPromotionRegistryVersion(fingerprint)).resolves.toEqual({ status: 404, body: { status: "NOT_FOUND" } });
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]?.[0]).toBe(`http://quant.local/v1/registry/versions/${fingerprint}`);
    expect(request.mock.calls[0]?.[1]?.headers).toEqual({
      "x-stockquant-service-id": "decision-governance-service",
      authorization: `Bearer ${"g".repeat(40)}`,
    });
  });

  it("rejects malformed endpoints, credentials, and fingerprints before network access", async () => {
    const request = vi.fn<typeof fetch>();
    expect(() => new GeneratedQuantRegistryClient("file:///tmp/quant", "g".repeat(40), request)).toThrow("HTTP(S)");
    expect(() => new GeneratedQuantRegistryClient("http://quant.local", "short", request)).toThrow("bearer token");
    const client = new GeneratedQuantRegistryClient("http://quant.local", "g".repeat(40), request);
    await expect(client.getApprovedPromotionRegistryVersion("../registry")).rejects.toThrow("lowercase SHA-256");
    expect(request).not.toHaveBeenCalled();
  });
});
