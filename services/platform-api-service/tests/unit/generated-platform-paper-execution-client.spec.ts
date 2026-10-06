import { describe, expect, it, vi } from "vitest";
import { GeneratedPlatformPaperExecutionClient } from "../../src/contracts/generated-platform-paper-execution-client.js";

describe("GeneratedPlatformPaperExecutionClient", () => {
  it("submits the exact Fixture command with bearer identity and preserves the response", async () => {
    const response = new Response(JSON.stringify({ order: { status: "FILLED" } }), { status: 201 });
    const request = vi.fn().mockResolvedValue(response);
    const client = new GeneratedPlatformPaperExecutionClient("http://execution.test/", "p".repeat(40), request);
    const command = { authorizationId: "auth-1", grant: { dataMode: "FIXTURE" } };
    await expect(client.executeV24FixtureSnapshotOrder(command as never)).resolves.toBe(response);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("http://execution.test/internal/v1/v24/paper-orders/execute-snapshot");
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(command), headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` } });
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("queries the exact original order identity and preserves a 404 for authoritative recovery", async () => {
    const response = new Response(null, { status: 404 });
    const request = vi.fn().mockResolvedValue(response);
    const client = new GeneratedPlatformPaperExecutionClient("http://execution.test", "p".repeat(40), request);
    await expect(client.readV24FakeOrderByClientIdentity("run space", "order/1")).resolves.toBe(response);
    expect(request.mock.calls[0][0]).toBe("http://execution.test/internal/v1/orders/by-client-id?namespace=run+space&clientOrderId=order%2F1");
    expect(request.mock.calls[0][1]).toMatchObject({ headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` } });
  });

  it("reads namespace reconciliation through its bearer-protected contract", async () => {
    const response = new Response(JSON.stringify({ namespace: "run/1", brokerMode: "FAKE", order_count: 1, unresolved_order_count: 0, fill_count: 1, pending_outbox_count: 0 }), { status: 200 });
    const request = vi.fn().mockResolvedValue(response);
    const client = new GeneratedPlatformPaperExecutionClient("http://execution.test", "p".repeat(40), request);
    await expect(client.readV24PaperReconciliationSummary("run/1")).resolves.toBe(response);
    expect(request.mock.calls[0][0]).toBe("http://execution.test/internal/v1/reconciliation/summary?namespace=run%2F1");
    expect(request.mock.calls[0][1]).toMatchObject({ headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` } });
  });

  it("rejects invalid URL, credential, and empty recovery identities", async () => {
    expect(() => new GeneratedPlatformPaperExecutionClient("file:///tmp", "p".repeat(40))).toThrow("HTTP(S)");
    expect(() => new GeneratedPlatformPaperExecutionClient("http://execution.test", "short")).toThrow("bearer token");
    const client = new GeneratedPlatformPaperExecutionClient("http://execution.test", "p".repeat(40), vi.fn());
    await expect(client.readV24FakeOrderByClientIdentity("", "id")).rejects.toThrow("required");
  });
});
