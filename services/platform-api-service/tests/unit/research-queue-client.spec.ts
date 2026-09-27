import { describe, expect, it, vi } from "vitest";
import { GeneratedResearchQueueClient, ResearchQueueHttpError } from "../../src/contracts/generated-research-queue-client.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";

describe("OpenAPI-generated Research queue client", () => {
  it("encodes all TestRun-scoped pagination queries and applies Platform identity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1" }), { status: 200 }));
    const client = new GeneratedResearchQueueClient("http://research:3008/", token, request);
    const testRunId = "4fca81ae-4631-42c8-9544-0a2d9425f793";

    await client.listRunnerJobsForTestRun(testRunId, 0, 20);
    await client.listRunnerJobsForTestRunAfterCursor(testRunId, "opaque+/cursor=", 30);
    await client.readRunnerBudgetForTestRun(testRunId, 40, 10);

    expect(String(request.mock.calls[0]?.[0])).toBe(`http://research:3008/v1/runner/jobs?testRunId=${testRunId}&offset=0&limit=20`);
    expect(String(request.mock.calls[1]?.[0])).toBe(`http://research:3008/v1/runner/jobs/cursor?testRunId=${testRunId}&afterCursor=opaque%2B%2Fcursor%3D&limit=30`);
    expect(String(request.mock.calls[2]?.[0])).toBe(`http://research:3008/v1/runner/budgets?testRunId=${testRunId}&offset=40&limit=10`);
    for (const [, init] of request.mock.calls) {
      expect(init?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` });
    }
  });

  it("preserves downstream HTTP status", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "database unavailable" }), { status: 503 }));
    const client = new GeneratedResearchQueueClient("http://research:3008", token, request);
    await expect(client.readRunnerBudgetForTestRun("4fca81ae-4631-42c8-9544-0a2d9425f793")).rejects.toMatchObject<Partial<ResearchQueueHttpError>>({ status: 503, message: expect.stringContaining("database unavailable") });
  });

  it("submits the generated V3.1 dispatch contract with the bounded request timeout", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ jobId: "run:experiment", status: "QUEUED" }), { status: 202 }));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const client = new GeneratedResearchQueueClient("http://research:3008", token, request);
    const body = {
      schemaVersion: "v3.1-runner-job-v1" as const,
      testRunId: "4fca81ae-4631-42c8-9544-0a2d9425f793",
      experimentId: "9c1f37fa-1620-4e0e-9d42-65d3d1305686",
      imageDigest: `sha256:${"a".repeat(64)}`,
      inputArtifact: `research/run/experiment/inputs/${"b".repeat(64)}`,
      outputNamespace: "research/run/experiment/outputs",
      resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 },
      networkPolicy: { mode: "DENY" as const, allowlist: [] },
    };

    await client.submitV31RunnerJob(body);

    expect(String(request.mock.calls[0]?.[0])).toBe("http://research:3008/v1/runner/jobs");
    expect(request.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual(body);
    expect(request.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    expect(timeout).toHaveBeenCalledWith(10_000);
    timeout.mockRestore();
  });

  it("creates a TestRun-bound V3.1 Experiment with the generated contract", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ experimentId: "9c1f37fa-1620-4e0e-9d42-65d3d1305686", status: "PENDING_PREREQUISITES" }), { status: 202 }));
    const client = new GeneratedResearchQueueClient("http://research:3008", token, request);
    const body = {
      testRunId: "4fca81ae-4631-42c8-9544-0a2d9425f793",
      fixtureId: "v3.1-research-small-sample-1",
      modelProfile: "UNSET",
      rounds: 1,
      budgetCurrency: "USD" as const,
      budgetCents: 100,
      environmentMode: "RESEARCH" as const,
      brokerMode: "FAKE" as const,
      idempotencyKey: "v31-test-run-bound-experiment",
    };

    await client.createV31Experiment(body);

    expect(String(request.mock.calls[0]?.[0])).toBe("http://research:3008/v1/experiments");
    expect(request.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual(body);
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: `Bearer ${token}` });
  });

  it("encodes V3.1 path parameters and uses typed budget, job and Artifact routes", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const client = new GeneratedResearchQueueClient("http://research:3008", token, request);
    const experimentId = "9c1f37fa-1620-4e0e-9d42-65d3d1305686";
    const jobId = "4fca81ae-4631-42c8-9544-0a2d9425f793:9c1f37fa-1620-4e0e-9d42-65d3d1305686";
    await client.readV31ExperimentBudget(experimentId);
    await client.settleV31ExperimentBudget(experimentId, { spentCents: 23 });
    await client.readV31RunnerJob(jobId);
    await client.publishV31Artifact({ ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "artifact-1", kind: "INPUT", namespace: "research/run/experiment/inputs", sha256: "a".repeat(64), status: "PENDING", sourceRef: "fixture" }, contentBase64: "eA==" });
    await client.readV31Artifact({ namespace: "research/run/experiment/outputs", artifactId: "artifact-1" });

    expect(String(request.mock.calls[0]?.[0])).toBe(`http://research:3008/v1/experiments/${experimentId}/budget`);
    expect(String(request.mock.calls[1]?.[0])).toBe(`http://research:3008/v1/experiments/${experimentId}/budget/settle`);
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toEqual({ spentCents: 23 });
    expect(String(request.mock.calls[2]?.[0])).toBe(`http://research:3008/v1/runner/jobs/${encodeURIComponent(jobId)}`);
    expect(String(request.mock.calls[3]?.[0])).toBe("http://research:3008/v1/artifacts/publish");
    expect(String(request.mock.calls[4]?.[0])).toBe("http://research:3008/v1/artifacts/read");
    for (const [, init] of request.mock.calls) expect(init?.headers).toMatchObject({ authorization: `Bearer ${token}` });
  });

  it("cancels an encoded Runner job with the Platform Bearer and no request body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ jobId: "run:experiment", status: "CANCELLED" }), { status: 200 }));
    const client = new GeneratedResearchQueueClient("http://research:3008", token, request);
    const jobId = "run:experiment";

    await client.cancelV31RunnerJob(jobId);

    expect(String(request.mock.calls[0]?.[0])).toBe(`http://research:3008/v1/runner/jobs/${encodeURIComponent(jobId)}`);
    expect(request.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(request.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` });
  });
});
