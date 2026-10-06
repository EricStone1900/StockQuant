import { createHash } from "node:crypto";

export type ArtifactRef = {
  schemaVersion: "v3.1-artifact-ref-v1";
  artifactId: string;
  kind: "INPUT" | "GENERATED_CODE" | "RUN_LOG" | "METRICS" | "ERROR" | "CANDIDATE" | "OUTPUT";
  namespace: string;
  sha256: string;
  status: "PENDING" | "PUBLISHED" | "FAILED" | "RETAINED" | "EXPIRED";
  sourceRef: string;
  expiresAt?: string | null;
};

export type ArtifactRefStatus = ArtifactRef["status"];

/** Lifecycle transitions are terminal after expiry and cannot return to publication. */
export function canTransitionArtifactStatus(current: ArtifactRefStatus, next: ArtifactRefStatus): boolean {
  if (current === next) return true;
  if (current === "PENDING") return next === "PUBLISHED" || next === "FAILED";
  if (current === "PUBLISHED") return next === "RETAINED" || next === "EXPIRED";
  if (current === "RETAINED") return next === "EXPIRED";
  return false;
}

const HASH = /^[a-f0-9]{64}$/;
const NAMESPACE = /^research\/([^/]+)\/([^/]+)\/(inputs|outputs)$/;

export function validateArtifactRef(ref: ArtifactRef): void {
  if (ref.schemaVersion !== "v3.1-artifact-ref-v1") throw new Error("unsupported artifact schema");
  if (!ref.artifactId || !HASH.test(ref.sha256) || !ref.sourceRef) throw new Error("artifact reference is incomplete");
  const match = NAMESPACE.exec(ref.namespace);
  if (!match) throw new Error("artifact namespace is outside the research boundary");
  if (ref.kind === "INPUT" && match[3] !== "inputs") throw new Error("input artifact must use the inputs namespace");
  if (ref.kind !== "INPUT" && match[3] !== "outputs") throw new Error("output artifact must use the outputs namespace");
  if (ref.expiresAt !== undefined && ref.expiresAt !== null && !Number.isFinite(Date.parse(ref.expiresAt))) throw new Error("artifact expiresAt must be a valid timestamp");
  if (ref.status === "EXPIRED" && !ref.expiresAt) throw new Error("expired artifact must include an expiresAt timestamp");
}

export function expireArtifactRef(ref: ArtifactRef, now: Date): ArtifactRef {
  validateArtifactRef(ref);
  if (!Number.isFinite(now.getTime())) throw new Error("artifact expiry requires a valid observation time");
  if (!ref.expiresAt || Date.parse(ref.expiresAt) > now.getTime()) throw new Error("artifact retention period has not elapsed");
  if (ref.status !== "PUBLISHED" && ref.status !== "RETAINED") throw new Error(`artifact status ${ref.status} cannot expire`);
  return { ...ref, status: "EXPIRED" };
}

export function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}
