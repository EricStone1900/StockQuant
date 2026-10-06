import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { PlatformContainer } from "../../src/bootstrap/app.module.js";
import { V23AcceptanceController } from "../../src/bootstrap/app.module.js";

const modelBytes = Buffer.from("fixture-model");
const hash = createHash("sha256").update(modelBytes).digest("hex");
const artifactPayload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: modelBytes.toString("base64"), predictions: Array.from({ length: 24 }, (_, index) => index / 24) };
const predictionsCanonicalJson = JSON.stringify(artifactPayload.predictions);
const result = {
  schemaVersion: "qlib-fit-fixture-result-v1", status: "COMPLETED", sourceMode: "FIXTURE", modelTraining: "PASS", modelValidation: "NOT_RUN",
  temporalValidation: "PASS", candidateSourceExecution: "NOT_PERFORMED", qlibVersion: "0.9.6", lightgbmVersion: "4.7.0",
  model: "qlib.contrib.model.gbdt.LGBModel", segments: { train: { start: 0, end: 72, rows: 72 }, valid: { start: 72, end: 96, rows: 24 }, test: { start: 96, end: 120, rows: 24 } },
  testPredictionCount: 24, testPredictionsFinite: true, testPredictions: artifactPayload.predictions, modelArtifactBase64: artifactPayload.modelBase64, testPredictionsCanonicalJson: predictionsCanonicalJson, testPredictionsSha256: createHash("sha256").update(predictionsCanonicalJson).digest("hex"), modelSha256: hash, evaluationMetrics: {},
  tracking: "temporary SQLite under /tmp; removed with the worker container", profitabilityClaim: "NOT_MADE",
};

function setup() {
  const persisted: any[] = [];
  const container = {
    stageRuns: {
      newId: () => "00000000-0000-4000-8000-000000000023",
      save: vi.fn(async (run: any) => { const stored = { ...run }; const index = persisted.findIndex((item) => item.testRunId === run.testRunId); if (index < 0) persisted.push(stored); else persisted[index] = stored; return stored; }),
      find: vi.fn(async (id: string, owner: string) => persisted.find((run) => run.testRunId === id && run.ownerId === owner) ?? null),
    },
    quantResearchHeaders: () => ({ authorization: "Bearer fixture-token", "x-stockquant-service-id": "platform-api-service" }),
    qlibFixtureArtifacts: { save: vi.fn(async (input: any) => ({ ...input, artifactId: hash, sha256: hash, status: "PUBLISHED" })), find: vi.fn(async () => ({ artifactId: hash, sha256: hash, payload: artifactPayload, status: "PUBLISHED" })), findLifecycle: vi.fn(async () => ({ status: "PUBLISHED" })) },
  } as unknown as PlatformContainer;
  return { controller: new V23AcceptanceController(container), persisted, container };
}

afterEach(() => vi.restoreAllMocks());

describe("V2.3 Qlib Fixture persistent TestRun", () => {
  it("persists RUNNING then the actual Qlib result on the same owner-scoped TestRun", async () => {
    const { controller, persisted, container } = setup();
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const accepted = await controller.qlibFixtureRun("sq_session=acceptance-owner-1", undefined);
    expect(accepted).toEqual({ accepted: true, testRunId: "00000000-0000-4000-8000-000000000023", status: "COMPLETED" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:3003/v1/research/qlib/fit-fixture");
    expect(persisted[0]).toMatchObject({ stageId: "V2.3", scenarioId: "qlib-fixture", ownerId: "acceptance-owner-1", status: "COMPLETED" });
    expect(persisted[0].assertions[0].status).toBe("PASS");
    expect(persisted[0].evidence.crossService.research).toMatchObject({ dataMode: "FIXTURE", modelValidation: "NOT_RUN", durableArtifactStatus: "PERSISTED", artifactRef: { artifactId: hash, sha256: hash }, profitabilityClaim: "NOT_MADE", qlibVersion: "0.9.6", lightgbmVersion: "4.7.0", testPredictionsFinite: true });
    expect(container.stageRuns.save).toHaveBeenCalledTimes(2);
    await expect(controller.get("sq_session=acceptance-owner-1", undefined, accepted.testRunId)).resolves.toMatchObject({
      testRunId: accepted.testRunId,
      artifactRefs: [{ schemaVersion: "artifact-ref.v1", artifactId: hash, testRunId: accepted.testRunId, ownerId: "acceptance-owner-1", kind: "MODEL_PREDICTIONS", status: "PUBLISHED", sha256: hash }],
    });
    await expect(controller.get("sq_session=another-user", undefined, accepted.testRunId)).rejects.toThrow("not authorized");
    await expect(controller.qlibArtifact("sq_session=acceptance-owner-1", undefined, accepted.testRunId, hash)).resolves.toMatchObject({ artifactId: hash, payload: artifactPayload });
    await expect(controller.qlibArtifact("sq_session=another-user", undefined, accepted.testRunId, hash)).rejects.toThrow("not authorized");
  });

  it("persists a failed TestRun if Quant Research is unavailable", async () => {
    const { controller, persisted } = setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection refused"));
    const accepted = await controller.qlibFixtureRun("sq_session=acceptance-owner-1", undefined);
    expect(accepted.status).toBe("FAILED");
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ status: "FAILED", assertions: [{ status: "FAIL" }], evidence: { crossService: { research: { status: "FAILED", dataMode: "FIXTURE", durableArtifactStatus: "NOT_CREATED" } } } });
  });
});
