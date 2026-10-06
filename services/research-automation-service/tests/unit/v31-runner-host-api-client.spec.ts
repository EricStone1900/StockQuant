import { afterEach, describe, expect, it, vi } from "vitest";
import { RunnerLeaseLostError, V31RunnerHostApiClient } from "../../src/application/v31-runner-host-api-client.js";
import { sha256, type ArtifactRef } from "../../src/application/v31-runtime-guards.js";

const token = "runner-host-token-with-at-least-thirty-two-characters";
const response = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.restoreAllMocks());

describe("V3.1 Runner Host API client", () => {
  it("claims only its scoped lease routes with the dedicated bearer identity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response(200, { status: "NO_WORK" }));
    const client = new V31RunnerHostApiClient("http://research:3008/", token, request);
    await expect(client.claim("runner-a", "run-1")).resolves.toEqual({ status: "NO_WORK" });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("http://research:3008/v1/runner/jobs/claim");
    expect(init?.headers).toMatchObject({ "x-stockquant-service-id": "runner-host", authorization: `Bearer ${token}` });
    expect(JSON.parse(String(init?.body))).toEqual({ workerId: "runner-a", testRunId: "run-1" });
  });

  it("sends the fencing token on heartbeat and completion and maps stale lease conflicts", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response(409, { error: "lease lost or expired" }));
    const client = new V31RunnerHostApiClient("http://research:3008", token, request);
    const lease = { workerId: "runner-a", fencingToken: 4, expiresAt: "2026-09-25T00:00:30.000Z" };
    await expect(client.heartbeat("run:exp", lease)).rejects.toBeInstanceOf(RunnerLeaseLostError);
    expect(request.mock.calls[0][0]).toBe("http://research:3008/v1/runner/jobs/run%3Aexp/heartbeat");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ workerId: "runner-a", fencingToken: 4 });
    await expect(client.complete("run:exp", lease, { status: "FAILED", exitCode: 1, signal: null, stdout: "", stderr: "failed", durationMs: 2 }, [])).rejects.toBeInstanceOf(RunnerLeaseLostError);
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toMatchObject({ workerId: "runner-a", fencingToken: 4, execution: { status: "FAILED" } });
  });

  it("reads an input artifact only with the matching fenced lease", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response(200, { ref: { artifactId: "input" }, contentBase64: "Zml4ZWQ=" }));
    const client = new V31RunnerHostApiClient("http://research:3008", token, request);
    const lease = { workerId: "runner-a", fencingToken: 7, expiresAt: "2026-09-25T00:00:30.000Z" };
    await expect(client.readInput("run:exp", lease)).resolves.toEqual({ ref: { artifactId: "input" }, contentBase64: "Zml4ZWQ=" });
    expect(request.mock.calls[0][0]).toBe("http://research:3008/v1/runner/jobs/run%3Aexp/input");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ workerId: "runner-a", fencingToken: 7 });
  });

  it("publishes content-addressed Runner outputs with its host identity and refuses corrupt or oversized bytes", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const content = Buffer.from("runner output");
    const ref: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "output-1", kind: "OUTPUT", namespace: "research/run-1/exp-1/outputs", sha256: sha256(content), status: "PENDING", sourceRef: "runner:run-1:exp-1:fence-1" };
    const request = vi.fn<typeof fetch>().mockResolvedValue(response(201, { status: "PUBLISHED", persisted: true, ref: { ...ref, status: "PUBLISHED" } }));
    const client = new V31RunnerHostApiClient("http://research:3008", token, request);
    const lease = { workerId: "runner-a", fencingToken: 1, expiresAt: "2026-09-25T00:00:30.000Z" };
    await expect(client.publishArtifact("run-1:exp-1", lease, ref, content)).resolves.toMatchObject({ status: "PUBLISHED", ref: { sha256: ref.sha256 } });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("http://research:3008/v1/artifacts/publish");
    expect(init?.headers).toMatchObject({ "x-stockquant-service-id": "runner-host", authorization: `Bearer ${token}` });
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(JSON.parse(String(init?.body))).toEqual({ jobId: "run-1:exp-1", workerId: "runner-a", fencingToken: 1, ref, contentBase64: content.toString("base64") });
    await expect(client.publishArtifact("run-1:exp-1", lease, ref, Buffer.from("tampered"))).rejects.toThrow("hash does not match");
    await expect(client.publishArtifact("run-1:exp-1", lease, ref, Buffer.alloc(8 * 1024 * 1024 + 1))).rejects.toThrow("exceeds 8 MiB");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a missing host token and does not leak token values in HTTP errors", async () => {
    expect(() => new V31RunnerHostApiClient("http://research:3008", "short")).toThrow("bearer token is not configured");
    const request = vi.fn<typeof fetch>().mockResolvedValue(response(401, { error: "unauthenticated", authorization: token }));
    const client = new V31RunnerHostApiClient("http://research:3008", token, request);
    await expect(client.claim("runner-a")).rejects.toThrow("HTTP 401");
  });
});
