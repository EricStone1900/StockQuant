import type { ProjectScope } from "../domain/project-access.js";

export function parseProjectTokenConfig(value: string | undefined): Array<{ projectId: string; token: string; scopes?: ProjectScope[]; maxConcurrentRuns?: number; maxSecurities?: number }> {
  if (!value) return [];
  const config = JSON.parse(value) as Record<string, { token: string; scopes?: ProjectScope[]; maxConcurrentRuns?: number; maxSecurities?: number }>;
  return Object.entries(config).map(([projectId, item]) => ({ projectId, ...item }));
}
