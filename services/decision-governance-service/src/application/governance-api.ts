import { createHash, randomUUID } from "node:crypto";
import { assessCandidateMandateBinding, type CandidateMandateBindingCommand } from "../domain/candidate-mandate-binding.js";
import { isReplayAuthorizationAllowed } from "../domain/authorization-policy.js";
import { validatePaperFixtureGrant } from "../domain/paper-fixture-authorization.js";
import type { ApprovedRegistryClient } from "../ports/approved-registry-client.js";
import type { ExecutionAuthorizationRepository } from "../ports/execution-authorization-repository.js";
import { authorizeGovernanceRequest, type GovernanceTokens } from "./service-auth.js";

const stable = (value: unknown): unknown => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]))
    : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export type GovernanceRequest = { method: string; pathname: string; serviceId?: string; authorization?: string; rawBody?: string };
export type GovernanceResponse = { status: number; body: unknown };

export class GovernanceApi {
  constructor(private readonly repository: ExecutionAuthorizationRepository, private readonly tokens: GovernanceTokens, private readonly registry: ApprovedRegistryClient) {}

  async ready(): Promise<boolean> {
    try { await this.repository.ready(); return true; } catch { return false; }
  }

  authorized(request: GovernanceRequest): boolean {
    return authorizeGovernanceRequest({ method: request.method, pathname: request.pathname, serviceId: request.serviceId, authorization: request.authorization, tokens: this.tokens });
  }

  async handle(request: GovernanceRequest): Promise<GovernanceResponse> {
    if (!this.authorized(request)) return { status: 403, body: { error: "service identity or route scope is not allowed" } };
    if (request.pathname === "/internal/v1/candidate-mandates/readiness") return this.assessCandidateMandate(request.rawBody ?? "");
    let body: unknown;
    try { body = JSON.parse(request.rawBody ?? ""); } catch { return { status: 422, body: { error: "invalid request JSON" } }; }
    if (!isRecord(body)) return { status: 422, body: { error: "invalid request body" } };
    try {
      if (request.method === "POST" && request.pathname === "/internal/v1/paper-authorizations") return await this.grantPaper(body);
      if (request.method === "POST" && request.pathname === "/internal/v1/paper-authorizations/revoke") return await this.revokePaper(body);
      if (request.method === "POST" && request.pathname === "/internal/v1/paper-authorizations/validate") return this.validatePaper(body);
      if (request.method === "POST" && request.pathname === "/internal/v1/authorizations") return await this.grantReplay(body);
      if (request.method === "POST" && request.pathname === "/internal/v1/authorizations/validate") return this.validateReplay(body);
      return { status: 404, body: { error: "not found" } };
    } catch (error) { return { status: 422, body: { error: error instanceof Error ? error.message : "invalid request" } }; }
  }

  private async assessCandidateMandate(rawBody: string): Promise<GovernanceResponse> {
    if (Buffer.byteLength(rawBody, "utf8") > 16384) return { status: 413, body: { error: "candidate Mandate binding request exceeds 16 KiB" } };
    try {
      const command = JSON.parse(rawBody) as CandidateMandateBindingCommand;
      const result = await assessCandidateMandateBinding(command, (fingerprint) => this.registry.getApprovedPromotionRegistryVersion(fingerprint).catch(() => ({ status: 503 })));
      return { status: result.status === "WAITING" ? 503 : result.status === "REJECTED" ? 422 : 200, body: result };
    } catch (error) { return { status: 422, body: { error: error instanceof Error ? error.message : "invalid candidate Mandate binding request" } }; }
  }

  private async grantPaper(body: Record<string, unknown>): Promise<GovernanceResponse> {
    if (!validatePaperFixtureGrant(body.grant)) return { status: 422, body: { error: "only the frozen V2.4 isolated Fixture Paper grant is supported" } };
    const grant = body.grant;
    const row = await this.repository.grantPaper({ authorizationId: randomUUID(), namespace: grant.namespace, accountId: grant.accountId, commandHash: hash(grant) });
    if (!row) return { status: 409, body: { error: "Paper grant conflicts with a different command in this TestRun namespace" } };
    return { status: 200, body: { authorizationId: row.authorizationId, status: row.status, expiresAt: row.expiresAt.toISOString(), scope: { testRunId: grant.testRunId, ownerId: grant.ownerId, accountId: grant.accountId, namespace: grant.namespace, strategyVersion: grant.mandate.strategyVersion, policyVersion: grant.policy.policyVersion, mandateVersion: grant.mandate.mandateVersion } } };
  }

  private async revokePaper(body: Record<string, unknown>): Promise<GovernanceResponse> {
    const { authorizationId, namespace, accountId, reason } = body;
    if (typeof authorizationId !== "string" || typeof namespace !== "string" || typeof accountId !== "string" || typeof reason !== "string" || !reason.trim() || reason.trim().length > 250) return { status: 422, body: { error: "authorizationId, namespace, accountId and a 1-250 character reason are required" } };
    const result = await this.repository.revokePaper({ authorizationId, namespace, accountId, reason: reason.trim() });
    if (result.status === "NOT_FOUND") return { status: 404, body: { error: "authorization not found in the exact namespace and account" } };
    if (result.status === "CONFLICT") return { status: 409, body: { error: "authorization is already consumed, revoked with another reason, or cannot be revoked" } };
    return { status: 200, body: { authorizationId, status: result.status, replayed: result.replayed, revokedAt: result.revokedAt.toISOString() } };
  }

  private async validatePaper(body: Record<string, unknown>): Promise<GovernanceResponse> {
    const result = await this.repository.validatePaper({ authorizationId: String(body.authorizationId ?? ""), accountId: String(body.accountId ?? ""), commandHash: hash(body.command) });
    return result === "INVALID" ? { status: 403, body: { valid: false } } : { status: 200, body: { valid: true, replayed: result === "REPLAYED" } };
  }

  private async grantReplay(body: Record<string, unknown>): Promise<GovernanceResponse> {
    if (!isReplayAuthorizationAllowed(String(body.environmentMode ?? ""), String(body.brokerMode ?? ""))) return { status: 422, body: { error: "only BACKTEST/FAKE authorization is allowed" } };
    const authorizationId = await this.repository.grantReplay({ authorizationId: randomUUID(), namespace: String(body.namespace ?? ""), accountId: String(body.accountId ?? ""), commandHash: hash(body.command) });
    return { status: 200, body: { authorizationId } };
  }

  private async validateReplay(body: Record<string, unknown>): Promise<GovernanceResponse> {
    const result = await this.repository.validateReplay({ authorizationId: String(body.authorizationId ?? ""), accountId: String(body.accountId ?? ""), commandHash: hash(body.command) });
    return result === "INVALID" ? { status: 403, body: { valid: false } } : { status: 200, body: { valid: true, replayed: result === "REPLAYED" } };
  }
}
