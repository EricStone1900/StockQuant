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
  kind: "INPUT" | "GENERATED_CODE" | "RUN_LOG" | "METRICS" | "ERROR" | "CANDIDATE";
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

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const INPUT = /^research\/[^/]+\/[^/]+\/inputs\/[a-f0-9]{64}$/;
const OUTPUT = /^research\/[^/]+\/[^/]+\/outputs$/;
const NAMESPACE = /^research\/([^/]+)\/([^/]+)\/(inputs|outputs)$/;

export function validateRunnerJob(job: RunnerJob): void {
  if (job.schemaVersion !== "v3.1-runner-job-v1") throw new Error("unsupported runner job schema");
  if (!job.testRunId || !job.experimentId) throw new Error("runner job requires testRunId and experimentId");
  if (!DIGEST.test(job.imageDigest)) throw new Error("runner imageDigest must be an immutable sha256 digest");
  if (!INPUT.test(job.inputArtifact)) throw new Error("runner inputArtifact must be a content-addressed input artifact");
  if (!OUTPUT.test(job.outputNamespace)) throw new Error("runner outputNamespace must be the isolated research output namespace");
  const [runFromInput, experimentFromInput] = job.inputArtifact.split("/").slice(1, 3);
  const [runFromOutput, experimentFromOutput] = job.outputNamespace.split("/").slice(1, 3);
  if (runFromInput !== job.testRunId || experimentFromInput !== job.experimentId || runFromOutput !== job.testRunId || experimentFromOutput !== job.experimentId) throw new Error("runner artifact namespace does not match the job");
  for (const [name, value] of Object.entries(job.resources)) if (!Number.isInteger(value) || value < 1) throw new Error(`runner resource ${name} must be a positive integer`);
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
  constructor(private readonly stageBudgetCents: number, private readonly maxExperimentBudgetCents: number, private readonly warningPercent = 80) {}

  reserve(experimentId: string, requestedCents: number): BudgetReservation {
    if (!Number.isInteger(requestedCents) || requestedCents < 1 || requestedCents > this.maxExperimentBudgetCents) throw new Error("experiment budget exceeds the configured hard limit");
    const used = [...this.reservations.values()].reduce((sum, item) => sum + item.reservedCents, 0);
    if (used + requestedCents > this.stageBudgetCents) throw new Error("stage budget exhausted");
    const reservation = { experimentId, requestedCents, reservedCents: requestedCents, spentCents: 0, status: "RESERVED" as const };
    this.reservations.set(experimentId, reservation);
    return reservation;
  }

  settle(experimentId: string, spentCents: number | "UNKNOWN"): BudgetReservation {
    const current = this.reservations.get(experimentId);
    if (!current) throw new Error("budget reservation not found");
    if (spentCents === "UNKNOWN") return this.update({ ...current, status: "UNKNOWN" });
    if (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > current.reservedCents) throw new Error("settled cost is outside the reserved budget");
    return this.update({ ...current, spentCents, status: "SETTLED" });
  }

  warningThresholdCents(): number { return Math.ceil(this.stageBudgetCents * this.warningPercent / 100); }
  get(experimentId: string): BudgetReservation | null { return this.reservations.get(experimentId) ?? null; }
  private update(value: BudgetReservation): BudgetReservation { this.reservations.set(value.experimentId, value); return value; }
}
