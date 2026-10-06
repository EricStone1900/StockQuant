import type { ArtifactRef } from "../domain/artifact-ref.js";

export interface ArtifactContentStore {
  publish(ref: ArtifactRef, content: Uint8Array): Promise<ArtifactRef>;
  read(ref: ArtifactRef): Promise<Uint8Array>;
  size(ref: ArtifactRef): Promise<number>;
  remove(ref: ArtifactRef): Promise<void>;
}
