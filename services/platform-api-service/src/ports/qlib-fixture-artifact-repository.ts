export type QlibFixtureArtifact = {
  artifactId: string;
  testRunId: string;
  ownerId: string;
  mediaType: "application/vnd.stockquant.qlib-fixture-model+json";
  sha256: string;
  status: "PUBLISHED" | "RETAINED" | "EXPIRED";
  expiresAt?: string | null;
  payload: { schemaVersion: "v2.3-qlib-fixture-artifact-v1" | "v1.2-qlib-strategy-artifact-v1"; modelBase64?: string; predictions?: number[]; [key: string]: unknown };
};

export interface QlibFixtureArtifactRepository {
  migrate(): Promise<void>;
  save(input: Omit<QlibFixtureArtifact, "artifactId" | "sha256" | "status">): Promise<QlibFixtureArtifact>;
  find(testRunId: string, artifactId: string, ownerId: string): Promise<QlibFixtureArtifact>;
  findLifecycle(testRunId: string, artifactId: string, ownerId: string): Promise<Pick<QlibFixtureArtifact, "status" | "expiresAt">>;
  transition(testRunId: string, artifactId: string, ownerId: string, status: QlibFixtureArtifact["status"]): Promise<void>;
  setExpiry(testRunId: string, artifactId: string, ownerId: string, expiresAt: string): Promise<void>;
}
