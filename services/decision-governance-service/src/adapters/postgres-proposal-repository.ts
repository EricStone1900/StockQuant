import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { decideManualProposal, type ManualProposal, type ManualProposalDecisionResult } from "../domain/manual-proposal-decision.js";
import type { ProposalInput, ProposalRepository, ProposalRevisionCommand } from "../ports/proposal-repository.js";

const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}` : JSON.stringify(value);
const sha = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
type ProposalRow = { proposal_id: string; owner_id: string; test_run_id: string; account_id: string; strategy_version: string; proposal_version: number; content_hash: string; status: string; approval_mode: "MANUAL_APPROVAL" | "AUTO_POLICY"; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; operation: "HOLD" | "REBALANCE"; environment_mode: string; broker_mode: string; expires_at: Date; legs: ManualProposal["legs"]; inserted?: boolean };
const toProposal = (row: ProposalRow) => ({ proposalId: row.proposal_id, proposalVersion: row.proposal_version, contentHash: row.content_hash, status: row.status, approvalMode: row.approval_mode, market: row.market, currency: row.currency, operation: row.operation, environmentMode: row.environment_mode, brokerMode: row.broker_mode, expiresAt: row.expires_at.toISOString(), legs: row.legs });

export async function migrateProposals(pool: Pool): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS proposals (
    proposal_id UUID PRIMARY KEY, owner_id TEXT NOT NULL, test_run_id UUID NOT NULL, account_id UUID NOT NULL, strategy_version TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, request_hash CHAR(64) NOT NULL, proposal_version INTEGER NOT NULL CHECK(proposal_version > 0),
    content_hash CHAR(64) NOT NULL, status TEXT NOT NULL CHECK(status IN ('MANUAL_APPROVAL_PENDING','AUTO_POLICY_PENDING','APPROVED_MANUAL','REJECTED_MANUAL','STALE')),
    approval_mode TEXT NOT NULL DEFAULT 'MANUAL_APPROVAL',
    market TEXT NOT NULL DEFAULT 'CN_A' CHECK(market IN ('CN_A','US_EQUITY')), currency TEXT NOT NULL DEFAULT 'CNY' CHECK(currency IN ('CNY','USD')),
    operation TEXT NOT NULL CHECK(operation IN ('HOLD','REBALANCE')), environment_mode TEXT NOT NULL CHECK(environment_mode='PAPER'),
    broker_mode TEXT NOT NULL CHECK(broker_mode='FAKE'), expires_at TIMESTAMPTZ NOT NULL, legs JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id,test_run_id,idempotency_key));
    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS approval_mode TEXT NOT NULL DEFAULT 'MANUAL_APPROVAL';
    ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
    ALTER TABLE proposals ADD CONSTRAINT proposals_status_check CHECK(status IN ('MANUAL_APPROVAL_PENDING','AUTO_POLICY_PENDING','APPROVED_MANUAL','REJECTED_MANUAL','STALE'));
    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'CN_A';
    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CNY';
    CREATE TABLE IF NOT EXISTS proposal_versions (
    proposal_id UUID NOT NULL REFERENCES proposals(proposal_id), proposal_version INTEGER NOT NULL, content_hash CHAR(64) NOT NULL,
    operation TEXT NOT NULL, environment_mode TEXT NOT NULL, broker_mode TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
    legs JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(proposal_id,proposal_version));
    CREATE TABLE IF NOT EXISTS proposal_decisions (
    decision_id UUID PRIMARY KEY, proposal_id UUID NOT NULL REFERENCES proposals(proposal_id), proposal_version INTEGER NOT NULL,
    content_hash CHAR(64) NOT NULL, action TEXT NOT NULL CHECK(action IN ('APPROVE','REJECT')), actor_id TEXT NOT NULL,
    reason TEXT NOT NULL, result_status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(proposal_id,proposal_version));
    CREATE TABLE IF NOT EXISTS proposal_revisions (
    revision_id UUID PRIMARY KEY, proposal_id UUID NOT NULL REFERENCES proposals(proposal_id), prior_version INTEGER NOT NULL,
    proposal_version INTEGER NOT NULL, prior_content_hash CHAR(64) NOT NULL, content_hash CHAR(64) NOT NULL,
    actor_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, UNIQUE(proposal_id,proposal_version));`);
  await pool.query(`CREATE TABLE IF NOT EXISTS proposal_execution_authorizations (
    authorization_id UUID PRIMARY KEY, proposal_id UUID NOT NULL REFERENCES proposals(proposal_id), proposal_version INTEGER NOT NULL,
    content_hash CHAR(64) NOT NULL, owner_id TEXT NOT NULL, test_run_id UUID NOT NULL, account_id UUID NOT NULL,
    client_order_id TEXT NOT NULL, command_hash CHAR(64) NOT NULL, status TEXT NOT NULL CHECK(status IN ('ACTIVE','CONSUMED')),
    expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(proposal_id,proposal_version,client_order_id));`);
}

export class PostgresProposalRepository implements ProposalRepository {
  constructor(private readonly pool: Pool) {}
  async create(input: ProposalInput) {
    const approvalMode = input.approvalMode ?? "MANUAL_APPROVAL";
    const market = input.market ?? (input.legs.every((leg) => leg.securityId.endsWith(".SH") || leg.securityId.endsWith(".SZ")) ? "CN_A" : "US_EQUITY");
    const currency = input.currency ?? (market === "CN_A" ? "CNY" : "USD");
    const content = { operation: input.operation, environmentMode: input.environmentMode, brokerMode: input.brokerMode, expiresAt: input.expiresAt, legs: input.legs, accountId: input.accountId, strategyVersion: input.strategyVersion, approvalMode, market, currency };
    const contentHash = sha(content); const requestHash = sha({ ...content, ownerId: input.ownerId, testRunId: input.testRunId });
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = await client.query<ProposalRow>(`INSERT INTO proposals(proposal_id,owner_id,test_run_id,account_id,strategy_version,idempotency_key,request_hash,proposal_version,content_hash,status,approval_mode,market,currency,operation,environment_mode,broker_mode,expires_at,legs)
      VALUES($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
      ON CONFLICT(owner_id,test_run_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
      WHERE proposals.request_hash=EXCLUDED.request_hash
      RETURNING proposal_id,owner_id,test_run_id,account_id,strategy_version,proposal_version,content_hash,status,approval_mode,market,currency,operation,environment_mode,broker_mode,expires_at,legs,(xmax=0) AS inserted`,
      [randomUUID(), input.ownerId, input.testRunId, input.accountId, input.strategyVersion, input.idempotencyKey, requestHash, contentHash, approvalMode === "AUTO_POLICY" ? "AUTO_POLICY_PENDING" : "MANUAL_APPROVAL_PENDING", approvalMode, market, currency, input.operation, input.environmentMode, input.brokerMode, input.expiresAt, JSON.stringify(input.legs)]);
      if (!row.rows[0]) throw new Error("PROPOSAL_IDEMPOTENCY_CONFLICT");
      if (row.rows[0].inserted !== false) await client.query(`INSERT INTO proposal_versions(proposal_id,proposal_version,content_hash,operation,environment_mode,broker_mode,expires_at,legs) VALUES($1,1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(proposal_id,proposal_version) DO NOTHING`, [row.rows[0].proposal_id, contentHash, input.operation, input.environmentMode, input.brokerMode, input.expiresAt, JSON.stringify(input.legs)]);
      await client.query("COMMIT");
      const value = toProposal(row.rows[0]);
      return { ...value, ownerId: row.rows[0].owner_id, testRunId: row.rows[0].test_run_id, accountId: row.rows[0].account_id, strategyVersion: row.rows[0].strategy_version, replayed: row.rows[0].inserted === false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async find(proposalId: string, ownerId: string) {
    const result = await this.pool.query<ProposalRow>(`SELECT * FROM proposals WHERE proposal_id=$1 AND owner_id=$2`, [proposalId, ownerId]);
    const row = result.rows[0];
    return row ? { ...toProposal(row), ownerId: row.owner_id, testRunId: row.test_run_id, accountId: row.account_id, strategyVersion: row.strategy_version } : null;
  }
  async decide(input: { proposalId: string; expectedVersion: number; expectedContentHash: string; action: "APPROVE" | "REJECT"; actorId: string; reason: string; now: string }): Promise<ManualProposalDecisionResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<ProposalRow>("SELECT * FROM proposals WHERE proposal_id=$1 FOR UPDATE", [input.proposalId]);
      if (!selected.rows[0]) { await client.query("ROLLBACK"); return { status: "REJECTED", reasonCode: "INVALID_PROPOSAL" }; }
      const proposal = toProposal(selected.rows[0]);
      const decision = decideManualProposal(proposal, { action: input.action, expectedVersion: input.expectedVersion, expectedContentHash: input.expectedContentHash, actorId: input.actorId, reason: input.reason }, input.now);
      if (decision.status === "REJECTED") { await client.query("ROLLBACK"); return decision; }
      await client.query(`INSERT INTO proposal_decisions(decision_id,proposal_id,proposal_version,content_hash,action,actor_id,reason,result_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(), input.proposalId, decision.proposalVersion, decision.contentHash, input.action, decision.decidedBy, decision.reason, decision.status]);
      await client.query("UPDATE proposals SET status=$2 WHERE proposal_id=$1", [input.proposalId, decision.status]);
      await client.query("COMMIT"); return decision;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async revise(input: ProposalRevisionCommand) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<ProposalRow>("SELECT * FROM proposals WHERE proposal_id=$1 AND owner_id=$2 FOR UPDATE", [input.proposalId, input.ownerId]);
      const row = selected.rows[0];
      const reject = async (reasonCode: "INVALID_PROPOSAL" | "INVALID_REVISION" | "NOT_PENDING" | "VERSION_CONFLICT" | "CONTENT_CONFLICT" | "EXPIRED") => { await client.query("ROLLBACK"); return { status: "REJECTED" as const, reasonCode }; };
      if (!row) return await reject("INVALID_PROPOSAL");
      if (!input.actorId.trim() || !input.reason.trim() || input.reason.length > 250 || !Number.isSafeInteger(input.expectedVersion) || !/^[a-f0-9]{64}$/u.test(input.expectedContentHash) || !Number.isFinite(Date.parse(input.now)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.now) || !Number.isFinite(Date.parse(input.expiresAt)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.expiresAt) || (input.operation !== "HOLD" && input.operation !== "REBALANCE") || !Array.isArray(input.legs) || input.legs.some((leg) => !leg.legId?.trim() || !leg.securityId?.trim() || !["BUY","SELL"].includes(leg.side) || !Number.isSafeInteger(leg.quantity) || leg.quantity <= 0) || (input.operation === "HOLD" && input.legs.length !== 0) || (input.operation === "REBALANCE" && input.legs.length === 0)) return await reject("INVALID_REVISION");
      if (row.status !== "MANUAL_APPROVAL_PENDING") return await reject("NOT_PENDING");
      if (row.proposal_version !== input.expectedVersion) return await reject("VERSION_CONFLICT");
      if (row.content_hash.trim() !== input.expectedContentHash) return await reject("CONTENT_CONFLICT");
      if (Date.parse(input.now) >= row.expires_at.getTime() || Date.parse(input.expiresAt) <= Date.parse(input.now)) return await reject("EXPIRED");
      const priorVersion = row.proposal_version;
      const contentHash = sha({ operation: input.operation, environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: input.expiresAt, legs: input.legs, accountId: row.account_id, strategyVersion: row.strategy_version });
      await client.query("UPDATE proposals SET proposal_version=$2,content_hash=$3,operation=$4,expires_at=$5,legs=$6::jsonb WHERE proposal_id=$1", [input.proposalId, priorVersion + 1, contentHash, input.operation, input.expiresAt, JSON.stringify(input.legs)]);
      await client.query("INSERT INTO proposal_versions(proposal_id,proposal_version,content_hash,operation,environment_mode,broker_mode,expires_at,legs) VALUES($1,$2,$3,$4,'PAPER','FAKE',$5,$6::jsonb)", [input.proposalId, priorVersion + 1, contentHash, input.operation, input.expiresAt, JSON.stringify(input.legs)]);
      await client.query("INSERT INTO proposal_revisions(revision_id,proposal_id,prior_version,proposal_version,prior_content_hash,content_hash,actor_id,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [randomUUID(), input.proposalId, priorVersion, priorVersion + 1, row.content_hash.trim(), contentHash, input.actorId.trim(), input.reason.trim(), input.now]);
      await client.query("COMMIT");
      return { status: "MANUAL_APPROVAL_PENDING" as const, proposalId: input.proposalId, proposalVersion: priorVersion + 1, contentHash, revisedBy: input.actorId.trim(), reason: input.reason.trim() };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async grantExecution(input: { authorizationId: string; proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; clientOrderId: string; commandHash: string; now: string }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<ProposalRow & { created_at: Date }>("SELECT * FROM proposals WHERE proposal_id=$1 FOR UPDATE", [input.proposalId]);
      const row = result.rows[0];
      if (!row || row.owner_id !== input.ownerId || row.test_run_id !== input.testRunId || row.account_id !== input.accountId || row.proposal_version !== input.proposalVersion || row.content_hash.trim() !== input.contentHash || row.status !== "APPROVED_MANUAL" || !/^[a-f0-9]{64}$/u.test(input.commandHash) || !input.clientOrderId.trim() || !Number.isFinite(Date.parse(input.now)) || Date.parse(input.now) >= row.expires_at.getTime()) { await client.query("ROLLBACK"); return null; }
      const inserted = await client.query<{ authorization_id: string; expires_at: Date; inserted: boolean }>(`INSERT INTO proposal_execution_authorizations(authorization_id,proposal_id,proposal_version,content_hash,owner_id,test_run_id,account_id,client_order_id,command_hash,status,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',LEAST($10::timestamptz,$11::timestamptz+interval '5 minutes'))
        ON CONFLICT(proposal_id,proposal_version,client_order_id) DO UPDATE SET client_order_id=EXCLUDED.client_order_id
        WHERE proposal_execution_authorizations.content_hash=EXCLUDED.content_hash AND proposal_execution_authorizations.owner_id=EXCLUDED.owner_id AND proposal_execution_authorizations.test_run_id=EXCLUDED.test_run_id AND proposal_execution_authorizations.account_id=EXCLUDED.account_id AND proposal_execution_authorizations.command_hash=EXCLUDED.command_hash
        RETURNING authorization_id,expires_at,(xmax=0) AS inserted`, [input.authorizationId, input.proposalId, input.proposalVersion, input.contentHash, input.ownerId, input.testRunId, input.accountId, input.clientOrderId, input.commandHash, row.expires_at, input.now]);
      if (!inserted.rows[0]) { await client.query("ROLLBACK"); return null; }
      await client.query("COMMIT");
      return { authorizationId: inserted.rows[0].authorization_id, expiresAt: inserted.rows[0].expires_at.toISOString(), replayed: inserted.rows[0].inserted === false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async validateExecution(input: { authorizationId: string; proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; clientOrderId: string; commandHash: string; now: string }): Promise<"VALID" | "REPLAYED" | "INVALID"> {
    const result = await this.pool.query<{ status: string }>(`UPDATE proposal_execution_authorizations SET status='CONSUMED' WHERE authorization_id=$1 AND proposal_id=$2 AND proposal_version=$3 AND content_hash=$4 AND owner_id=$5 AND test_run_id=$6 AND account_id=$7 AND client_order_id=$8 AND command_hash=$9 AND status='ACTIVE' AND expires_at>$10::timestamptz RETURNING status`, [input.authorizationId, input.proposalId, input.proposalVersion, input.contentHash, input.ownerId, input.testRunId, input.accountId, input.clientOrderId, input.commandHash, input.now]);
    if (result.rowCount === 1) return "VALID";
    const replay = await this.pool.query(`SELECT 1 FROM proposal_execution_authorizations WHERE authorization_id=$1 AND proposal_id=$2 AND proposal_version=$3 AND content_hash=$4 AND owner_id=$5 AND test_run_id=$6 AND account_id=$7 AND client_order_id=$8 AND command_hash=$9 AND status='CONSUMED' AND expires_at>$10::timestamptz`, [input.authorizationId, input.proposalId, input.proposalVersion, input.contentHash, input.ownerId, input.testRunId, input.accountId, input.clientOrderId, input.commandHash, input.now]);
    return replay.rowCount === 1 ? "REPLAYED" : "INVALID";
  }
}
