import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PlatformContainer, V32AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V3.2 readiness HTTP routes", () => {
  const runs = new Map<string, Record<string, unknown>>();
  const testRunId = randomUUID();
  const acceptedV31RunId = randomUUID();
  runs.set(acceptedV31RunId, { testRunId: acceptedV31RunId, stageId: "V3.1", scenarioId: "normal", ownerId: "acceptance-owner-1" });
  const container = {
    stageRuns: {
      newId: () => testRunId,
      save: async (run: Record<string, unknown>) => { runs.set(testRunId, run); return run; },
      find: async (id: string, ownerId: string) => {
        const run = runs.get(id);
        return run?.ownerId === ownerId ? run : null;
      },
      getV31PromotionGate: async (id: string) => id === acceptedV31RunId ? { schemaVersion: "v3.1-promotion-gate-v1", testRunId: id, stageStatus: "PASS", humanAcceptance: "ACCEPTED", evidenceSha256: "a".repeat(64) } : null,
    },
  } as unknown as PlatformContainer;

  class V32ReadinessHttpTestModule {}
  Module({ controllers: [V32AcceptanceController], providers: [{ provide: PlatformContainer, useValue: container }] })(V32ReadinessHttpTestModule);

  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let baseUrl = "";

  beforeAll(async () => {
    app = await NestFactory.create(V32ReadinessHttpTestModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    if (!address || typeof address === "string") throw new Error("test HTTP server did not bind a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => { await app?.close(); });

  it("creates and reads a same-owner readiness TestRun through the mounted HTTP routes", async () => {
    const createdResponse = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs`, {
      method: "POST",
      headers: { cookie: "sq_session=acceptance-owner-1", "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "recovery", seed: 17 }),
    });
    expect(createdResponse.status).toBe(202);
    const created = await createdResponse.json();
    expect(created).toMatchObject({ testRunId, stageId: "V3.2", scenarioId: "recovery", status: "WAITING", seed: 17, evidence: { sourceMode: "READINESS_ONLY", businessValidation: "NOT_RUN", registryMutation: "NOT_PERFORMED", paperCalls: 0 } });

    const readResponse = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs/${testRunId}`, { headers: { cookie: "sq_session=acceptance-owner-1" } });
    expect(readResponse.status).toBe(200);
    expect(await readResponse.json()).toMatchObject({ testRunId, stageId: "V3.2", scenarioVersion: "v3.2-readiness-v1", status: "WAITING" });

    const unauthorizedRead = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs/${testRunId}`);
    expect(unauthorizedRead.status).toBe(401);
    const otherOwnerRead = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs/${testRunId}`, { headers: { cookie: "sq_session=another-user" } });
    expect(otherOwnerRead.status).toBe(403);
    const invalidCreate = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs`, {
      method: "POST",
      headers: { cookie: "sq_session=acceptance-owner-1", "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "normal", unrecognized: true }),
    });
    expect(invalidCreate.status).toBe(422);
    const crossStageRead = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs/${randomUUID()}`, { headers: { cookie: "sq_session=acceptance-owner-1" } });
    expect(crossStageRead.status).toBe(404);

    const acceptedSourceCreate = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.2/runs`, {
      method: "POST",
      headers: { cookie: "sq_session=acceptance-owner-1", "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "normal", sourceV31TestRunId: acceptedV31RunId }),
    });
    expect(acceptedSourceCreate.status).toBe(202);
    const acceptedSourceRun = await acceptedSourceCreate.json();
    expect(acceptedSourceRun).toMatchObject({ status: "WAITING", assertions: expect.arrayContaining([expect.objectContaining({ id: "V3.1_ACCEPTANCE", status: "NOT_RUN" })]), evidence: { sourceV31Gate: { stageStatus: "PASS", humanAcceptance: "ACCEPTED" }, blockers: expect.arrayContaining([expect.objectContaining({ id: "V3.1_ACCEPTANCE", status: "VERIFIED" })]), businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } });
  });
});
