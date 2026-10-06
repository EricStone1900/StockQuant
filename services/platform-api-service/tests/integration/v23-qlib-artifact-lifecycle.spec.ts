import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresQlibFixtureArtifactRepository } from "../../src/adapters/postgres-qlib-fixture-artifact-repository.js";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { QlibArtifactContentStore } from "../../src/adapters/qlib-artifact-content-store.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V2.3 Qlib Artifact lifecycle", () => {
  const pool = new Pool({ connectionString });
  const artifactRoot = mkdtempSync(join(tmpdir(), "stockquant-v23-artifacts-"));
  const artifacts = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(artifactRoot));
  const runs = new PostgresStageRunRepository(pool);
  const testRunId = randomUUID();
  const ownerId = `v23-artifact-lifecycle-${randomUUID()}`;
  const backfillPayload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: Buffer.from("legacy-jsonb-backfill-model").toString("base64"), predictions: [0.3, 0.7] };
  const payload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: Buffer.from("lifecycle-model").toString("base64"), predictions: [0.1, 0.2] };
  const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  let artifactId = "";
  let backfillArtifactId = "";

  beforeAll(async () => { await runs.migrate(); await artifacts.migrate(); });
  afterAll(async () => {
    for (const id of [artifactId, backfillArtifactId].filter(Boolean)) await pool.query("DELETE FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3", [testRunId, id, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    await pool.end();
    rmSync(artifactRoot, { recursive: true, force: true });
  });

  it("persists legal immutable lifecycle transitions and blocks early expiry/revival/download", async () => {
    await runs.save({ testRunId, stageId: "V2.3", scenarioId: "qlib-fixture", scenarioVersion: "v23-artifact-lifecycle-v1", ownerId, status: "COMPLETED", seed: 20260907, assertions: [], evidence: {} });
    const saved = await artifacts.save({ testRunId, ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload });
    artifactId = saved.artifactId;
    await artifacts.setExpiry(testRunId, artifactId, ownerId, futureExpiry);
    await expect(artifacts.setExpiry(testRunId, artifactId, ownerId, new Date(Date.parse(futureExpiry) + 24 * 60 * 60 * 1000).toISOString())).rejects.toThrow("immutable");
    await artifacts.transition(testRunId, artifactId, ownerId, "RETAINED");
    await expect(artifacts.transition(testRunId, artifactId, ownerId, "EXPIRED")).rejects.toThrow("invalid or expiry has not elapsed");
    await expect(artifacts.find(testRunId, artifactId, ownerId)).resolves.toMatchObject({ status: "RETAINED" });
    await pool.query("UPDATE qlib_fixture_artifacts SET expires_at='2026-09-30T00:00:00.000Z' WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3", [testRunId, artifactId, ownerId]);
    await artifacts.transition(testRunId, artifactId, ownerId, "EXPIRED");
    await expect(artifacts.findLifecycle(testRunId, artifactId, ownerId)).resolves.toMatchObject({ status: "EXPIRED", expiresAt: "2026-09-30T00:00:00.000Z" });
    await expect(artifacts.find(testRunId, artifactId, ownerId)).rejects.toThrow("not found");
    await expect(artifacts.transition(testRunId, artifactId, ownerId, "PUBLISHED")).rejects.toThrow("invalid or expiry has not elapsed");
  });

  it("backfills a legacy JSONB row into the isolated shared store idempotently", async () => {
    await runs.save({ testRunId, stageId: "V2.3", scenarioId: "qlib-fixture", scenarioVersion: "v23-artifact-lifecycle-v1", ownerId, status: "COMPLETED", seed: 20260907, assertions: [], evidence: {} });
    const saved = await artifacts.save({ testRunId, ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload: backfillPayload });
    backfillArtifactId = saved.artifactId;
    await pool.query("UPDATE qlib_fixture_artifacts SET payload=$4::jsonb WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3", [testRunId, saved.artifactId, ownerId, JSON.stringify(backfillPayload)]);
    await expect(pool.query("SELECT payload FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3", [testRunId, saved.artifactId, ownerId])).resolves.toMatchObject({ rows: [{ payload: backfillPayload }] });

    await expect(artifacts.backfillLegacyPayloads(10, false)).resolves.toEqual({ scanned: 1, eligible: 1, migrated: 0, conflicts: 0 });
    await expect(artifacts.backfillLegacyPayloads(10, true)).resolves.toEqual({ scanned: 1, eligible: 1, migrated: 1, conflicts: 0 });
    await expect(artifacts.backfillLegacyPayloads(10, true)).resolves.toEqual({ scanned: 0, eligible: 0, migrated: 0, conflicts: 0 });
    await expect(pool.query("SELECT payload FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND artifact_id=$2 AND owner_id=$3", [testRunId, saved.artifactId, ownerId])).resolves.toMatchObject({ rows: [{ payload: null }] });
    await expect(artifacts.find(testRunId, saved.artifactId, ownerId)).resolves.toMatchObject({ artifactId: saved.artifactId, payload: backfillPayload, status: "PUBLISHED" });
  });
});
