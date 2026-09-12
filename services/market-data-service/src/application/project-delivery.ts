import { createHash } from "node:crypto";

export type ProjectScope = "DATA_READ" | "DATA_WRITE" | "DATA_EXPORT";
export type ProjectActor = { projectId: string; scopes: Set<ProjectScope> };
export type ProjectPolicy = { projectId: string; maxConcurrentRuns: number; maxSecuritiesPerSubscription: number };

export class ProjectAccessDenied extends Error { constructor(message: string) { super(message); this.name = "ProjectAccessDenied"; } }
export class ProjectQuotaExceeded extends Error { constructor(message: string) { super(message); this.name = "ProjectQuotaExceeded"; } }
export class DataVersionConflict extends Error { constructor(message: string) { super(message); this.name = "DataVersionConflict"; } }

export function assertProjectAccess(actor: ProjectActor, resourceProjectId: string, scope: ProjectScope): void {
  if (actor.projectId !== resourceProjectId) throw new ProjectAccessDenied("project scope does not match resource owner");
  if (!actor.scopes.has(scope)) throw new ProjectAccessDenied(`missing scope: ${scope}`);
}

export class FairProjectQuota {
  private readonly active = new Map<string, number>();
  private readonly queue: string[] = [];
  constructor(private readonly policies: Map<string, ProjectPolicy>) {}

  admit(projectId: string): void {
    const policy = this.policies.get(projectId);
    if (!policy) throw new ProjectAccessDenied("unknown project");
    const current = this.active.get(projectId) ?? 0;
    if (current >= policy.maxConcurrentRuns) {
      if (!this.queue.includes(projectId)) this.queue.push(projectId);
      throw new ProjectQuotaExceeded("project concurrency quota exceeded");
    }
    this.active.set(projectId, current + 1);
  }

  release(projectId: string): void { const current = this.active.get(projectId) ?? 0; if (current <= 1) this.active.delete(projectId); else this.active.set(projectId, current - 1); }
  nextQueued(): string | null { const next = this.queue.shift() ?? null; return next; }
  activeCount(projectId: string): number { return this.active.get(projectId) ?? 0; }
}

export function physicalDedupeKey(input: { source: string; market: string; securityId: string; frequency: string; adjustment: string; windowStart: string; windowEnd: string; adapterVersion: string }): string {
  return [input.source, input.market, input.securityId, input.frequency, input.adjustment, input.windowStart, input.windowEnd, input.adapterVersion].join("|");
}

export type Page<T> = { dataVersion: string; items: T[]; nextCursor: string | null };
export function paginateVersioned<T>(items: T[], dataVersion: string, requestedVersion: string, cursor: number, pageSize: number): Page<T> {
  if (requestedVersion !== dataVersion) throw new DataVersionConflict("requested DataVersion is no longer available");
  const boundedSize = Math.max(1, Math.min(pageSize, 500));
  const page = items.slice(cursor, cursor + boundedSize);
  const next = cursor + page.length < items.length ? String(cursor + page.length) : null;
  return { dataVersion, items: page, nextCursor: next };
}

export function exportWithManifest<T>(projectId: string, dataVersion: string, items: T[]): { projectId: string; dataVersion: string; rowCount: number; sha256: string; items: T[] } {
  const content = JSON.stringify(items);
  return { projectId, dataVersion, rowCount: items.length, sha256: createHash("sha256").update(content).digest("hex"), items };
}
