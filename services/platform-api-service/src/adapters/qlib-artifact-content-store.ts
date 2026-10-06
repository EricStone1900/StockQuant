import { LocalArtifactContentStore } from "@stockquant/artifact-content-store";

/** Platform adapter for Qlib bytes in the same immutable content volume used by Research Automation. */
export class QlibArtifactContentStore {
  private readonly store: LocalArtifactContentStore;
  constructor(root: string) { this.store = new LocalArtifactContentStore(root); }

  address(testRunId: string, artifactId: string, sha256: string) {
    return { namespace: `research/${testRunId}/qlib-fixture`, artifactId, sha256 };
  }
  publish(testRunId: string, artifactId: string, sha256: string, bytes: Uint8Array): Promise<void> {
    return this.store.publish(this.address(testRunId, artifactId, sha256), bytes);
  }
  read(testRunId: string, artifactId: string, sha256: string): Promise<Uint8Array> {
    return this.store.read(this.address(testRunId, artifactId, sha256));
  }
}
