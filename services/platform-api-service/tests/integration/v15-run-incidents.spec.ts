import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V1.5 owner-scoped Run incidents", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const testRunId = randomUUID();
  const ownerId = `v15-incident-${randomUUID()}`;
  const foreignOwnerId = `v15-incident-foreign-${randomUUID()}`;

  beforeAll(async () => {
    await repository.migrate();
    await repository.save({
      testRunId, stageId: "V1.5", scenarioId: "normal", scenarioVersion: "1.1.0", ownerId,
      namespace: `v1-5-normal-${testRunId}`, status: "WAITING", seed: 20260907,
      assertions: [
        { assertionId: "V15-FAILED-001", status: "FAIL", expected: "MATCH", actual: "MISMATCH" },
        { assertionId: "V15-WAITING-001", status: "WAITING", actual: "NOT_RUN" },
      ],
      evidence: { workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "WAITING", businessExecution: "NOT_RUN" },
    });
  });

  afterAll(async () => {
    await pool.query("DELETE FROM v15_run_incidents WHERE test_run_id=$1", [testRunId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
    await pool.end();
  });

  it("projects explicit persisted blockers and failures idempotently, excluding NOT_RUN", async () => {
    const savedProjection = await pool.query("SELECT alert_key FROM v15_run_incidents WHERE test_run_id=$1 ORDER BY alert_key", [testRunId]);
    expect(savedProjection.rows.map((row) => row.alert_key)).toEqual(["assertion:V15-FAILED-001", "capability:workflow"]);
    const [first, concurrent] = await Promise.all([
      repository.projectV15RunIncidents(testRunId, ownerId), repository.projectV15RunIncidents(testRunId, ownerId),
    ]);
    expect(first).toHaveLength(2);
    expect(first.map((item) => item.alertKey).sort()).toEqual(["assertion:V15-FAILED-001", "capability:workflow"].sort());
    expect(first.map((item) => item.incidentId)).toEqual(concurrent.map((item) => item.incidentId));
    expect(first.every((item) => item.state === "OPEN")).toBe(true);
    expect(first.some((item) => item.alertKey.includes("WAITING"))).toBe(false);
    expect((await pool.query("SELECT count(*)::int AS count FROM v15_run_incidents WHERE test_run_id=$1", [testRunId])).rows[0].count).toBe(2);
    await expect(repository.projectV15RunIncidents(testRunId, foreignOwnerId)).rejects.toThrow(/user scope/u);
  });

  it("acknowledges using the authenticated actor id and keeps retries idempotent", async () => {
    const incidents = await repository.projectV15RunIncidents(testRunId, ownerId);
    const incident = incidents[0]!;
    const first = await repository.acknowledgeV15RunIncident(testRunId, ownerId, incident.incidentId, ownerId);
    const replay = await repository.acknowledgeV15RunIncident(testRunId, ownerId, incident.incidentId, "forged-browser-actor");
    expect(first.state).toBe("ACKNOWLEDGED");
    expect(first.acknowledgedBy).toBe(ownerId);
    expect(replay).toMatchObject({ incidentId: incident.incidentId, state: "ACKNOWLEDGED", acknowledgedBy: ownerId, acknowledgedAt: first.acknowledgedAt });
    await expect(repository.acknowledgeV15RunIncident(testRunId, foreignOwnerId, incident.incidentId, foreignOwnerId)).rejects.toThrow(/active V1.5 incident/u);
  });

  it("resolves incidents when persisted Run evidence recovers and records a new recurrence", async () => {
    const base = {
      testRunId, stageId: "V1.5", scenarioId: "normal", scenarioVersion: "1.1.0", ownerId,
      namespace: `v1-5-normal-${testRunId}`, status: "WAITING", seed: 20260907,
    } as const;
    await repository.save({
      ...base, assertions: [],
      evidence: { workflow: "COMPLETED", nats: "DELIVERED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_EXECUTED" },
    });
    const recovered = await pool.query("SELECT state,resolved_at FROM v15_run_incidents WHERE test_run_id=$1", [testRunId]);
    expect(recovered.rows).toHaveLength(2);
    expect(recovered.rows.every((item) => item.state === "RESOLVED" && item.resolved_at !== null)).toBe(true);
    await repository.save({ ...base, assertions: [], evidence: { workflow: "UNAVAILABLE" } });
    const recurred = await pool.query("SELECT state,resolved_at FROM v15_run_incidents WHERE test_run_id=$1 ORDER BY first_seen_at,incident_id", [testRunId]);
    expect(recurred.rows).toHaveLength(3);
    expect(recurred.rows.filter((item) => item.state === "OPEN" && item.resolved_at === null)).toHaveLength(1);
    expect(recurred.rows.filter((item) => item.state === "RESOLVED" && item.resolved_at !== null)).toHaveLength(2);
  });
});
