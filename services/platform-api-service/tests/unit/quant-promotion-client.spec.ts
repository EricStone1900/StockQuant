import { describe, expect, it, vi } from "vitest";
import { GeneratedQuantPromotionClient, QuantPromotionHttpError } from "../../src/contracts/generated-quant-promotion-client.js";

describe("generated Quant Promotion client", () => {
  it("encodes IDs, applies the Platform service identity, and sends decision contracts", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ schemaVersion: "v3.2-promotion-decision-result-v1" }), { status: 200 }));
    const client = new GeneratedQuantPromotionClient("http://quant/", () => ({ authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }), request as typeof fetch);
    await client.getPromotionRequestDetail("id/with slash");
    await client.getIndependentValidationReport("id/with slash");
    await client.recordExactPromotionVersionDecision("id/with slash", { schemaVersion: "v3.2-promotion-decision-command-v1", decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint: "a".repeat(64), actorId: "user-1" });
    expect(request.mock.calls.map(([url, init]) => [String(url), init?.method, init?.headers])).toEqual([
      ["http://quant/v1/promotions/id%2Fwith%20slash/detail", "GET", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://quant/v1/promotions/id%2Fwith%20slash/validation-report", "GET", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://quant/v1/promotions/id%2Fwith%20slash/decision", "POST", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service", "content-type": "application/json" }]
    ]);
    expect(JSON.parse(String(request.mock.calls[2][1]?.body))).toMatchObject({ decision: "APPROVE", reportFingerprint: "a".repeat(64) });
  });

  it("exposes HTTP errors for existing Platform status mapping", async () => {
    const client = new GeneratedQuantPromotionClient("http://quant", () => ({}), vi.fn(async () => new Response(JSON.stringify({ reason: "stale" }), { status: 409 })) as typeof fetch);
    await expect(client.recordExactPromotionVersionDecision("request-1", { schemaVersion: "v3.2-promotion-decision-command-v1", decision: "REJECT", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint: "b".repeat(64), actorId: "user-1" })).rejects.toMatchObject({ name: "QuantPromotionHttpError", status: 409, body: { reason: "stale" } } satisfies Partial<QuantPromotionHttpError>);
  });
});
