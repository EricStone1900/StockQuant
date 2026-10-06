import { describe, expect, it, vi } from "vitest";
import { probeServiceReadiness, requireServiceReadiness } from "../../src/adapters/service-readiness-probe.js";

describe("service readiness probe", () => {
  it("returns a typed ready result with the JSON readiness body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "HEALTHY" }), { status: 200 }));
    await expect(probeServiceReadiness("http://dependency/ready", 1234, request)).resolves.toEqual({ status: "READY", body: { status: "HEALTHY" } });
    expect(request).toHaveBeenCalledWith("http://dependency/ready", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("treats non-2xx, invalid JSON, and transport failures as unavailable", async () => {
    await expect(probeServiceReadiness("http://dependency/ready", 25, vi.fn<typeof fetch>().mockResolvedValue(new Response("down", { status: 503 })))).resolves.toEqual({ status: "UNAVAILABLE" });
    await expect(probeServiceReadiness("http://dependency/ready", 25, vi.fn<typeof fetch>().mockResolvedValue(new Response("not-json", { status: 200 })))).resolves.toEqual({ status: "UNAVAILABLE" });
    await expect(probeServiceReadiness("http://dependency/ready", 25, vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout")))).resolves.toEqual({ status: "UNAVAILABLE" });
  });

  it("fails required dependencies with a stable service-specific error", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("down", { status: 503 }));
    await expect(requireServiceReadiness("http://portfolio/ready", "portfolio API", request)).rejects.toThrow("portfolio API dependency is unavailable");
  });
});
