export type ArtifactContentAddress = { namespace: string; artifactId: string; sha256: string };
export declare class LocalArtifactContentStore {
  constructor(root: string);
  pathFor(address: ArtifactContentAddress): string;
  publish(address: ArtifactContentAddress, content: Uint8Array): Promise<void>;
  read(address: ArtifactContentAddress): Promise<Uint8Array>;
  size(address: ArtifactContentAddress): Promise<number>;
  /** Idempotently removes bytes only when the target is a regular file matching the address hash. */
  remove(address: ArtifactContentAddress): Promise<void>;
}
