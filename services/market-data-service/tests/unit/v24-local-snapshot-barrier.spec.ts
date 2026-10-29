import { describe, expect, it } from "vitest";
import { selectV24LocalSnapshot, type LocalSnapshotPlan, type LocalSnapshotTaskFact } from "../../src/application/v24-local-snapshot-barrier.js";
const testRunId = "11111111-1111-4111-8111-111111111111";
const scope = { market: "CN_A" as const, ownerId: "owner", accountId: "account", namespace: `v24-paper-v2-${testRunId}`, testRunId };
const sourceId = "fixture:c5-test";
const plan: LocalSnapshotPlan = { planId: "frozen-plan", scope, securityId: "600000.SH", dataMode: "FIXTURE", tasks: [{ taskId: "first", sourceId, scheduledAt: "2024-01-04T09:31:10+08:00" }, { taskId: "second", sourceId, scheduledAt: "2024-01-04T09:31:20+08:00" }] };
function task(index: number): LocalSnapshotTaskFact {
  const planned = plan.tasks[index]!;
  return { ...planned, scope, dataMode: "FIXTURE", status: "COMPLETED_FIXTURE", completedAt: index ? "2024-01-04T09:31:21+08:00" : "2024-01-04T09:31:11+08:00", observations: [{ snapshotId: `snapshot-${index}`, securityId: "600000.SH", sourceId, dataMode: "FIXTURE", observedAt: planned.scheduledAt, ingestedAt: index ? "2024-01-04T09:31:21+08:00" : "2024-01-04T09:31:11+08:00", availableAt: index ? "2024-01-04T09:31:21+08:00" : "2024-01-04T09:31:11+08:00", ageSeconds: 0, freshness: "FRESH", status: "READY", price: index ? "10.3000" : "10.2500" }] };
}
const args = { plan, acceptedAt: "2024-01-04T09:31:00+08:00", evaluatedAt: "2024-01-04T09:31:50+08:00", windowEnd: "2024-01-04T09:35:00+08:00" };
describe("C5 immutable snapshot task barrier", () => {
  it("waits for the complete frozen task set and selects in observation order independent of completion order", () => {
    const first = task(0); const second = task(1);
    expect(selectV24LocalSnapshot({ ...args, tasks: [second] })).toEqual({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [{ ...first, status: "QUEUED" }, second] })).toEqual({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [second, first] })).toMatchObject({ status: "SELECTED", taskId: "first", observation: { snapshotId: "snapshot-0", price: "10.2500" } });
    expect(selectV24LocalSnapshot({ ...args, tasks: [second, first], evaluatedAt: "2024-01-04T09:31:15+08:00" })).toEqual({ status: "WAITING", reason: "TASKS_INCOMPLETE" });
  });
  it("fails closed for foreign scope, duplicates, failed tasks and malformed earlier observations", () => {
    const first = task(0); const second = task(1);
    expect(selectV24LocalSnapshot({ ...args, tasks: [{ ...first, scope: { ...scope, ownerId: "other" } }, second] })).toMatchObject({ status: "REJECTED", reason: "TASK_MISMATCH" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [first, first] })).toMatchObject({ status: "REJECTED", reason: "TASK_MISMATCH" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [{ ...first, status: "FAILED" }, second] })).toMatchObject({ status: "REJECTED", reason: "TASK_FAILED" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [{ ...first, observations: [] }, second] })).toMatchObject({ status: "REJECTED", reason: "OBSERVATION_INVALID" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [{ ...first, observations: [{ ...first.observations[0]!, observedAt: null }] }, second] })).toMatchObject({ status: "REJECTED", reason: "OBSERVATION_INVALID" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [first, { ...second, observations: [{ ...second.observations[0]!, snapshotId: "snapshot-0" }] }] })).toMatchObject({ status: "REJECTED", reason: "OBSERVATION_AMBIGUOUS" });
  });
  it("skips a stale observation only after all required tasks complete and refuses a closed window", () => {
    const first = task(0); const second = task(1);
    first.observations[0]!.status = "STALE"; first.observations[0]!.freshness = "STALE";
    expect(selectV24LocalSnapshot({ ...args, tasks: [first, second] })).toMatchObject({ status: "SELECTED", taskId: "second" });
    expect(selectV24LocalSnapshot({ ...args, tasks: [first, second], evaluatedAt: "2024-01-04T09:35:00+08:00" })).toMatchObject({ status: "REJECTED", reason: "INVALID_PLAN" });
  });
});
