import { describe, expect, it, vi } from "vitest";
import { GeneratedQuantV12PreviewClient, QuantV12PreviewHttpError } from "../../src/contracts/generated-quant-v12-preview-client.js";

describe("generated V1.2 Quant Research preview client", () => {
  it("uses only the fixed probe and factor read routes with Platform service identity", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const client = new GeneratedQuantV12PreviewClient("http://quant/", () => ({ authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }), request as typeof fetch);
    await client.getV12QlibProbe();
    await client.getV12RDagentProbe();
    await client.getV12FactorPreview();
    expect(request.mock.calls.map(([url, init]) => [String(url), init?.headers])).toEqual([
      ["http://quant/v1/qlib/probe", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://quant/v1/rdagent/probe", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://quant/v1/factors/preview", { authorization: "Bearer platform-token", "x-stockquant-service-id": "platform-api-service" }]
    ]);
  });

  it("retains Quant HTTP failures", async () => {
    const client = new GeneratedQuantV12PreviewClient("http://quant", () => ({}), vi.fn(async () => new Response("{}", { status: 503 })) as typeof fetch);
    await expect(client.getV12QlibProbe()).rejects.toMatchObject({ name: "QuantV12PreviewHttpError", status: 503 } satisfies Partial<QuantV12PreviewHttpError>);
  });
});
