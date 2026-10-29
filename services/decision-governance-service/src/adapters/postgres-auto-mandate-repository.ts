import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { evaluateAutoMandate, type AutoMandate, type AutoMandateDecision, type AutoMandateResult } from "../domain/auto-mandate.js";
import type { AutoMandateCreate, AutoMandateRepository } from "../ports/auto-mandate-repository.js";

const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}` : JSON.stringify(value);
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
type MandateRow = { mandate_id: string; mandate_version: number; content_hash: string; owner_id: string; test_run_id: string; account_id: string; strategy_version: string; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; security_scope: string[]; max_order_amount: string; max_total_amount: string; max_order_count: number; valid_from: Date; expires_at: Date; status: AutoMandate["status"] | "PENDING" };
const toMandate = (row: MandateRow): AutoMandate => ({ mandateId: row.mandate_id, mandateVersion: row.mandate_version, contentHash: row.content_hash.trim(), ownerId: row.owner_id, testRunId: row.test_run_id, accountId: row.account_id, strategyVersion: row.strategy_version, market: row.market, currency: row.currency, securityScope: row.security_scope, maxOrderAmount: row.max_order_amount, maxTotalAmount: row.max_total_amount, maxOrderCount: row.max_order_count, validFrom: row.valid_from.toISOString(), expiresAt: row.expires_at.toISOString(), status: row.status === "PENDING" ? "PAUSED" : row.status });

export async function migrateAutoMandates(pool: PoolClient): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS auto_policy_mandates (
    mandate_id UUID NOT NULL, mandate_version INTEGER NOT NULL CHECK(mandate_version > 0), content_hash CHAR(64) NOT NULL,
    owner_id TEXT NOT NULL, test_run_id UUID NOT NULL, account_id UUID NOT NULL, strategy_version TEXT NOT NULL,
    market TEXT NOT NULL CHECK(market IN('CN_A','US_EQUITY')), currency TEXT NOT NULL CHECK(currency IN('CNY','USD')),
    security_scope JSONB NOT NULL, max_order_amount NUMERIC(20,2) NOT NULL CHECK(max_order_amount > 0),
    max_total_amount NUMERIC(20,2) NOT NULL CHECK(max_total_amount > 0), max_order_count INTEGER NOT NULL CHECK(max_order_count > 0),
    valid_from TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL CHECK(status IN('PENDING','ACTIVE','PAUSED','REVOKED')),
    created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(mandate_id,mandate_version));
    CREATE UNIQUE INDEX IF NOT EXISTS auto_policy_one_active_mandate_scope ON auto_policy_mandates(owner_id,test_run_id,account_id) WHERE status='ACTIVE';
    CREATE TABLE IF NOT EXISTS auto_policy_mandate_events (
    event_id UUID PRIMARY KEY, mandate_id UUID NOT NULL, mandate_version INTEGER NOT NULL, event TEXT NOT NULL CHECK(event IN('CREATED','ACTIVATED','PAUSED','REVOKED')),
    actor_id TEXT NOT NULL, reason TEXT NOT NULL, recorded_at TIMESTAMPTZ NOT NULL, FOREIGN KEY(mandate_id,mandate_version) REFERENCES auto_policy_mandates(mandate_id,mandate_version));
    CREATE TABLE IF NOT EXISTS auto_policy_budget_reservations (
    reservation_id UUID PRIMARY KEY, mandate_id UUID NOT NULL, mandate_version INTEGER NOT NULL, proposal_id UUID NOT NULL,
    proposal_version INTEGER NOT NULL, proposal_hash CHAR(64) NOT NULL, client_order_id TEXT NOT NULL, command_hash CHAR(64) NOT NULL,
    amount NUMERIC(20,2) NOT NULL CHECK(amount > 0), status TEXT NOT NULL CHECK(status IN('RESERVED','CONSUMED','RELEASED')),
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY(mandate_id,mandate_version) REFERENCES auto_policy_mandates(mandate_id,mandate_version),
    UNIQUE(mandate_id,mandate_version,client_order_id));`);
}

export class PostgresAutoMandateRepository implements AutoMandateRepository {
  constructor(private readonly pool: Pool) {}
  async find(mandateId: string, ownerId: string, testRunId: string) {
    const result = await this.pool.query<MandateRow>("SELECT * FROM auto_policy_mandates WHERE mandate_id=$1 AND owner_id=$2 AND test_run_id=$3", [mandateId, ownerId, testRunId]);
    const row = result.rows[0];
    return row ? { ...toMandate(row), status: row.status } : null;
  }
  async readBudget(mandateId: string, mandateVersion: number, ownerId: string, testRunId: string) {
    const result = await this.pool.query<{ reservation_count: string; reserved_amount: string; consumed_count: string; consumed_amount: string; released_count: string; released_amount: string }>(
      `SELECT COUNT(r.reservation_id)::text AS reservation_count,
        COALESCE(SUM(r.amount) FILTER (WHERE r.status='RESERVED'),0)::numeric(20,2)::text AS reserved_amount,
        COUNT(r.reservation_id) FILTER (WHERE r.status='CONSUMED')::text AS consumed_count,
        COALESCE(SUM(r.amount) FILTER (WHERE r.status='CONSUMED'),0)::numeric(20,2)::text AS consumed_amount,
        COUNT(r.reservation_id) FILTER (WHERE r.status='RELEASED')::text AS released_count,
        COALESCE(SUM(r.amount) FILTER (WHERE r.status='RELEASED'),0)::numeric(20,2)::text AS released_amount
      FROM auto_policy_mandates m LEFT JOIN auto_policy_budget_reservations r
        ON r.mandate_id=m.mandate_id AND r.mandate_version=m.mandate_version
      WHERE m.mandate_id=$1 AND m.mandate_version=$2 AND m.owner_id=$3 AND m.test_run_id=$4
      GROUP BY m.mandate_id`, [mandateId, mandateVersion, ownerId, testRunId]);
    const row = result.rows[0];
    return row ? { reservedAmount: row.reserved_amount, consumedAmount: row.consumed_amount, releasedAmount: row.released_amount, reservationCount: Number(row.reservation_count), consumedCount: Number(row.consumed_count), releasedCount: Number(row.released_count) } : null;
  }
  async readLocalOrderReservation(input: { reservationId: string; mandateId: string; mandateVersion: number; ownerId: string; accountId: string; testRunId: string; clientOrderId: string; commandHash: string; proposalId: string; proposalVersion: number; proposalHash: string; amount: string }) {
    const result = await this.pool.query<{ reservation_id: string; amount: string; status: "RESERVED" | "CONSUMED" }>(`SELECT r.reservation_id,r.amount::numeric(20,2)::text,r.status
      FROM auto_policy_budget_reservations r JOIN auto_policy_mandates m ON m.mandate_id=r.mandate_id AND m.mandate_version=r.mandate_version
      WHERE r.reservation_id=$1 AND r.mandate_id=$2 AND r.mandate_version=$3 AND m.owner_id=$4 AND m.account_id=$5 AND m.test_run_id=$6
        AND r.client_order_id=$7 AND r.command_hash=$8 AND r.proposal_id=$9 AND r.proposal_version=$10 AND r.proposal_hash=$11 AND r.amount=$12 AND r.status IN ('RESERVED','CONSUMED')`,
      [input.reservationId,input.mandateId,input.mandateVersion,input.ownerId,input.accountId,input.testRunId,input.clientOrderId,input.commandHash,input.proposalId,input.proposalVersion,input.proposalHash,input.amount]);
    const row=result.rows[0]; return row ? { reservationId:row.reservation_id,status:row.status,amount:row.amount } : null;
  }
  async create(input: AutoMandateCreate, actorId: string, reason: string, now: string) {
    const { mandateId, mandateVersion, ownerId, testRunId, accountId, strategyVersion, market, currency, securityScope, maxOrderAmount, maxTotalAmount, maxOrderCount, validFrom, expiresAt } = input;
    const content = { mandateId, mandateVersion, ownerId, testRunId, accountId, strategyVersion, market, currency, securityScope, maxOrderAmount, maxTotalAmount, maxOrderCount, validFrom, expiresAt };
    const contentHash = hash(content);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const replay = await client.query<{ content_hash: string; owner_id: string; test_run_id: string; account_id: string; status: "PENDING" | "ACTIVE" | "PAUSED" | "REVOKED" }>("SELECT content_hash,owner_id,test_run_id,account_id,status FROM auto_policy_mandates WHERE mandate_id=$1 AND mandate_version=$2 FOR UPDATE", [mandateId, mandateVersion]);
      if (replay.rows[0]) {
        const old = replay.rows[0];
        if (old.content_hash.trim() !== contentHash || old.owner_id !== ownerId || old.test_run_id !== testRunId || old.account_id !== accountId) { await client.query("ROLLBACK"); return { status: "CONFLICT" as const }; }
        await client.query("COMMIT");
        return { status: old.status, mandateId, mandateVersion, contentHash, replayed: true };
      }
      const existing = await client.query("SELECT mandate_id FROM auto_policy_mandates WHERE owner_id=$1 AND test_run_id=$2 AND account_id=$3 AND status='ACTIVE' FOR UPDATE", [ownerId, testRunId, accountId]);
      if (existing.rowCount) { await client.query("ROLLBACK"); return { status: "CONFLICT" as const }; }
      await client.query(`INSERT INTO auto_policy_mandates(mandate_id,mandate_version,content_hash,owner_id,test_run_id,account_id,strategy_version,market,currency,security_scope,max_order_amount,max_total_amount,max_order_count,valid_from,expires_at,status,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,'PENDING',$16)`, [mandateId, mandateVersion, contentHash, ownerId, testRunId, accountId, strategyVersion, market, currency, JSON.stringify(securityScope), maxOrderAmount, maxTotalAmount, maxOrderCount, validFrom, expiresAt, now]);
      await client.query("INSERT INTO auto_policy_mandate_events(event_id,mandate_id,mandate_version,event,actor_id,reason,recorded_at) VALUES($1,$2,$3,'CREATED',$4,$5,$6)", [randomUUID(), mandateId, mandateVersion, actorId, reason, now]);
      await client.query("COMMIT");
      return { status: "PENDING" as const, mandateId, mandateVersion, contentHash, replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async activate(input: { mandateId: string; mandateVersion: number; contentHash: string; ownerId: string; testRunId: string; actorId: string; reason: string; now: string }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<MandateRow>("SELECT * FROM auto_policy_mandates WHERE mandate_id=$1 AND mandate_version=$2 AND owner_id=$3 AND test_run_id=$4 FOR UPDATE", [input.mandateId, input.mandateVersion, input.ownerId, input.testRunId]);
      const row = selected.rows[0];
      if (!row || row.content_hash.trim() !== input.contentHash || row.status !== "PENDING" || !input.actorId.trim() || !input.reason.trim() || !Number.isFinite(Date.parse(input.now)) || Date.parse(input.now) < row.valid_from.getTime() || Date.parse(input.now) >= row.expires_at.getTime()) {
        const rejection = !row ? "MANDATE_NOT_FOUND" : row.content_hash.trim() !== input.contentHash ? "CONTENT_HASH_MISMATCH" : row.status !== "PENDING" ? "MANDATE_NOT_PENDING" : !input.actorId.trim() ? "ACTOR_REQUIRED" : !input.reason.trim() ? "REASON_REQUIRED" : !Number.isFinite(Date.parse(input.now)) ? "INVALID_CLOCK" : Date.parse(input.now) < row.valid_from.getTime() ? "BEFORE_VALID_FROM" : "MANDATE_EXPIRED";
        await client.query("ROLLBACK");
        return { status: "REJECTED" as const, reasonCode: rejection };
      }
      const conflict = await client.query("SELECT 1 FROM auto_policy_mandates WHERE owner_id=$1 AND test_run_id=$2 AND account_id=$3 AND status='ACTIVE' FOR UPDATE", [row.owner_id, row.test_run_id, row.account_id]);
      if (conflict.rowCount) { await client.query("ROLLBACK"); return { status: "CONFLICT" as const }; }
      await client.query("UPDATE auto_policy_mandates SET status='ACTIVE' WHERE mandate_id=$1 AND mandate_version=$2", [input.mandateId, input.mandateVersion]);
      await client.query("INSERT INTO auto_policy_mandate_events(event_id,mandate_id,mandate_version,event,actor_id,reason,recorded_at) VALUES($1,$2,$3,'ACTIVATED',$4,$5,$6)", [randomUUID(), input.mandateId, input.mandateVersion, input.actorId.trim(), input.reason.trim(), input.now]);
      await client.query("COMMIT");
      return { status: "ACTIVE" as const, mandateId: input.mandateId, mandateVersion: input.mandateVersion, contentHash: input.contentHash };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async pause(input: { mandateId: string; mandateVersion: number; ownerId: string; testRunId: string; actorId: string; reason: string; now: string }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("UPDATE auto_policy_mandates SET status='PAUSED' WHERE mandate_id=$1 AND mandate_version=$2 AND owner_id=$3 AND test_run_id=$4 AND status='ACTIVE' RETURNING mandate_id", [input.mandateId, input.mandateVersion, input.ownerId, input.testRunId]);
      if (!result.rowCount || !input.actorId.trim() || !input.reason.trim() || !Number.isFinite(Date.parse(input.now))) { await client.query("ROLLBACK"); return false; }
      await client.query("INSERT INTO auto_policy_mandate_events(event_id,mandate_id,mandate_version,event,actor_id,reason,recorded_at) VALUES($1,$2,$3,'PAUSED',$4,$5,$6)", [randomUUID(), input.mandateId, input.mandateVersion, input.actorId.trim(), input.reason.trim(), input.now]);
      await client.query("COMMIT"); return true;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async authorizeOrder(input: { mandateId: string; mandateVersion: number; ownerId: string; clientOrderId: string; commandHash: string; proposal: AutoMandateDecision; now: string }): Promise<{ decision: AutoMandateResult; reservationId?: string; replayed?: boolean }> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<MandateRow>("SELECT * FROM auto_policy_mandates WHERE mandate_id=$1 AND mandate_version=$2 AND owner_id=$3 FOR UPDATE", [input.mandateId, input.mandateVersion, input.ownerId]);
      const row = selected.rows[0];
      if (!row) { await client.query("ROLLBACK"); return { decision: { status: "REJECTED", reasonCode: "SCOPE_MISMATCH" } }; }
      const prior = await client.query<{ reservation_id: string; command_hash: string; amount: string; proposal_id: string; proposal_version: number; proposal_hash: string; status: "RESERVED" | "CONSUMED" | "RELEASED" }>("SELECT reservation_id,command_hash,amount::text,proposal_id,proposal_version,proposal_hash,status FROM auto_policy_budget_reservations WHERE mandate_id=$1 AND mandate_version=$2 AND client_order_id=$3", [input.mandateId, input.mandateVersion, input.clientOrderId]);
      if (prior.rows[0]) {
        const same = prior.rows[0].command_hash.trim() === input.commandHash && prior.rows[0].proposal_id === input.proposal.proposalId && prior.rows[0].proposal_version === input.proposal.proposalVersion && prior.rows[0].proposal_hash.trim() === input.proposal.contentHash;
        await client.query("COMMIT");
        const replayable = same && prior.rows[0].status !== "RELEASED";
        return { decision: replayable ? { status: "AUTHORIZED", mandateId: input.mandateId, mandateVersion: input.mandateVersion, proposalId: input.proposal.proposalId, proposalVersion: input.proposal.proposalVersion, contentHash: input.proposal.contentHash, reservedAmount: prior.rows[0].amount, orderCount: 0 } : { status: "REJECTED", reasonCode: "INVALID_ORDER" }, reservationId: prior.rows[0].reservation_id, replayed: replayable };
      }
      const usage = await client.query<{ amount: string; order_count: string }>("SELECT COALESCE(SUM(amount) FILTER (WHERE status IN('RESERVED','CONSUMED')),0)::text AS amount,COUNT(*) FILTER (WHERE status IN('RESERVED','CONSUMED'))::text AS order_count FROM auto_policy_budget_reservations WHERE mandate_id=$1 AND mandate_version=$2", [input.mandateId, input.mandateVersion]);
      const decision = evaluateAutoMandate({ mandate: toMandate(row), proposal: input.proposal, now: input.now, acceptedOrReservedAmount: usage.rows[0].amount, acceptedOrderCount: Number(usage.rows[0].order_count) });
      if (decision.status !== "AUTHORIZED") { await client.query("COMMIT"); return { decision }; }
      const reservationId = randomUUID();
      await client.query("INSERT INTO auto_policy_budget_reservations(reservation_id,mandate_id,mandate_version,proposal_id,proposal_version,proposal_hash,client_order_id,command_hash,amount,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'RESERVED',$10,$10)", [reservationId, input.mandateId, input.mandateVersion, input.proposal.proposalId, input.proposal.proposalVersion, input.proposal.contentHash, input.clientOrderId, input.commandHash, decision.reservedAmount, input.now]);
      await client.query("COMMIT"); return { decision, reservationId, replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async settleReservation(input: { reservationId: string; status: "CONSUMED" | "RELEASED"; now: string }): Promise<boolean> {
    const result = await this.pool.query("UPDATE auto_policy_budget_reservations SET status=$2,updated_at=$3 WHERE reservation_id=$1 AND status='RESERVED'", [input.reservationId, input.status, input.now]);
    if (result.rowCount === 1) return true;
    const prior = await this.pool.query<{ status: string }>("SELECT status FROM auto_policy_budget_reservations WHERE reservation_id=$1", [input.reservationId]);
    return prior.rows[0]?.status === input.status;
  }
}
