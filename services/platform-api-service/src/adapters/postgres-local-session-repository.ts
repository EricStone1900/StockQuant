import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class PostgresLocalSessionRepository {
  constructor(private readonly pool: Pool, private readonly ownerId: string) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS platform_local_sessions (
        token_sha256 char(64) PRIMARY KEY,
        owner_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL
      )
    `);
    await this.pool.query("CREATE INDEX IF NOT EXISTS platform_local_sessions_owner_expiry_idx ON platform_local_sessions (owner_id, expires_at)");
  }

  async issue(): Promise<{ token: string; maxAgeSeconds: number }> {
    const token = randomBytes(32).toString("hex");
    await this.pool.query(
      "INSERT INTO platform_local_sessions (token_sha256, owner_id, expires_at) VALUES ($1,$2,now()+($3 * interval '1 second'))",
      [tokenHash(token), this.ownerId, SESSION_TTL_SECONDS],
    );
    return { token, maxAgeSeconds: SESSION_TTL_SECONDS };
  }

  async authenticate(token: string): Promise<string | null> {
    if (!/^[a-f0-9]{64}$/u.test(token)) return null;
    const result = await this.pool.query<{ owner_id: string }>(
      "SELECT owner_id FROM platform_local_sessions WHERE token_sha256=$1 AND revoked_at IS NULL AND expires_at>now()",
      [tokenHash(token)],
    );
    return result.rows[0]?.owner_id ?? null;
  }

  async revoke(token: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/u.test(token)) return;
    await this.pool.query("UPDATE platform_local_sessions SET revoked_at=now() WHERE token_sha256=$1 AND revoked_at IS NULL", [tokenHash(token)]);
  }
}
