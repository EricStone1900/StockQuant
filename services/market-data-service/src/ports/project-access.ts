import type { ProjectPolicy, ProjectScope } from "../domain/project-access.js";

export type StoredProject = ProjectPolicy & { scopes: ProjectScope[]; active: boolean };
export class ProjectAuthenticationError extends Error { constructor(message: string) { super(message); this.name = "ProjectAuthenticationError"; } }
export class ProjectQuotaRepositoryError extends Error { constructor(message: string) { super(message); this.name = "ProjectQuotaRepositoryError"; } }

export interface ProjectAccessPort {
  migrate(): Promise<void>;
  register(projectId: string, token: string, scopes?: ProjectScope[], maxConcurrentRuns?: number, maxSecurities?: number): Promise<StoredProject>;
  authenticate(projectId: string, token: string): Promise<StoredProject>;
  reserveRun(projectId: string): Promise<StoredProject>;
  releaseRun(projectId: string): Promise<void>;
  recordQueueMetric(projectId: string, event: "queued" | "admitted" | "rejected"): Promise<void>;
  queueMetrics(projectId: string): Promise<{ projectId: string; queued: number; admitted: number; rejected: number }>;
}
