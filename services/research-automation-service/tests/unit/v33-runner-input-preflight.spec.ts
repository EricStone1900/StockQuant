import { describe, expect, it, vi } from "vitest";
import { sha256, type ArtifactRef, type RunnerJob } from "../../src/application/v31-runtime-guards.js";
import { RunnerInputPreflightError, verifyRunnerInputBeforeDispatch } from "../../src/application/v33-runner-input-preflight.js";

const bytes = new TextEncoder().encode("frozen research input");
const testRunId = "11111111-1111-4111-8111-111111111111";
const experimentId = "22222222-2222-4222-8222-222222222222";
const namespace = `research/${testRunId}/${experimentId}/inputs`;
const artifactId = sha256(bytes);
const job: RunnerJob = {
  schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId,
  imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `${namespace}/${artifactId}`,
  outputNamespace: `research/${testRunId}/${experimentId}/outputs`,
  resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 60, pidsLimit: 32 },
  networkPolicy: { mode: "DENY", allowlist: [] },
};
const ref = (overrides: Partial<ArtifactRef> = {}): ArtifactRef => ({
  schemaVersion: "v3.1-artifact-ref-v1", namespace, artifactId, kind: "INPUT", sha256: artifactId,
  sourceRef: "fixture://v33-runner-input-preflight", status: "PUBLISHED", ...overrides,
});
const stores = (artifact: ArtifactRef | null, contentBytes = bytes) => {
  const get = vi.fn(async () => artifact);
  const size = vi.fn(async () => contentBytes.byteLength);
  const read = vi.fn(async () => contentBytes);
  return { artifacts: { get }, content: { size, read }, get, size, read };
};

describe("V3.3 Runner dispatch input preflight", () => {
  it("accepts an exact published input whose stored bytes match its content address", async () => {
    const store = stores(ref());
    await expect(verifyRunnerInputBeforeDispatch(job, store.artifacts, store.content)).resolves.toEqual(ref());
    expect(store.read).toHaveBeenCalledOnce();
  });

  it("rejects an unregistered artifact before reading content", async () => {
    const store = stores(null);
    await expect(verifyRunnerInputBeforeDispatch(job, store.artifacts, store.content)).rejects.toMatchObject({ statusCode: 409 });
    expect(store.size).not.toHaveBeenCalled();
    expect(store.read).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong namespace", { namespace: "research/other/exp/inputs" }],
    ["wrong artifact kind", { kind: "OUTPUT" as const }],
    ["unpublished", { status: "PENDING" as const }],
    ["different content address", { sha256: "b".repeat(64) }],
  ])("rejects an input reference with %s", async (_label, overrides) => {
    const store = stores(ref(overrides));
    await expect(verifyRunnerInputBeforeDispatch(job, store.artifacts, store.content)).rejects.toBeInstanceOf(RunnerInputPreflightError);
    expect(store.read).not.toHaveBeenCalled();
  });

  it("rejects oversized input before materializing its bytes", async () => {
    const store = stores(ref());
    store.size.mockResolvedValue(8 * 1024 * 1024 + 1);
    await expect(verifyRunnerInputBeforeDispatch(job, store.artifacts, store.content)).rejects.toMatchObject({ statusCode: 413 });
    expect(store.read).not.toHaveBeenCalled();
  });

  it("rejects stored bytes whose length or digest differs from the immutable reference", async () => {
    const store = stores(ref(), new TextEncoder().encode("tampered"));
    await expect(verifyRunnerInputBeforeDispatch(job, store.artifacts, store.content)).rejects.toThrow("do not match");
  });
});
