import type { SnapshotSamplingObservation } from "../ports/snapshot-observation.js";

/** Plan must be loaded from a trusted, immutable run-scoped manifest, never from a client request. */
export type LocalSnapshotScope = { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string };
export type LocalSnapshotPlan = { planId: string; scope: LocalSnapshotScope; securityId: "600000.SH"; dataMode: "FIXTURE"; tasks: Array<{ taskId: string; sourceId: string; scheduledAt: string }> };
export type LocalSnapshotTaskFact = { taskId: string; scope: LocalSnapshotScope; dataMode: string; sourceId: string; scheduledAt: string; status: string; completedAt: string | null; observations: SnapshotSamplingObservation[] };
export type LocalSnapshotBarrierResult =
  | { status: "WAITING"; reason: "TASKS_INCOMPLETE" | "NO_QUALIFYING_SNAPSHOT" }
  | { status: "REJECTED"; reason: "INVALID_PLAN" | "TASK_MISMATCH" | "TASK_FAILED" | "OBSERVATION_INVALID" | "OBSERVATION_AMBIGUOUS" }
  | { status: "SELECTED"; planId: string; taskId: string; observation: SnapshotSamplingObservation };
const timestamp = (value: unknown): number => typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : NaN;
const sameScope = (a: LocalSnapshotScope, b: LocalSnapshotScope) => !!b && a.market === b.market && a.ownerId === b.ownerId && a.accountId === b.accountId && a.namespace === b.namespace && a.testRunId === b.testRunId;

/**
 * Selects only within the complete, immutable planned task set; absence from an
 * arbitrary database query is not a watermark. A missing or unfinished task is
 * WAITING. This function has no storage, provider or execution side effects.
 */
export function selectV24LocalSnapshot(input: { plan: LocalSnapshotPlan; tasks: LocalSnapshotTaskFact[]; acceptedAt: string; evaluatedAt: string; windowEnd: string }): LocalSnapshotBarrierResult {
  const { plan } = input; const accepted = timestamp(input.acceptedAt); const evaluated = timestamp(input.evaluatedAt); const end = timestamp(input.windowEnd);
  if (!plan || !plan.planId || plan.dataMode !== "FIXTURE" || plan.securityId !== "600000.SH" || !plan.scope?.ownerId || !plan.scope.accountId || !plan.scope.testRunId || plan.scope.market !== "CN_A" || plan.scope.namespace !== `v24-paper-v2-${plan.scope.testRunId}` || !Array.isArray(plan.tasks) || plan.tasks.length < 1 || plan.tasks.length > 16 || ![accepted, evaluated, end].every(Number.isFinite) || accepted >= end || evaluated < accepted || evaluated >= end) return { status: "REJECTED", reason: "INVALID_PLAN" };
  const ids = new Set<string>(); let previous = accepted;
  for (const item of plan.tasks) {
    const scheduled = timestamp(item.scheduledAt);
    if (!item || !item.taskId || ids.has(item.taskId) || typeof item.sourceId !== "string" || !item.sourceId.startsWith("fixture:") || !Number.isFinite(scheduled) || scheduled <= previous || scheduled >= end) return { status: "REJECTED", reason: "INVALID_PLAN" };
    ids.add(item.taskId); previous = scheduled;
  }
  const byId = new Map<string, LocalSnapshotTaskFact>();
  for (const task of input.tasks) {
    if (!task || !ids.has(task.taskId) || byId.has(task.taskId)) return { status: "REJECTED", reason: "TASK_MISMATCH" };
    byId.set(task.taskId, task);
  }
  if (byId.size !== plan.tasks.length) return { status: "WAITING", reason: "TASKS_INCOMPLETE" };
  const observations: Array<{ taskId: string; observation: SnapshotSamplingObservation; at: number }> = [];
  for (const item of plan.tasks) {
    const task = byId.get(item.taskId)!;
    if (!sameScope(plan.scope, task.scope) || task.dataMode !== "FIXTURE" || task.sourceId !== item.sourceId || timestamp(task.scheduledAt) !== timestamp(item.scheduledAt)) return { status: "REJECTED", reason: "TASK_MISMATCH" };
    if (task.status === "QUEUED") return { status: "WAITING", reason: "TASKS_INCOMPLETE" };
    if (task.status !== "COMPLETED_FIXTURE") return { status: "REJECTED", reason: "TASK_FAILED" };
    const completed = timestamp(task.completedAt);
    if (!Number.isFinite(completed) || completed < timestamp(task.scheduledAt)) return { status: "REJECTED", reason: "TASK_MISMATCH" };
    if (completed > evaluated) return { status: "WAITING", reason: "TASKS_INCOMPLETE" };
    if (!Array.isArray(task.observations)) return { status: "REJECTED", reason: "OBSERVATION_INVALID" };
    const matches = task.observations.filter((value) => value.securityId === plan.securityId);
    if (matches.length !== 1) return { status: "REJECTED", reason: matches.length > 1 ? "OBSERVATION_AMBIGUOUS" : "OBSERVATION_INVALID" };
    for (const observation of matches) {
      const observed = timestamp(observation.observedAt); const ingested = timestamp(observation.ingestedAt); const available = timestamp(observation.availableAt);
      if (!observation.snapshotId || observation.dataMode !== "FIXTURE" || observation.sourceId !== item.sourceId || ![observed, ingested, available].every(Number.isFinite) || observed !== timestamp(item.scheduledAt) || ingested < observed || available < ingested || available > completed || !/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/u.test(observation.price) || Number(observation.price) <= 0 || !["READY", "STALE", "UNKNOWN"].includes(observation.status) || (observation.status === "READY" ? observation.freshness !== "FRESH" : observation.status !== observation.freshness)) return { status: "REJECTED", reason: "OBSERVATION_INVALID" };
      observations.push({ taskId: task.taskId, observation, at: observed });
    }
  }
  observations.sort((a, b) => a.at - b.at || a.taskId.localeCompare(b.taskId) || a.observation.snapshotId.localeCompare(b.observation.snapshotId));
  const seen = new Set<string>();
  for (const row of observations) {
    if (seen.has(row.observation.snapshotId)) return { status: "REJECTED", reason: "OBSERVATION_AMBIGUOUS" };
    seen.add(row.observation.snapshotId);
  }
  const selected = observations.find((row) => row.at > accepted && row.at < end && timestamp(row.observation.availableAt) <= evaluated && row.observation.status === "READY" && evaluated - row.at <= 60000 && evaluated >= row.at);
  return selected ? { status: "SELECTED", planId: plan.planId, taskId: selected.taskId, observation: selected.observation } : { status: "WAITING", reason: "NO_QUALIFYING_SNAPSHOT" };
}
