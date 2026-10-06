import type { ArtifactRef } from "../domain/artifact-ref.js";

export type ArtifactRollbackStatus = "REMOVED_UNREFERENCED" | "PRESERVED_REFERENCED" | "PRESERVED_UNCERTAIN";

/** Remove staged bytes only when the authoritative metadata read proves no durable reference exists. */
export async function rollbackUnreferencedArtifact(input: {
  ref: ArtifactRef;
  readPersistedRef: (ref: ArtifactRef) => Promise<ArtifactRef | null>;
  removeBytes: (ref: ArtifactRef) => Promise<void>;
}): Promise<ArtifactRollbackStatus> {
  let persisted: ArtifactRef | null;
  try {
    persisted = await input.readPersistedRef(input.ref);
  } catch {
    // A failed read cannot distinguish a rolled-back transaction from a committed transaction
    // whose acknowledgement was lost. Keep the bytes for later, reference-aware reconciliation.
    return "PRESERVED_UNCERTAIN";
  }
  if (persisted) return "PRESERVED_REFERENCED";
  try {
    await input.removeBytes(input.ref);
    return "REMOVED_UNREFERENCED";
  } catch {
    return "PRESERVED_UNCERTAIN";
  }
}
