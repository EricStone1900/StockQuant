import { createHash } from "node:crypto";

export type RunnerJob = {
  schemaVersion: "v3.1-runner-job-v1";
  testRunId: string;
  experimentId: string;
  imageDigest: string;
  inputArtifact: string;
  outputNamespace: string;
  resources: { cpuMilli: number; memoryMiB: number; timeoutSeconds: number; pidsLimit: number };
  networkPolicy: { mode: "DENY" | "ALLOWLIST"; allowlist: string[] };
};

export type ArtifactRef = {
  schemaVersion: "v3.1-artifact-ref-v1";
  artifactId: string;
  kind: "INPUT" | "GENERATED_CODE" | "RUN_LOG" | "METRICS" | "ERROR" | "CANDIDATE" | "OUTPUT";
  namespace: string;
  sha256: string;
  status: "PENDING" | "PUBLISHED" | "FAILED" | "RETAINED";
  sourceRef: string;
};

export type BudgetReservation = {
  experimentId: string;
  requestedCents: number;
  reservedCents: number;
  spentCents: number;
  status: "RESERVED" | "SETTLED" | "UNKNOWN" | "REJECTED";
};

export type BudgetSnapshotRow = BudgetReservation & { modelCallSettledCents: number; modelCallUnknownReservedCents: number };

export type ModelCallBudgetReservation = {
  experimentId: string;
  modelRunId: string;
  requestFingerprint: string;
  requestedCents: number;
  reservedCents: number;
  spentCents: number;
  status: "RESERVED" | "DISPATCHED" | "UNKNOWN" | "SETTLED" | "REJECTED";
};

export type ModelCallReservationResult = { reservation: ModelCallBudgetReservation; created: boolean };

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const INPUT = /^research\/[^/]+\/[^/]+\/inputs\/[a-f0-9]{64}$/;
const OUTPUT = /^research\/[^/]+\/[^/]+\/outputs$/;
const NAMESPACE = /^research\/([^/]+)\/([^/]+)\/(inputs|outputs)$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const RESOURCE_LIMITS = { cpuMilli: 2000, memoryMiB: 4096, timeoutSeconds: 3600, pidsLimit: 128 } as const;

export function validateRunnerJob(job: RunnerJob): void {
  if (job.schemaVersion !== "v3.1-runner-job-v1") throw new Error("unsupported runner job schema");
  if (!SAFE_ID.test(job.testRunId) || !SAFE_ID.test(job.experimentId) || job.testRunId === "." || job.testRunId === ".." || job.experimentId === "." || job.experimentId === "..") throw new Error("runner job requires safe testRunId and experimentId identifiers");
  if (!DIGEST.test(job.imageDigest)) throw new Error("runner imageDigest must be an immutable sha256 digest");
  if (!INPUT.test(job.inputArtifact)) throw new Error("runner inputArtifact must be a content-addressed input artifact");
  if (!OUTPUT.test(job.outputNamespace)) throw new Error("runner outputNamespace must be the isolated research output namespace");
  const [runFromInput, experimentFromInput] = job.inputArtifact.split("/").slice(1, 3);
  const [runFromOutput, experimentFromOutput] = job.outputNamespace.split("/").slice(1, 3);
  if (runFromInput !== job.testRunId || experimentFromInput !== job.experimentId || runFromOutput !== job.testRunId || experimentFromOutput !== job.experimentId) throw new Error("runner artifact namespace does not match the job");
  const resourceNames = Object.keys(RESOURCE_LIMITS) as (keyof typeof RESOURCE_LIMITS)[];
  if (!job.resources || Object.keys(job.resources).length !== resourceNames.length) throw new Error("runner resources must include exactly cpuMilli, memoryMiB, timeoutSeconds, and pidsLimit");
  for (const name of resourceNames) {
    const value = job.resources[name];
    if (!Number.isInteger(value) || value < 1 || value > RESOURCE_LIMITS[name]) throw new Error(`runner resource ${name} must be an integer between 1 and ${RESOURCE_LIMITS[name]}`);
  }
  if (!job.networkPolicy || !["DENY", "ALLOWLIST"].includes(job.networkPolicy.mode) || !Array.isArray(job.networkPolicy.allowlist) || job.networkPolicy.allowlist.some((host) => typeof host !== "string" || !/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(host))) throw new Error("runner network policy is invalid");
  if (job.networkPolicy.mode === "DENY" && job.networkPolicy.allowlist.length > 0) throw new Error("DENY runner network policy cannot contain an allowlist");
  if (job.networkPolicy.mode === "ALLOWLIST" && job.networkPolicy.allowlist.length === 0) throw new Error("ALLOWLIST runner network policy requires domains");
}

export function validateArtifactRef(ref: ArtifactRef): void {
  if (ref.schemaVersion !== "v3.1-artifact-ref-v1") throw new Error("unsupported artifact schema");
  if (!ref.artifactId || !HASH.test(ref.sha256) || !ref.sourceRef) throw new Error("artifact reference is incomplete");
  const match = NAMESPACE.exec(ref.namespace);
  if (!match) throw new Error("artifact namespace is outside the research boundary");
  if (ref.kind === "INPUT" && match[3] !== "inputs") throw new Error("input artifact must use the inputs namespace");
  if (ref.kind !== "INPUT" && match[3] !== "outputs") throw new Error("output artifact must use the outputs namespace");
}

export function sha256(content: string | Uint8Array): string { return createHash("sha256").update(content).digest("hex"); }

export class BudgetLedger {
  private readonly reservations = new Map<string, BudgetReservation>();
  private readonly modelCalls = new Map<string, ModelCallBudgetReservation>();
  constructor(private readonly stageBudgetCents: number, private readonly maxExperimentBudgetCents: number, private readonly warningPercent = 80) {}

  reserve(experimentId: string, requestedCents: number): BudgetReservation {
    if (!SAFE_ID.test(experimentId) || experimentId === "." || experimentId === ".." || !Number.isInteger(this.stageBudgetCents) || this.stageBudgetCents < 1 || !Number.isInteger(this.maxExperimentBudgetCents) || this.maxExperimentBudgetCents < 1) throw new Error("budget ledger configuration or experimentId is invalid");
    if (!Number.isInteger(requestedCents) || requestedCents < 1 || requestedCents > this.maxExperimentBudgetCents) throw new Error("experiment budget exceeds the configured hard limit");
    const current = this.reservations.get(experimentId);
    if (current) {
      if (current.requestedCents !== requestedCents) throw new Error("experiment already has a different budget reservation");
      if (current.status === "UNKNOWN") throw new Error("budget status is UNKNOWN; reconcile the original experiment before retrying");
      if (current.status === "REJECTED") throw new Error("rejected budget cannot be reserved again");
      return current;
    }
    const used = [...this.reservations.values()].reduce((sum, item) => sum + (item.status === "SETTLED" ? item.spentCents : item.status === "REJECTED" ? 0 : item.reservedCents), 0);
    if (used + requestedCents > this.stageBudgetCents) throw new Error("stage budget exhausted");
    const reservation = { experimentId, requestedCents, reservedCents: requestedCents, spentCents: 0, status: "RESERVED" as const };
    this.reservations.set(experimentId, reservation);
    return reservation;
  }

  settle(experimentId: string, spentCents: number | "UNKNOWN"): BudgetReservation {
    const current = this.reservations.get(experimentId);
    if (!current) throw new Error("budget reservation not found");
    if (spentCents === "UNKNOWN") {
      if (current.status === "UNKNOWN") return current;
      if (current.status !== "RESERVED") throw new Error("only a reserved budget can become UNKNOWN");
      return this.update({ ...current, status: "UNKNOWN" });
    }
    if (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > current.reservedCents) throw new Error("settled cost is outside the reserved budget");
    if (current.status === "SETTLED") {
      if (current.spentCents !== spentCents) throw new Error("settled budget cannot be changed");
      return current;
    }
    if (current.status === "REJECTED") throw new Error("rejected budget cannot be settled");
    const calls = [...this.modelCalls.values()].filter((item) => item.experimentId === experimentId);
    if (calls.some((item) => item.status === "RESERVED" || item.status === "DISPATCHED" || item.status === "UNKNOWN")) throw new Error("model call budget remains unresolved");
    const settledCallsCents = calls.reduce((sum, item) => sum + (item.status === "SETTLED" ? item.spentCents : 0), 0);
    if (spentCents < settledCallsCents) throw new Error("experiment settlement is below its settled model call costs");
    return this.update({ ...current, spentCents, status: "SETTLED" });
  }

  warningThresholdCents(): number { return Math.ceil(this.stageBudgetCents * this.warningPercent / 100); }
  get(experimentId: string): BudgetReservation | null { return this.reservations.get(experimentId) ?? null; }
  snapshot(experimentIds: string[]): BudgetSnapshotRow[] {
    return [...new Set(experimentIds)].flatMap((experimentId) => {
      const reservation = this.get(experimentId);
      if (!reservation) return [];
      const calls = [...this.modelCalls.values()].filter((call) => call.experimentId === experimentId);
      return [{
        ...reservation,
        modelCallSettledCents: calls.filter((call) => call.status === "SETTLED").reduce((sum, call) => sum + call.spentCents, 0),
        modelCallUnknownReservedCents: calls.filter((call) => call.status === "UNKNOWN" || call.status === "DISPATCHED").reduce((sum, call) => sum + call.reservedCents, 0),
      }];
    });
  }

  reserveModelCall(experimentId: string, modelRunId: string, requestFingerprint: string, requestedCents: number): ModelCallReservationResult {
    if (!SAFE_ID.test(experimentId) || !SAFE_ID.test(modelRunId) || experimentId === "." || experimentId === ".." || modelRunId === "." || modelRunId === ".." || !HASH.test(requestFingerprint)) throw new Error("model call identity or request fingerprint is invalid");
    if (!Number.isInteger(requestedCents) || requestedCents < 1) throw new Error("model call reservation must be a positive integer number of cents");
    const experiment = this.reservations.get(experimentId);
    if (!experiment || experiment.status !== "RESERVED") throw new Error("experiment budget is unavailable for a model call");
    const key = `${experimentId}\0${modelRunId}`;
    const existing = this.modelCalls.get(key);
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint || existing.requestedCents !== requestedCents) throw new Error("modelRunId was reused with different request or budget");
      return { reservation: existing, created: false };
    }
    const used = [...this.modelCalls.values()].filter((item) => item.experimentId === experimentId).reduce((sum, item) => sum + (item.status === "RESERVED" || item.status === "DISPATCHED" || item.status === "UNKNOWN" ? item.reservedCents : item.status === "SETTLED" ? item.spentCents : 0), 0);
    if (used + requestedCents > experiment.requestedCents) throw new Error("experiment model-call budget exhausted");
    const reservation: ModelCallBudgetReservation = { experimentId, modelRunId, requestFingerprint, requestedCents, reservedCents: requestedCents, spentCents: 0, status: "RESERVED" };
    this.modelCalls.set(key, reservation);
    return { reservation, created: true };
  }

  dispatchModelCall(experimentId: string, modelRunId: string): ModelCallBudgetReservation {
    const current = this.requireModelCall(experimentId, modelRunId);
    if (current.status !== "RESERVED") throw new Error("model call can only be dispatched from RESERVED state");
    return this.updateModelCall({ ...current, status: "DISPATCHED" });
  }

  markModelCallUnknown(experimentId: string, modelRunId: string): ModelCallBudgetReservation {
    const current = this.requireModelCall(experimentId, modelRunId);
    if (current.status === "UNKNOWN") return current;
    if (current.status !== "DISPATCHED") throw new Error("only a dispatched model call can become UNKNOWN");
    return this.updateModelCall({ ...current, status: "UNKNOWN" });
  }

  settleModelCall(experimentId: string, modelRunId: string, spentCents: number): ModelCallBudgetReservation {
    const current = this.requireModelCall(experimentId, modelRunId);
    if (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > current.reservedCents) throw new Error("settled model call cost is outside the reservation");
    if (current.status === "SETTLED") {
      if (current.spentCents !== spentCents) throw new Error("settled model call cost cannot be changed");
      return current;
    }
    if (current.status !== "DISPATCHED" && current.status !== "UNKNOWN") throw new Error("only a dispatched or UNKNOWN model call can be settled");
    return this.updateModelCall({ ...current, spentCents, status: "SETTLED" });
  }

  rejectModelCall(experimentId: string, modelRunId: string): ModelCallBudgetReservation {
    const current = this.requireModelCall(experimentId, modelRunId);
    if (current.status !== "RESERVED") throw new Error("only an undispatched model call reservation can be rejected");
    return this.updateModelCall({ ...current, status: "REJECTED" });
  }

  getModelCall(experimentId: string, modelRunId: string): ModelCallBudgetReservation | null { return this.modelCalls.get(`${experimentId}\0${modelRunId}`) ?? null; }

  reject(experimentId: string): BudgetReservation {
    const current = this.reservations.get(experimentId);
    if (!current) throw new Error("budget reservation not found");
    if (current.status !== "RESERVED") throw new Error("only a reserved budget can be rejected");
    if ([...this.modelCalls.values()].some((item) => item.experimentId === experimentId && item.status !== "REJECTED")) throw new Error("experiment with model call reservations cannot be rejected");
    return this.update({ ...current, status: "REJECTED" });
  }
  private update(value: BudgetReservation): BudgetReservation { this.reservations.set(value.experimentId, value); return value; }
  private requireModelCall(experimentId: string, modelRunId: string): ModelCallBudgetReservation {
    const reservation = this.getModelCall(experimentId, modelRunId);
    if (!reservation) throw new Error("model call reservation not found");
    return reservation;
  }
  private updateModelCall(value: ModelCallBudgetReservation): ModelCallBudgetReservation { this.modelCalls.set(`${value.experimentId}\0${value.modelRunId}`, value); return value; }
}
