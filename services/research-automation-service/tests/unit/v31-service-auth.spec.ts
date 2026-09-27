import { describe, expect, it } from "vitest";
import { authorizeResearchServiceRequest } from "../../src/application/v31-service-auth.js";

const token = "r7a1B2c3D4e5F6g7H8j9K0m1N2p3Q4s5T6v7W8x9Y0z";
const credentials = { "platform-api-service": token, "runner-host": "a7b1C2d3E4f5G6h7J8k9M0n1P2q3R4s5T6v7W8x9Y0z", "quant-validation-worker": "b7b1C2d3E4f5G6h7J8k9M0n1P2q3R4s5T6v7W8x9Y0z" };

describe("V3.1 service Bearer identity", () => {
  const request = { method: "POST", url: "/v1/runner/jobs", serviceId: "platform-api-service", authorization: `Bearer ${token}`, credentials };

  it("accepts the configured identity on its allowed route", () => {
    expect(authorizeResearchServiceRequest(request)).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/model-gateway/preflight" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/model-gateway/fixture-call" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/artifacts/read" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/promotions/prepare" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/promotions/submit" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/promotions/submit", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/experiments/exp-1/budget" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/experiments/exp-1/budget/settle" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/runner/jobs/run-1:exp-1" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/runner/jobs/cursor?testRunId=123e4567-e89b-42d3-a456-426614174000", serviceId: "runner-host", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/runner/budgets?testRunId=123e4567-e89b-42d3-a456-426614174000&offset=0&limit=50" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/runner/budgets?testRunId=123e4567-e89b-42d3-a456-426614174000", serviceId: "runner-host", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/runner/jobs/run-1:exp-1/cancel" })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url: "/v1/runner/jobs/run-1:exp-1/retry" })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/artifacts/read", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/promotions/prepare", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/runner/jobs/run-1:exp-1/cancel", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
  });

  it("rejects a missing identity or token", () => {
    expect(authorizeResearchServiceRequest({ ...request, serviceId: undefined })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, authorization: undefined })).toBe("UNAUTHENTICATED");
  });

  it("rejects wrong tokens and callers outside their route scope", () => {
    expect(authorizeResearchServiceRequest({ ...request, authorization: "Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" })).toBe("UNAUTHENTICATED");
    expect(authorizeResearchServiceRequest({ ...request, url: "/v1/runner/jobs/job-1/complete" })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/runner/jobs/claim", authorization: `Bearer ${token}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/runner/jobs/claim", authorization: `Bearer ${credentials["platform-api-service"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, serviceId: "runner-host", url: "/v1/runner/jobs/claim", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("AUTHORIZED");
  });

  it("fails closed when the route's caller credential is not configured", () => {
    expect(authorizeResearchServiceRequest({ ...request, credentials: {} })).toBe("NOT_CONFIGURED");
  });

  it("limits candidate bytes to the dedicated validation Worker identity", () => {
    const url = "/v1/promotions/123e4567-e89b-42d3-a456-426614174000/candidate-artifact";
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url, serviceId: "quant-validation-worker", authorization: `Bearer ${credentials["quant-validation-worker"]}` })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url, serviceId: "platform-api-service" })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, method: "GET", url, serviceId: "runner-host", authorization: `Bearer ${credentials["runner-host"]}` })).toBe("FORBIDDEN");
    expect(authorizeResearchServiceRequest({ ...request, method: "POST", url, serviceId: "quant-validation-worker", authorization: `Bearer ${credentials["quant-validation-worker"]}` })).toBe("FORBIDDEN");
  });
});
