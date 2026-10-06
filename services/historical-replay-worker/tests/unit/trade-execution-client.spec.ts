import { describe, expect, it, vi } from "vitest";
import { GeneratedTradeExecutionClient, TradeExecutionHttpError } from "../../src/contracts/generated-trade-execution-client.js";

const command = { authorizationId: "auth-1", namespace: "replay-1", accountId: "a7a6a6d4-8e67-4a01-9cc5-daf8e3e2f1a9", clientOrderId: "order-1", security: "600000.SH", requestedQuantity: 100, bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.0000", volume: 1000 } };

describe("generated Historical Trade Execution client", () => {
  it("sends only the replay-worker identity and returns the contract response", async () => {
    const result = { result: { orderId: "5f8d3f56-ff40-4cde-9d83-041abc584d84", status: "FILLED", brokerMode: "FAKE", fill: { externalFillId: "0bf9912e-a4b4-4bbb-8caf-12f9a5a6e616", quantity: 100, price: "10.0000", fee: "5.0000", effectiveAt: "2026-09-25T01:31:00.000Z" } }, replayed: false };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const client = new GeneratedTradeExecutionClient("http://trade.local/", "r".repeat(40), request);

    await expect(client.executeHistoricalFakeOrder(command)).resolves.toEqual(result);
    expect(request.mock.calls[0]?.[0]).toBe("http://trade.local/internal/v1/historical-orders/execute");
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${"r".repeat(40)}` });
  });

  it("preserves the status and body of an execution rejection", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"error":"denied"}', { status: 403 }));
    const client = new GeneratedTradeExecutionClient("http://trade.local", "r".repeat(40), request);
    await expect(client.executeHistoricalFakeOrder(command)).rejects.toMatchObject({ name: "TradeExecutionHttpError", status: 403, body: '{"error":"denied"}' } satisfies Partial<TradeExecutionHttpError>);
  });

  it("reads the persisted original order for UNKNOWN recovery without resending", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ order_id: "5f8d3f56-ff40-4cde-9d83-041abc584d84", status: "UNKNOWN", rejection_reason: null }), { status: 200 }));
    const client = new GeneratedTradeExecutionClient("http://trade.local", "r".repeat(40), request);
    await expect(client.readHistoricalFakeOrderById("5f8d3f56-ff40-4cde-9d83-041abc584d84")).resolves.toMatchObject({ status: "UNKNOWN" });
    expect(request.mock.calls[0]?.[0]).toBe("http://trade.local/internal/v1/orders/5f8d3f56-ff40-4cde-9d83-041abc584d84");
    expect(request.mock.calls[0]?.[1]?.method).toBeUndefined();
  });
});
