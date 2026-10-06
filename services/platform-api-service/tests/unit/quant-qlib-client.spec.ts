import { describe, expect, it, vi } from "vitest";
import { GeneratedQuantQlibClient, QuantQlibHttpError } from "../../src/contracts/generated-quant-qlib-client.js";
import { buildV23QlibFixtureRequest } from "../../src/application/v23-qlib-fixture.js";

describe("OpenAPI-generated Qlib fixture client", () => {
  it("calls the typed fit route with the Platform service identity and deterministic Fixture", async () => {
    const result = { schemaVersion: "qlib-fit-fixture-result-v1", status: "COMPLETED", sourceMode: "FIXTURE", modelTraining: "PASS", modelValidation: "NOT_RUN", temporalValidation: "PASS", candidateSourceExecution: "NOT_PERFORMED", modelSha256: "a".repeat(64), testPredictionsSha256: "b".repeat(64) };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + "x".repeat(48) };
    const client = new GeneratedQuantQlibClient("http://quant:3003/", () => headers, request);
    const body = buildV23QlibFixtureRequest();
    await expect(client.fitQlibFixtureModel(body)).resolves.toMatchObject({ status: "COMPLETED", temporalValidation: "PASS" });
    expect(request).toHaveBeenCalledWith("http://quant:3003/v1/research/qlib/fit-fixture", expect.objectContaining({ method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) }));
  });

  it("preserves Qlib runtime failures for the owner-scoped acceptance run", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "REJECTED", reason: "invalid split" }), { status: 422 }));
    const client = new GeneratedQuantQlibClient("http://quant:3003", () => ({}), request);
    await expect(client.fitQlibFixtureModel(buildV23QlibFixtureRequest())).rejects.toMatchObject<Partial<QuantQlibHttpError>>({ status: 422, body: { status: "REJECTED", reason: "invalid split" } });
  });
});
