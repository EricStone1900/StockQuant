import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgV32PromotionSubmissionJournal } from "../../src/adapters/pg-v32-promotion-submission-journal.js";
import type { V32PromotionRequest } from "../../src/contracts/generated-types.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "research_automation_test") throw new Error("RESEARCH_AUTOMATION_DATABASE_URL must target the isolated research_automation_test database");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.2 PromotionRequest submission journal", () => {
  const pool = new Pool({ connectionString });
  const journal = new PgV32PromotionSubmissionJournal(pool);
  const rows: Array<{ idempotencyKey: string; promotionRequestId: string }> = [];
  const createRequest = (): V32PromotionRequest => {
    const promotionRequestId = randomUUID();
    const idempotencyKey = `v32-journal-${randomUUID()}`;
    rows.push({ idempotencyKey, promotionRequestId });
    return {
      schemaVersion: "v3.2-promotion-request-v1",
      promotionRequestId,
      testRunId: randomUUID(),
      experimentId: randomUUID(),
      candidateSource: "FIXTURE",
      candidateArtifact: { artifactId: "candidate-a", namespace: "research/run/experiment/outputs", sha256: "a".repeat(64) },
      codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64),
      budget: { allocationId: "budget-a", currency: "USD", reservedMinor: 100, consumedMinor: 20 },
      idempotencyKey,
    };
  };
  const gateHash = "f".repeat(64);

  beforeAll(async () => journal.initialize());
  afterAll(async () => {
    for (const row of rows) await pool.query("DELETE FROM v32_promotion_submission_attempts WHERE idempotency_key=$1", [row.idempotencyKey]);
    await pool.end();
  });

  it("serializes concurrent calls and leaves later observers in reconcile-only state", async () => {
    const request = createRequest();
    const outcomes = await Promise.all([journal.begin(request, gateHash), journal.begin(request, gateHash)]);
    expect(outcomes.filter((outcome) => outcome.action === "SUBMIT")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.action === "RECONCILE" && outcome.state === "SUBMITTING")).toHaveLength(1);
  });

  it("persists ambiguous outcomes across journal instances and never reopens POST", async () => {
    const request = createRequest();
    await expect(journal.begin(request, gateHash)).resolves.toEqual({ action: "SUBMIT" });
    await journal.markUnknown(request, "timeout/read failure");
    const restarted = new PgV32PromotionSubmissionJournal(pool);
    await expect(restarted.begin(request, gateHash)).resolves.toEqual({ action: "RECONCILE", state: "UNKNOWN" });
  });

  it("replays submitted status and rejects changed payload under the same idempotency key", async () => {
    const request = createRequest();
    await journal.begin(request, gateHash);
    await journal.markSubmitted(request, { promotionRequestId: request.promotionRequestId, testRunId: request.testRunId, quantStatus: "AWAITING_INDEPENDENT_VALIDATION", idempotent: false });
    await expect(journal.begin(request, gateHash)).resolves.toMatchObject({ action: "EXISTING_SUBMISSION", state: "SUBMITTED" });
    await expect(journal.begin({ ...request, codeSha256: "f".repeat(64) }, gateHash)).rejects.toThrow(/different immutable/u);
    await expect(journal.begin(request, "a".repeat(64))).rejects.toThrow(/different immutable/u);
  });
});
