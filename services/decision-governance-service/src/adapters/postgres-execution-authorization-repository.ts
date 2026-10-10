import type { Pool, PoolClient } from "pg";
import type { ExecutionAuthorizationRepository } from "../ports/execution-authorization-repository.js";

export async function migrateExecutionAuthorizations(pool: PoolClient): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS execution_authorizations (authorization_id UUID PRIMARY KEY, namespace TEXT UNIQUE NOT NULL, account_id UUID NOT NULL, command_hash CHAR(64) NOT NULL, environment_mode TEXT NOT NULL DEFAULT 'BACKTEST', broker_mode TEXT NOT NULL DEFAULT 'FAKE', status TEXT NOT NULL CHECK(status IN('ACTIVE','CONSUMED','REVOKED')), expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, revocation_reason TEXT); ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS environment_mode TEXT NOT NULL DEFAULT 'BACKTEST'; ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS broker_mode TEXT NOT NULL DEFAULT 'FAKE'; ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ; ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS revocation_reason TEXT; ALTER TABLE execution_authorizations DROP CONSTRAINT IF EXISTS execution_authorizations_status_check; ALTER TABLE execution_authorizations ADD CONSTRAINT execution_authorizations_status_check CHECK(status IN('ACTIVE','CONSUMED','REVOKED'));`);
}

export class PostgresExecutionAuthorizationRepository implements ExecutionAuthorizationRepository {
  constructor(private readonly pool: Pool) {}

  async ready(): Promise<void> { await this.pool.query("SELECT 1"); }

  async grantPaper(input: { authorizationId: string; namespace: string; accountId: string; commandHash: string }) {
    const result = await this.pool.query<{ authorization_id: string; status: string; expires_at: Date }>(`INSERT INTO execution_authorizations(authorization_id,namespace,account_id,command_hash,environment_mode,broker_mode,status,expires_at)
      VALUES($1,$2,$3,$4,'PAPER','FAKE','ACTIVE',now()+interval '30 minutes')
      ON CONFLICT(namespace) DO UPDATE SET expires_at=CASE WHEN execution_authorizations.status='ACTIVE' AND execution_authorizations.expires_at<=now() THEN now()+interval '30 minutes' ELSE execution_authorizations.expires_at END
      WHERE execution_authorizations.account_id=EXCLUDED.account_id AND execution_authorizations.command_hash=EXCLUDED.command_hash
        AND execution_authorizations.environment_mode='PAPER' AND execution_authorizations.broker_mode='FAKE'
      RETURNING authorization_id,status,expires_at`, [input.authorizationId, input.namespace, input.accountId, input.commandHash]);
    const row = result.rows[0];
    return row ? { authorizationId: row.authorization_id, status: row.status, expiresAt: row.expires_at } : null;
  }

  async revokePaper(input: { authorizationId: string; namespace: string; accountId: string; reason: string }) {
    const revoked = await this.pool.query<{ revoked_at: Date }>(`UPDATE execution_authorizations SET status='REVOKED',revoked_at=now(),revocation_reason=$4 WHERE authorization_id=$1 AND namespace=$2 AND account_id=$3 AND status='ACTIVE' RETURNING revoked_at`, [input.authorizationId, input.namespace, input.accountId, input.reason]);
    if (revoked.rowCount === 1) return { status: "REVOKED" as const, replayed: false, revokedAt: revoked.rows[0].revoked_at };
    const current = await this.pool.query<{ status: string; revocation_reason: string | null; revoked_at: Date | null }>("SELECT status,revocation_reason,revoked_at FROM execution_authorizations WHERE authorization_id=$1 AND namespace=$2 AND account_id=$3", [input.authorizationId, input.namespace, input.accountId]);
    if (current.rowCount === 0) return { status: "NOT_FOUND" as const };
    if (current.rows[0].status === "REVOKED" && current.rows[0].revocation_reason === input.reason) return { status: "REVOKED" as const, replayed: true, revokedAt: current.rows[0].revoked_at! };
    return { status: "CONFLICT" as const };
  }

  async validatePaper(input: { authorizationId: string; accountId: string; commandHash: string }): Promise<"VALID" | "REPLAYED" | "INVALID"> {
    const row = await this.pool.query(`UPDATE execution_authorizations SET status='CONSUMED' WHERE authorization_id=$1 AND account_id=$2 AND command_hash=$3 AND environment_mode='PAPER' AND broker_mode='FAKE' AND status='ACTIVE' AND expires_at>now() RETURNING authorization_id`, [input.authorizationId, input.accountId, input.commandHash]);
    if (row.rowCount === 1) return "VALID";
    const replay = await this.pool.query("SELECT 1 FROM execution_authorizations WHERE authorization_id=$1 AND account_id=$2 AND command_hash=$3 AND environment_mode='PAPER' AND broker_mode='FAKE' AND status='CONSUMED'", [input.authorizationId, input.accountId, input.commandHash]);
    return replay.rowCount === 1 ? "REPLAYED" : "INVALID";
  }

  async grantReplay(input: { authorizationId: string; namespace: string; accountId: string; commandHash: string }): Promise<string> {
    const row = await this.pool.query<{ authorization_id: string }>(`INSERT INTO execution_authorizations(authorization_id,namespace,account_id,command_hash,environment_mode,broker_mode,status,expires_at) VALUES($1,$2,$3,$4,'BACKTEST','FAKE','ACTIVE',now()+interval '5 minutes') ON CONFLICT(namespace) DO UPDATE SET authorization_id=EXCLUDED.authorization_id,account_id=EXCLUDED.account_id,command_hash=EXCLUDED.command_hash,environment_mode=EXCLUDED.environment_mode,broker_mode=EXCLUDED.broker_mode,status='ACTIVE',expires_at=EXCLUDED.expires_at RETURNING authorization_id`, [input.authorizationId, input.namespace, input.accountId, input.commandHash]);
    return row.rows[0].authorization_id;
  }

  async validateReplay(input: { authorizationId: string; accountId: string; commandHash: string }): Promise<"VALID" | "REPLAYED" | "INVALID"> {
    const row = await this.pool.query(`UPDATE execution_authorizations SET status='CONSUMED' WHERE authorization_id=$1 AND account_id=$2 AND command_hash=$3 AND status='ACTIVE' AND expires_at>now() RETURNING authorization_id`, [input.authorizationId, input.accountId, input.commandHash]);
    if (row.rowCount === 1) return "VALID";
    const replay = await this.pool.query("SELECT 1 FROM execution_authorizations WHERE authorization_id=$1 AND account_id=$2 AND command_hash=$3 AND status='CONSUMED'", [input.authorizationId, input.accountId, input.commandHash]);
    return replay.rowCount === 1 ? "REPLAYED" : "INVALID";
  }
}
