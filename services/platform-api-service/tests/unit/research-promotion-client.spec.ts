import { describe, expect, it, vi } from "vitest";
import { GeneratedResearchPromotionClient, ResearchPromotionHttpError } from "../../src/contracts/generated-research-promotion-client.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";

describe("OpenAPI-generated guarded Research Promotion client", () => {
  it("sends a TestRun-scoped submission with Platform Bearer identity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "WAITING", testRunId: "4fca81ae-4631-42c8-9544-0a2d9425f793" }), { status: 200 }));
    const client = new GeneratedResearchPromotionClient("http://research:3008/", token, request);
    const body = { testRunId: "4fca81ae-4631-42c8-9544-0a2d9425f793", experimentId: "9c1f37fa-1620-4e0e-9d42-65d3d1305686" };

    await client.submitPromotionAfterV31Acceptance(body);

    expect(String(request.mock.calls[0]?.[0])).toBe("http://research:3008/v1/promotions/submit");
    expect(request.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual(body);
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` });
  });

  it("preserves the downstream status and prerequisite detail", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "storage unavailable" }), { status: 503 }));
    const client = new GeneratedResearchPromotionClient("http://research:3008", token, request);
    await expect(client.submitPromotionAfterV31Acceptance({ testRunId: "4fca81ae-4631-42c8-9544-0a2d9425f793", experimentId: "9c1f37fa-1620-4e0e-9d42-65d3d1305686" }))
      .rejects.toMatchObject<Partial<ResearchPromotionHttpError>>({ status: 503, message: expect.stringContaining("storage unavailable") });
  });
});
