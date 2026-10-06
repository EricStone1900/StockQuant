export type ProjectScope = "DATA_READ" | "DATA_WRITE" | "DATA_EXPORT";
export type ProjectPolicy = { projectId: string; maxConcurrentRuns: number; maxSecuritiesPerSubscription: number };
