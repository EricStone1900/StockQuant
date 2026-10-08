import { createHash, randomUUID } from "node:crypto";
import { assessCandidateMandateBinding, type CandidateMandateBindingCommand } from "../domain/candidate-mandate-binding.js";
import { isReplayAuthorizationAllowed } from "../domain/authorization-policy.js";
import { validatePaperFixtureGrant } from "../domain/paper-fixture-authorization.js";
import type { ApprovedRegistryClient } from "../ports/approved-registry-client.js";
import type { ExecutionAuthorizationRepository } from "../ports/execution-authorization-repository.js";
import type { ProposalInput, ProposalRepository } from "../ports/proposal-repository.js";
import type { AutoMandateCreate, AutoMandateRepository } from "../ports/auto-mandate-repository.js";
import type { StrategySnapshotInput, StrategySnapshotRepository } from "../ports/strategy-snapshot-repository.js";
import { authorizeGovernanceRequest, type GovernanceTokens } from "./service-auth.js";

const stable = (value: unknown): unknown => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]))
    : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export type GovernanceRequest = { method: string; pathname: string; serviceId?: string; authorization?: string; actorId?: string; ownerId?: string; rawBody?: string };
export type GovernanceResponse = { status: number; body: unknown };

export class GovernanceApi {
  constructor(private readonly repository: ExecutionAuthorizationRepository, private readonly tokens: GovernanceTokens, private readonly registry: ApprovedRegistryClient, private readonly proposals?: ProposalRepository, private readonly mandates?: AutoMandateRepository, private readonly strategySnapshots?: StrategySnapshotRepository) {}

  async ready(): Promise<boolean> {
    try { await this.repository.ready(); return true; } catch { return false; }
  }

  authorized(request: GovernanceRequest): boolean {
    return authorizeGovernanceRequest({ method: request.method, pathname: request.pathname, serviceId: request.serviceId, authorization: request.authorization, tokens: this.tokens });
  }

  async handle(request: GovernanceRequest): Promise<GovernanceResponse> {
    if (!this.authorized(request)) return { status: 403, body: { error: "service identity or route scope is not allowed" } };
    if (request.pathname === "/internal/v1/candidate-mandates/readiness") return this.assessCandidateMandate(request.rawBody ?? "");
    if (this.strategySnapshots && request.method === "POST" && request.pathname === "/internal/v1/v12/strategy-snapshots") return this.receiveStrategySnapshot(request.rawBody ?? "");
    const proposalRead = request.pathname.match(/^\/internal\/v1\/proposals\/([0-9a-f-]{36})$/iu);
    if (this.proposals && proposalRead && request.method === "GET") {
      const proposal = await this.proposals.find(proposalRead[1], request.ownerId ?? "");
      return proposal ? { status: 200, body: proposal } : { status: 404, body: { error: "proposal not found in owner scope" } };
    }
    const autoMandateRead = request.pathname.match(/^\/internal\/v1\/auto-mandates\/([0-9a-f-]{36})\/runs\/([0-9a-f-]{36})$/iu);
    if (this.mandates && autoMandateRead && request.method === "GET") {
      if (!request.ownerId?.trim()) return { status: 403, body: { error: "authenticated Platform owner is required" } };
      const mandate = await this.mandates.find(autoMandateRead[1], request.ownerId, autoMandateRead[2]);
      return mandate ? { status: 200, body: mandate } : { status: 404, body: { error: "Mandate not found in owner/TestRun scope" } };
    }
    const executionAuthorization = request.pathname.match(/^\/internal\/v1\/proposals\/([0-9a-f-]{36})\/execution-authorizations(\/validate)?$/iu);
    if (this.proposals && executionAuthorization && request.method === "POST") return this.proposalExecutionAuthorization(executionAuthorization[1], Boolean(executionAuthorization[2]), request.rawBody ?? "");
    if (this.proposals && request.method === "POST" && request.pathname === "/internal/v1/proposals") return this.createProposal(request.rawBody ?? "");
    const proposalDecision = request.pathname.match(/^\/internal\/v1\/proposals\/([0-9a-f-]{36})\/(approve|reject)$/iu);
    if (this.proposals && proposalDecision && request.method === "POST") return this.decideProposal(proposalDecision[1], proposalDecision[2].toUpperCase() as "APPROVE" | "REJECT", request.actorId, request.rawBody ?? "");
    const proposalRevision = request.pathname.match(/^\/internal\/v1\/proposals\/([0-9a-f-]{36})\/revise$/iu);
    if (this.proposals && proposalRevision && request.method === "POST") return this.reviseProposal(proposalRevision[1], request.ownerId, request.actorId, request.rawBody ?? "");
    const autoMandate = request.pathname.match(/^\/internal\/v1\/auto-mandates(?:\/([0-9a-f-]{36})(?:\/(activate|pause|orders\/authorize))?)?$/iu);
    if (this.mandates && autoMandate && request.method === "POST") return this.handleAutoMandate(autoMandate[1], autoMandate[2], request, request.rawBody ?? "");
    const autoSettlement = request.pathname.match(/^\/internal\/v1\/auto-mandates\/reservations\/([0-9a-f-]{36})\/settle$/iu);
    if (this.mandates && autoSettlement && request.method === "POST") {
      let value: unknown; try { value = JSON.parse(request.rawBody ?? ""); } catch { return { status: 422, body: { error: "invalid reservation settlement JSON" } }; }
      if (!isRecord(value) || Object.keys(value).some((key) => !["outcome","now"].includes(key)) || !["CONSUMED","RELEASED"].includes(String(value.outcome)) || !Number.isFinite(Date.parse(String(value.now))) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.now))) return { status: 422, body: { error: "reservation outcome and offset-bearing TestRun Clock are required" } };
      const settled = await this.mandates.settleReservation({ reservationId: autoSettlement[1], status: value.outcome as "CONSUMED" | "RELEASED", now: String(value.now) });
      return settled ? { status: 200, body: { reservationId: autoSettlement[1], status: value.outcome } } : { status: 409, body: { error: "reservation is missing or has a conflicting settlement" } };
    }
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

  private async receiveStrategySnapshot(raw: string): Promise<GovernanceResponse> {
    if (Buffer.byteLength(raw, "utf8") > 32768) return { status: 413, body: { error: "strategy snapshot exceeds 32 KiB" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid strategy snapshot JSON" } }; }
    const allowed = ["ownerId","testRunId","artifactId","artifactSha256","fixtureVersion","dataVersion","factorVersion","strategyId","strategyHash","mode","asOf","targets"];
    if (!isRecord(value) || Object.keys(value).some((key) => !allowed.includes(key))) return { status: 422, body: { error: "invalid strategy snapshot fields" } };
    const item = value as unknown as StrategySnapshotInput;
    if (!item.ownerId?.trim() || !/^[0-9a-f-]{36}$/iu.test(item.testRunId) || !item.artifactId?.trim() || !/^[a-f0-9]{64}$/u.test(item.artifactSha256) || item.fixtureVersion !== "v1.2-market-data-4" || item.dataVersion !== item.fixtureVersion || item.factorVersion !== "v1.2-momentum-volume-1" || !["v1.2-qlib-topk-1","v1.2-no-trade-1"].includes(item.strategyId) || !/^[a-f0-9]{64}$/u.test(item.strategyHash) || !["TOPK","NO_TRADE"].includes(item.mode) || (item.strategyId.endsWith("no-trade-1") !== (item.mode === "NO_TRADE")) || !/^\d{4}-\d{2}-\d{2}$/u.test(item.asOf) || !Number.isFinite(Date.parse(`${item.asOf}T00:00:00Z`)) || !Array.isArray(item.targets) || item.targets.length > 100 || item.targets.some((target) => !target || !target.ticker?.trim() || !["CN_A","US_EQUITY"].includes(target.market) || !["CNY","USD"].includes(target.currency) || (target.market === "CN_A") !== (target.currency === "CNY") || !target.reason?.trim()) || (item.mode === "NO_TRADE" && item.targets.length !== 0) || (item.mode === "TOPK" && item.targets.length === 0)) return { status: 422, body: { error: "strategy snapshot must match the frozen V1.2 FIXTURE output contract" } };
    try {
      const result = await this.strategySnapshots!.receive(item);
      return { status: result.replayed ? 200 : 201, body: result };
    } catch (error) {
      if (error instanceof Error && error.message === "STRATEGY_SNAPSHOT_IDEMPOTENCY_CONFLICT") return { status: 409, body: { error: error.message } };
      throw error;
    }
  }

  private async proposalExecutionAuthorization(proposalId: string, validate: boolean, raw: string): Promise<GovernanceResponse> {
    if (Buffer.byteLength(raw, "utf8") > 16384) return { status: 413, body: { error: "execution authorization command exceeds 16 KiB" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid execution authorization JSON" } }; }
    if (!isRecord(value) || Object.keys(value).some((key) => !["proposalVersion","contentHash","ownerId","testRunId","accountId","clientOrderId","commandHash","now","authorizationId"].includes(key))) return { status: 422, body: { error: "invalid execution authorization fields" } };
    const input = { proposalId, proposalVersion: Number(value.proposalVersion), contentHash: String(value.contentHash ?? ""), ownerId: String(value.ownerId ?? ""), testRunId: String(value.testRunId ?? ""), accountId: String(value.accountId ?? ""), clientOrderId: String(value.clientOrderId ?? ""), commandHash: String(value.commandHash ?? ""), now: String(value.now ?? "") };
    if (!Number.isSafeInteger(input.proposalVersion) || !/^[a-f0-9]{64}$/u.test(input.contentHash) || !input.ownerId || !/^[0-9a-f-]{36}$/iu.test(input.testRunId) || !/^[0-9a-f-]{36}$/iu.test(input.accountId) || !input.clientOrderId.trim() || !/^[a-f0-9]{64}$/u.test(input.commandHash) || !Number.isFinite(Date.parse(input.now)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.now)) return { status: 422, body: { error: "invalid execution authorization scope or injected TestRun Clock" } };
    if (validate) {
      if (typeof value.authorizationId !== "string" || !/^[0-9a-f-]{36}$/iu.test(value.authorizationId)) return { status: 422, body: { error: "authorizationId is required" } };
      const result = await this.proposals!.validateExecution({ ...input, authorizationId: value.authorizationId });
      return result === "INVALID" ? { status: 403, body: { valid: false } } : { status: 200, body: { valid: true, replayed: result === "REPLAYED" } };
    }
    const result = await this.proposals!.grantExecution({ ...input, authorizationId: randomUUID() });
    return result ? { status: 200, body: { ...result, proposalId, proposalVersion: input.proposalVersion, contentHash: input.contentHash, ownerId: input.ownerId, testRunId: input.testRunId, accountId: input.accountId, clientOrderId: input.clientOrderId, commandHash: input.commandHash, status: "ACTIVE" } } : { status: 403, body: { error: "proposal decision or scope is not eligible for execution authorization" } };
  }

  private async createProposal(raw: string): Promise<GovernanceResponse> {
    if (Buffer.byteLength(raw, "utf8") > 32768) return { status: 413, body: { error: "proposal exceeds 32 KiB" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid proposal JSON" } }; }
    if (!isRecord(value) || Object.keys(value).some((key) => !["ownerId","testRunId","idempotencyKey","accountId","strategyVersion","approvalMode","market","currency","operation","environmentMode","brokerMode","expiresAt","legs"].includes(key))) return { status: 422, body: { error: "invalid proposal fields" } };
    const item = value as unknown as ProposalInput;
    if (!item.ownerId?.trim() || !/^[0-9a-f-]{36}$/iu.test(item.testRunId) || !/^[0-9a-f-]{36}$/iu.test(item.accountId) || !item.idempotencyKey?.trim() || item.idempotencyKey.length > 128 || !item.strategyVersion?.trim() || (item.approvalMode !== undefined && item.approvalMode !== "MANUAL_APPROVAL" && item.approvalMode !== "AUTO_POLICY") || (item.approvalMode === "AUTO_POLICY" && (item.strategyVersion !== "fixture-auto-policy-test-v1" || !["CN_A","US_EQUITY"].includes(String(item.market)) || !["CNY","USD"].includes(String(item.currency)) || (item.market === "CN_A") !== (item.currency === "CNY"))) || (item.market !== undefined && !["CN_A","US_EQUITY"].includes(item.market)) || (item.currency !== undefined && !["CNY","USD"].includes(item.currency)) || (item.market === "CN_A" && item.currency !== "CNY") || (item.market === "US_EQUITY" && item.currency !== "USD") || item.environmentMode !== "PAPER" || item.brokerMode !== "FAKE" || !Number.isFinite(Date.parse(item.expiresAt)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(item.expiresAt) || (item.operation !== "HOLD" && item.operation !== "REBALANCE") || !Array.isArray(item.legs) || item.legs.some((leg) => !leg || !leg.legId || !leg.securityId || !["BUY","SELL"].includes(leg.side) || !Number.isSafeInteger(leg.quantity) || leg.quantity <= 0) || (item.operation === "HOLD" && item.legs.length !== 0) || (item.operation === "REBALANCE" && item.legs.length === 0)) return { status: 422, body: { error: "proposal must be a valid PAPER/FAKE HOLD or REBALANCE with bounded expiry and legs" } };
    try { return { status: 201, body: await this.proposals!.create(item) }; }
    catch (error) { if (error instanceof Error && error.message === "PROPOSAL_IDEMPOTENCY_CONFLICT") return { status: 409, body: { error: error.message } }; throw error; }
  }

  private async decideProposal(proposalId: string, action: "APPROVE" | "REJECT", actorId: string | undefined, raw: string): Promise<GovernanceResponse> {
    if (!actorId?.trim()) return { status: 403, body: { error: "authenticated platform actor is required" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid decision JSON" } }; }
    if (!isRecord(value) || Object.keys(value).some((key) => !["expectedVersion","expectedContentHash","reason","now"].includes(key))) return { status: 422, body: { error: "invalid decision fields" } };
    const result = await this.proposals!.decide({ proposalId, action, actorId, expectedVersion: Number(value.expectedVersion), expectedContentHash: String(value.expectedContentHash ?? ""), reason: String(value.reason ?? ""), now: String(value.now ?? "") });
    return result.status === "REJECTED" ? { status: result.reasonCode === "VERSION_CONFLICT" || result.reasonCode === "CONTENT_CONFLICT" ? 409 : 422, body: result } : { status: 200, body: result };
  }

  private async reviseProposal(proposalId: string, ownerId: string | undefined, actorId: string | undefined, raw: string): Promise<GovernanceResponse> {
    if (!ownerId?.trim() || !actorId?.trim()) return { status: 403, body: { error: "authenticated platform owner and actor are required" } };
    if (Buffer.byteLength(raw, "utf8") > 32768) return { status: 413, body: { error: "proposal revision exceeds 32 KiB" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid proposal revision JSON" } }; }
    if (!isRecord(value) || Object.keys(value).some((key) => !["expectedVersion","expectedContentHash","operation","expiresAt","legs","reason","now"].includes(key))) return { status: 422, body: { error: "invalid proposal revision fields" } };
    const result = await this.proposals!.revise({ proposalId, ownerId, actorId, expectedVersion: Number(value.expectedVersion), expectedContentHash: String(value.expectedContentHash ?? ""), operation: value.operation as "HOLD" | "REBALANCE", expiresAt: String(value.expiresAt ?? ""), legs: Array.isArray(value.legs) ? value.legs as ProposalInput["legs"] : [], reason: String(value.reason ?? ""), now: String(value.now ?? "") });
    if (result.status === "REJECTED") return { status: ["VERSION_CONFLICT","CONTENT_CONFLICT","NOT_PENDING"].includes(result.reasonCode) ? 409 : result.reasonCode === "INVALID_PROPOSAL" ? 404 : 422, body: result };
    return { status: 200, body: result };
  }

  private async handleAutoMandate(mandateId: string | undefined, action: string | undefined, request: GovernanceRequest, raw: string): Promise<GovernanceResponse> {
    if (Buffer.byteLength(raw, "utf8") > 32768) return { status: 413, body: { error: "AUTO_POLICY Mandate command exceeds 32 KiB" } };
    let value: unknown; try { value = JSON.parse(raw); } catch { return { status: 422, body: { error: "invalid AUTO_POLICY Mandate JSON" } }; }
    if (!isRecord(value)) return { status: 422, body: { error: "invalid AUTO_POLICY Mandate body" } };
    if (!action) {
      if (!request.ownerId?.trim() || !request.actorId?.trim()) return { status: 403, body: { error: "authenticated Platform owner and actor are required" } };
      const allowed = ["mandateId","mandateVersion","testRunId","accountId","strategyVersion","market","currency","securityScope","maxOrderAmount","maxTotalAmount","maxOrderCount","validFrom","expiresAt","reason","now"];
      if (Object.keys(value).some((key) => !allowed.includes(key)) || !/^[0-9a-f-]{36}$/iu.test(String(value.mandateId ?? "")) || value.mandateVersion !== 1 || !/^[0-9a-f-]{36}$/iu.test(String(value.testRunId ?? "")) || !/^[0-9a-f-]{36}$/iu.test(String(value.accountId ?? "")) || !String(value.strategyVersion ?? "").trim() || !["CN_A","US_EQUITY"].includes(String(value.market)) || !["CNY","USD"].includes(String(value.currency)) || (value.market === "CN_A") !== (value.currency === "CNY") || !Array.isArray(value.securityScope) || !value.securityScope.length || value.securityScope.some((item) => typeof item !== "string" || !item.trim()) || new Set(value.securityScope).size !== value.securityScope.length || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(String(value.maxOrderAmount)) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(String(value.maxTotalAmount)) || !Number.isSafeInteger(value.maxOrderCount) || Number(value.maxOrderCount) < 1 || Number(value.maxOrderCount) > 100 || !Number.isFinite(Date.parse(String(value.validFrom))) || !Number.isFinite(Date.parse(String(value.expiresAt))) || Date.parse(String(value.expiresAt)) <= Date.parse(String(value.validFrom)) || Date.parse(String(value.expiresAt)) - Date.parse(String(value.now)) > 24 * 60 * 60 * 1000 || Date.parse(String(value.validFrom)) < Date.parse(String(value.now)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.now)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.validFrom)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.expiresAt)) || !String(value.reason ?? "").trim() || !Number.isFinite(Date.parse(String(value.now)))) return { status: 422, body: { error: "AUTO_POLICY Mandate fields, market/currency, bounded validity window and explicit-offset TestRun Clock are required" } };
      const amountToCents = (value: unknown) => { const [whole, fraction = ""] = String(value).split("."); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")); };
      if (amountToCents(value.maxOrderAmount) > amountToCents(value.maxTotalAmount)) return { status: 422, body: { error: "maxOrderAmount cannot exceed maxTotalAmount" } };
      const create = { mandateId: String(value.mandateId), mandateVersion: 1, ownerId: request.ownerId, testRunId: String(value.testRunId), accountId: String(value.accountId), strategyVersion: String(value.strategyVersion), market: value.market as "CN_A" | "US_EQUITY", currency: value.currency as "CNY" | "USD", securityScope: value.securityScope as string[], maxOrderAmount: String(value.maxOrderAmount), maxTotalAmount: String(value.maxTotalAmount), maxOrderCount: Number(value.maxOrderCount), validFrom: String(value.validFrom), expiresAt: String(value.expiresAt) } satisfies AutoMandateCreate;
      const result = await this.mandates!.create(create, request.actorId, String(value.reason).trim(), String(value.now));
      return result.status === "CONFLICT" ? { status: 409, body: result } : { status: result.replayed ? 200 : 201, body: result };
    }
    if (!mandateId) return { status: 404, body: { error: "AUTO_POLICY Mandate route was not found" } };
    const ownerId = request.ownerId;
    const actorId = request.actorId;
    if (action === "activate" || action === "pause") {
      if (!ownerId?.trim() || !actorId?.trim()) return { status: 403, body: { error: "authenticated Platform owner and actor are required" } };
      if (Object.keys(value).some((key) => !["mandateVersion","testRunId","contentHash","reason","now"].includes(key)) || !Number.isSafeInteger(value.mandateVersion) || Number(value.mandateVersion) < 1 || !/^[0-9a-f-]{36}$/iu.test(String(value.testRunId ?? "")) || (action === "activate" && !/^[a-f0-9]{64}$/u.test(String(value.contentHash ?? ""))) || !String(value.reason ?? "").trim() || !Number.isFinite(Date.parse(String(value.now))) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.now))) return { status: 422, body: { error: "exact Mandate version, TestRun, Hash for activation, reason and offset-bearing injected TestRun Clock are required" } };
      if (action === "pause") return await this.mandates!.pause({ mandateId, mandateVersion: Number(value.mandateVersion), ownerId, testRunId: String(value.testRunId), actorId, reason: String(value.reason).trim(), now: String(value.now) }) ? { status: 200, body: { status: "PAUSED", mandateId, mandateVersion: Number(value.mandateVersion) } } : { status: 409, body: { error: "Mandate is not active in this owner/TestRun scope" } };
      const activated = await this.mandates!.activate({ mandateId, mandateVersion: Number(value.mandateVersion), contentHash: String(value.contentHash), ownerId, testRunId: String(value.testRunId), actorId, reason: String(value.reason).trim(), now: String(value.now) });
      return activated.status === "ACTIVE" ? { status: 200, body: activated } : { status: activated.status === "CONFLICT" ? 409 : 422, body: activated };
    }
    const allowed = ["mandateVersion","ownerId","clientOrderId","commandHash","proposal","now"];
    if (Object.keys(value).some((key) => !allowed.includes(key)) || !Number.isSafeInteger(value.mandateVersion) || Number(value.mandateVersion) < 1 || !String(value.ownerId ?? "").trim() || !String(value.clientOrderId ?? "").trim() || !/^[a-f0-9]{64}$/u.test(String(value.commandHash ?? "")) || !Number.isFinite(Date.parse(String(value.now))) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(String(value.now)) || !isRecord(value.proposal)) return { status: 422, body: { error: "valid AUTO_POLICY order scope, version, command Hash and offset-bearing TestRun Clock are required" } };
    const proposal = value.proposal;
    if (!/^[0-9a-f-]{36}$/iu.test(String(proposal.proposalId ?? "")) || !Number.isSafeInteger(proposal.proposalVersion) || !/^[a-f0-9]{64}$/u.test(String(proposal.contentHash ?? "")) || !/^[0-9a-f-]{36}$/iu.test(String(proposal.testRunId ?? "")) || !/^[0-9a-f-]{36}$/iu.test(String(proposal.accountId ?? "")) || !String(proposal.strategyVersion ?? "").trim() || !["HOLD","REBALANCE"].includes(String(proposal.operation)) || !["CN_A","US_EQUITY"].includes(String(proposal.market)) || !["CNY","USD"].includes(String(proposal.currency)) || !Array.isArray(proposal.legs)) return { status: 422, body: { error: "invalid AUTO_POLICY Proposal facts" } };
    const claimedLegs = proposal.legs as Array<{ securityId?: unknown; side?: unknown; quantity?: unknown; limitPrice?: unknown }>;
    if (!this.proposals) return { status: 503, body: { error: "AUTO_POLICY authoritative Proposal storage is unavailable" } };
    const persisted = await this.proposals.find(String(proposal.proposalId), String(value.ownerId));
    if (!persisted || persisted.status !== "AUTO_POLICY_PENDING" || persisted.approvalMode !== "AUTO_POLICY" || persisted.proposalVersion !== Number(proposal.proposalVersion) || persisted.contentHash !== String(proposal.contentHash) || persisted.testRunId !== String(proposal.testRunId) || persisted.accountId !== String(proposal.accountId) || persisted.strategyVersion !== String(proposal.strategyVersion) || persisted.operation !== proposal.operation || persisted.market !== proposal.market || persisted.currency !== proposal.currency || persisted.legs.length !== claimedLegs.length || !persisted.legs.every((leg, index) => { const supplied = claimedLegs[index]; return supplied && supplied.securityId === leg.securityId && supplied.side === leg.side && supplied.quantity === leg.quantity; })) return { status: 409, body: { error: "AUTO_POLICY authorization requires the exact persisted pending Proposal version and account scope" } };
    const expectedFixture = (securityId: string) => securityId === "600000.SH" ? { market: "CN_A", currency: "CNY", price: "10.00", fee: "5.00", quantity: 100 } : securityId === "AAPL" ? { market: "US_EQUITY", currency: "USD", price: "25.00", fee: "0.05", quantity: 10 } : undefined;
    const legs = persisted.legs.map((leg) => { const fixed = expectedFixture(leg.securityId); return { securityId: leg.securityId, side: leg.side, quantity: leg.quantity, limitPrice: fixed?.price ?? "", estimatedFee: fixed?.fee ?? "" }; });
    if (persisted.operation === "REBALANCE" && (legs.length !== 1 || !legs[0].limitPrice || persisted.legs.some((leg) => expectedFixture(leg.securityId)?.quantity !== leg.quantity || expectedFixture(leg.securityId)?.market !== persisted.market || expectedFixture(leg.securityId)?.currency !== persisted.currency))) return { status: 422, body: { error: "AUTO_POLICY Proposal is outside the fixed Fixture market, security or quantity" } };
    const trustedProposal = { proposalId: persisted.proposalId, proposalVersion: persisted.proposalVersion, contentHash: persisted.contentHash, ownerId: persisted.ownerId, testRunId: persisted.testRunId, accountId: persisted.accountId, strategyVersion: persisted.strategyVersion, operation: persisted.operation, market: persisted.market, currency: persisted.currency, legs };
    const decision = await this.mandates!.authorizeOrder({ mandateId, mandateVersion: Number(value.mandateVersion), ownerId: String(value.ownerId), clientOrderId: String(value.clientOrderId), commandHash: String(value.commandHash), proposal: trustedProposal as unknown as import("../domain/auto-mandate.js").AutoMandateDecision, now: String(value.now) });
    const success = decision.decision.status === "AUTHORIZED" || decision.decision.status === "HOLD";
    const reasonCode = decision.decision.status === "REJECTED" ? decision.decision.reasonCode : "";
    return { status: success ? 200 : ["ORDER_LIMIT_EXCEEDED","BUDGET_EXCEEDED"].includes(reasonCode) ? 409 : 403, body: decision };
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
