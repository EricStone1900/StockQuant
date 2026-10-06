export type AuthorizationScope = {
  authorizationId: string;
  namespace: string;
  accountId: string;
};

export interface ExecutionAuthorizationRepository {
  ready(): Promise<void>;
  grantPaper(input: { authorizationId: string; namespace: string; accountId: string; commandHash: string }): Promise<{ authorizationId: string; status: string; expiresAt: Date } | null>;
  revokePaper(input: AuthorizationScope & { reason: string }): Promise<{ status: "REVOKED"; replayed: boolean; revokedAt: Date } | { status: "NOT_FOUND" } | { status: "CONFLICT" }>;
  validatePaper(input: { authorizationId: string; accountId: string; commandHash: string }): Promise<"VALID" | "REPLAYED" | "INVALID">;
  grantReplay(input: { authorizationId: string; namespace: string; accountId: string; commandHash: string }): Promise<string>;
  validateReplay(input: { authorizationId: string; accountId: string; commandHash: string }): Promise<"VALID" | "REPLAYED" | "INVALID">;
}
