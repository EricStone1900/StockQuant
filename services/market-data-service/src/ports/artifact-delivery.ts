export interface ArtifactDeliveryPort {
  migrate(): Promise<void>;
  publishRows(projectId: string, artifactId: string, dataVersion: string, items: unknown[]): Promise<number>;
  page(projectId: string, artifactId: string, requestedVersion: string, cursor: number, pageSize: number): Promise<{ dataVersion: string; items: unknown[]; nextCursor: string | null }>;
  createTask(taskId: string, fixtureVersion: string): Promise<ArtifactTaskRecord>;
  findTask(taskId: string): Promise<ArtifactTaskRecord | null>;
  cancelTask(taskId: string): Promise<ArtifactTaskRecord | null>;
  claimTask(workerId: string, leaseMs: number): Promise<ArtifactTaskClaim | null>;
  publishTask(taskId: string, fence: number, bytes: Uint8Array, sha256: string): Promise<ArtifactTaskRecord | null>;
  failTask(taskId: string, fence: number, message: string): Promise<void>;
  readTaskArtifact(taskId: string): Promise<PublishedTaskArtifact | null>;
}

export type ArtifactTaskRecord = {
  taskId: string;
  artifactId: string;
  fixtureVersion: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  sha256: string | null;
  error: string | null;
  fence: number;
  createdAt: string;
  updatedAt: string;
};

export type ArtifactTaskClaim = ArtifactTaskRecord & { status: "RUNNING"; fence: number };

export type PublishedTaskArtifact = {
  taskId: string;
  artifactId: string;
  fixtureVersion: string;
  sha256: string;
  bytes: Uint8Array;
  createdAt: string;
};
