import { describe, expect, it } from "vitest";
import { getV15CapabilityRows } from "./v15-capability-status.js";

describe("V1.5 capability blocker projection", () => {
  it("surfaces explicit missing dispatch without treating NOT_RUN as failure", () => {
    const rows = getV15CapabilityRows({ workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "NOT_RUN", businessExecution: "NOT_RUN" });
    expect(rows.map((row) => row.blocked)).toEqual([true, false, false, false]);
  });

  it("keeps queued and completed states clear", () => {
    const rows = getV15CapabilityRows({ workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_EXECUTED" });
    expect(rows.every((row) => !row.blocked)).toBe(true);
  });

  it("surfaces persisted failed states", () => {
    const rows = getV15CapabilityRows({ workflow: "TEMPORAL_FAILED", nats: "JETSTREAM_ACKED", temporal: "FAILED", businessExecution: "FAILED" });
    expect(rows.filter((row) => row.blocked).map((row) => row.capability)).toEqual(["Durable workflow dispatch", "Temporal worker", "Domain execution"]);
  });
});
