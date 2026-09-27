import { describe, expect, it, vi } from "vitest";
import { readLeasedRunnerInput } from "../../src/application/v31-runner-input.js";
import type { RunnerJobRecord } from "../../src/application/v31-runner-jobs.js";
import { sha256, type ArtifactRef } from "../../src/application/v31-runtime-guards.js";
import { authorizeResearchServiceRequest } from "../../src/application/v31-service-auth.js";

const bytes = Buffer.from("fixed runner input");
const ref: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: sha256(bytes), kind: "INPUT", namespace: `research/run-1/exp-1/inputs`, sha256: sha256(bytes), status: "PUBLISHED", sourceRef: "fixture:runner-input" };
const record: RunnerJobRecord = {
  jobId: "run-1:exp-1",
  job: { schemaVersion: "v3.1-runner-job-v1", testRunId: "run-1", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `${ref.namespace}/${ref.artifactId}`, outputNamespace: "research/run-1/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } },
  status: "RUNNING", submittedAt: "2026-09-25T00:00:00.000Z", startedAt: "2026-09-25T00:00:00.000Z", completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: { workerId: "runner-a", fencingToken: 3, expiresAt: "2026-09-25T00:01:00.000Z" },
};

function store(overrides: { ref?: ArtifactRef | null; bytes?: Uint8Array; size?: number } = {}) {
  return { get: vi.fn(async () => overrides.ref === undefined ? ref : overrides.ref), size: vi.fn(async () => overrides.size ?? bytes.byteLength), read: vi.fn(async () => overrides.bytes ?? bytes) };
}

describe("V3.1 leased input artifact access", () => {
  it("serves only the published input pinned to a current fenced lease", async () => {
    const artifactStore = store();
    await expect(readLeasedRunnerInput({ record, workerId: "runner-a", fencingToken: 3, now: new Date("2026-09-25T00:00:30Z"), store: artifactStore })).resolves.toMatchObject({ ref, content: bytes });
    expect(artifactStore.get).toHaveBeenCalledWith(ref.namespace, ref.artifactId);
  });

  it.each([
    { label: "different worker", workerId: "runner-b", fencingToken: 3, now: new Date("2026-09-25T00:00:30Z") },
    { label: "stale fencing token", workerId: "runner-a", fencingToken: 2, now: new Date("2026-09-25T00:00:30Z") },
    { label: "expired lease", workerId: "runner-a", fencingToken: 3, now: new Date("2026-09-25T00:01:00Z") },
  ])("rejects $label before artifact access", async ({ workerId, fencingToken, now }) => {
    const artifactStore = store();
    await expect(readLeasedRunnerInput({ record, workerId, fencingToken, now, store: artifactStore })).resolves.toBeNull();
    expect(artifactStore.get).not.toHaveBeenCalled();
  });

  it("rejects unavailable identities and verifies size and content hash", async () => {
    await expect(readLeasedRunnerInput({ record, workerId: "runner-a", fencingToken: 3, now: new Date("2026-09-25T00:00:30Z"), store: store({ ref: null }) })).resolves.toBeNull();
    await expect(readLeasedRunnerInput({ record, workerId: "runner-a", fencingToken: 3, now: new Date("2026-09-25T00:00:30Z"), store: store({ size: 8 * 1024 * 1024 + 1 }) })).rejects.toThrow("exceeds 8 MiB");
    await expect(readLeasedRunnerInput({ record, workerId: "runner-a", fencingToken: 3, now: new Date("2026-09-25T00:00:30Z"), store: store({ bytes: Buffer.from("tampered") }) })).rejects.toThrow("hash does not match");
  });

  it("scopes input reads to the authenticated Runner Host only", () => {
    const credentials = { "platform-api-service": "platform-token-with-at-least-thirty-two-characters", "runner-host": "runner-token-with-at-least-thirty-two-characters" };
    expect(authorizeResearchServiceRequest({ method: "POST", url: "/v1/runner/jobs/run%3Aexp/input", serviceId: "runner-host", authorization: `Bearer ${credentials["runner-host"]}`, credentials })).toBe("AUTHORIZED");
    expect(authorizeResearchServiceRequest({ method: "POST", url: "/v1/runner/jobs/run%3Aexp/input", serviceId: "platform-api-service", authorization: `Bearer ${credentials["platform-api-service"]}`, credentials })).toBe("FORBIDDEN");
  });
});
