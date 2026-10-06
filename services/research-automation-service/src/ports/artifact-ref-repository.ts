import type { ArtifactRef } from "../domain/artifact-ref.js";

export interface ArtifactRefRepository {
  save(ref: ArtifactRef): Promise<ArtifactRef>;
  get(namespace: string, artifactId: string): Promise<ArtifactRef | null>;
  listAll(): Promise<ArtifactRef[]>;
}
