import { describe, expect, it } from "vitest";
import { deriveV15RunIncidentCandidates } from "../../src/application/v15-run-incidents.js";

describe("V1.5 Run-scoped alert projection", () => {
  it("creates incidents only for explicit persisted blockers and failed assertions", () => {
    const incidents = deriveV15RunIncidentCandidates({
      workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "WAITING", businessExecution: "NOT_RUN",
    }, [
      { assertionId: "V15-1", status: "WAITING", actual: "NOT_RUN" },
      { assertionId: "V15-2", status: "FAIL", expected: "MATCH", actual: "MISMATCH" },
    ]);
    expect(incidents).toEqual([
      { alertKey: "assertion:V15-2", code: "V15_ASSERTION_FAILED", severity: "ERROR", title: "Run assertion V15-2 failed", detail: { assertionId: "V15-2", expected: "MATCH", actual: "MISMATCH" } },
      { alertKey: "capability:workflow", code: "V15_WORKFLOW_BLOCKED", severity: "BLOCKER", title: "Durable workflow dispatch is blocked", detail: { capability: "workflow", status: "NOT_CONNECTED" } },
    ]);
  });

  it("does not turn NOT_RUN, queued, or healthy evidence into incidents", () => {
    expect(deriveV15RunIncidentCandidates({
      workflow: "NATS_OUTBOX_QUEUED", nats: "NOT_RUN", temporal: "WAITING", businessExecution: "NOT_RUN",
    }, [{ assertionId: "V15-1", status: "WAITING", actual: "NOT_RUN" }])).toEqual([]);
    expect(deriveV15RunIncidentCandidates({ workflow: "COMPLETED", nats: "DELIVERED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_EXECUTED" }, [])).toEqual([]);
  });

  it("reports only explicit service error suffixes as blockers", () => {
    expect(deriveV15RunIncidentCandidates({ workflow: "TEMPORAL_WORKFLOW_FAILED", nats: "DELIVERY_ERROR", temporal: "UNAVAILABLE", businessExecution: "QUEUED" }, [])).toHaveLength(3);
  });
});
