import { describe, expect, it } from "vitest";
import { DataVersionConflict, FairProjectQuota, ProjectAccessDenied, ProjectQuotaExceeded, assertProjectAccess, exportWithManifest, paginateVersioned, physicalDedupeKey } from "../../src/application/project-delivery.js";

describe("project delivery rules", () => {
  it("enforces project ownership and scopes", () => {
    const actor = { projectId: "stockquant", scopes: new Set(["DATA_READ"] as const) };
    expect(() => assertProjectAccess(actor, "other", "DATA_READ")).toThrow(ProjectAccessDenied);
    expect(() => assertProjectAccess(actor, "stockquant", "DATA_EXPORT")).toThrow(ProjectAccessDenied);
    expect(() => assertProjectAccess(actor, "stockquant", "DATA_READ")).not.toThrow();
  });
  it("enforces per-project quota and retains fair queue order", () => {
    const quota = new FairProjectQuota(new Map([["a", { projectId: "a", maxConcurrentRuns: 1, maxSecuritiesPerSubscription: 20 }], ["b", { projectId: "b", maxConcurrentRuns: 1, maxSecuritiesPerSubscription: 20 }]]));
    quota.admit("a");
    expect(() => quota.admit("a")).toThrow(ProjectQuotaExceeded);
    quota.admit("b");
    expect(quota.nextQueued()).toBe("a");
    quota.release("a"); quota.release("b");
    expect(() => quota.admit("unknown")).toThrow(ProjectAccessDenied);
  });
  it("deduplicates physical work without merging project authorization", () => {
    const input = { source: "baostock", market: "CN", securityId: "600000.SH", frequency: "5m", adjustment: "raw", windowStart: "2026-09-11T01:30:00Z", windowEnd: "2026-09-11T01:35:00Z", adapterVersion: "v1" };
    expect(physicalDedupeKey(input)).toBe(physicalDedupeKey({ ...input }));
    expect(physicalDedupeKey(input)).not.toBe(physicalDedupeKey({ ...input, securityId: "000001.SZ" }));
  });
  it("keeps pagination locked to DataVersion and exports a reproducible hash", () => {
    const first = paginateVersioned([1, 2, 3], "v1", "v1", 0, 2);
    expect(first.nextCursor).toBe("2");
    expect(paginateVersioned([1, 2, 3], "v1", "v1", 2, 2).nextCursor).toBe(null);
    expect(() => paginateVersioned([1], "v2", "v1", 0, 1)).toThrow(DataVersionConflict);
    const exported = exportWithManifest("stockquant", "v1", [1, 2]);
    expect(exported.rowCount).toBe(2);
    expect(exported.sha256).toHaveLength(64);
  });
});
