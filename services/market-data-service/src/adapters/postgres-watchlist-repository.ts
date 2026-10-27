import type { Pool, PoolClient } from "pg";
import type { WatchlistPriorityInput, WatchlistPriorityResult } from "../application/watchlist.js";

export type WatchlistScope = { ownerId: string; accountId: string; namespace: string; testRunId: string };
export type StoredWatchlist = WatchlistScope & WatchlistPriorityInput & Extract<WatchlistPriorityResult, { accepted: true }> & { count: number; max: 100; updatedAt: string };

export class PostgresWatchlistRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_watchlists (
      owner_id TEXT NOT NULL,
      account_id UUID NOT NULL,
      namespace TEXT NOT NULL,
      test_run_id UUID NOT NULL,
      holdings JSONB NOT NULL,
      in_flight_orders JSONB NOT NULL,
      candidates JSONB NOT NULL,
      securities JSONB NOT NULL,
      required_count INTEGER NOT NULL CHECK (required_count BETWEEN 0 AND 100),
      omitted_candidates JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(owner_id, account_id, test_run_id)
    )`);
  }

  async get(scope: Pick<WatchlistScope, "ownerId" | "accountId" | "testRunId">): Promise<StoredWatchlist | null> {
    const result = await this.pool.query<any>(`SELECT * FROM market_data_watchlists WHERE owner_id=$1 AND account_id=$2 AND test_run_id=$3`, [scope.ownerId, scope.accountId, scope.testRunId]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      ownerId: row.owner_id, accountId: row.account_id, namespace: row.namespace, testRunId: row.test_run_id,
      holdings: row.holdings, inFlightOrders: row.in_flight_orders, candidates: row.candidates,
      accepted: true, securities: row.securities, count: row.securities.length, max: 100,
      requiredCount: row.required_count, omittedCandidates: row.omitted_candidates,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async save(scope: WatchlistScope, input: WatchlistPriorityInput, result: Extract<WatchlistPriorityResult, { accepted: true }>): Promise<StoredWatchlist> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize creation as well as updates; SELECT FOR UPDATE cannot lock a missing row.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [`${scope.ownerId}:${scope.accountId}`, scope.testRunId]);
      const existing = await client.query<{ namespace: string }>(`SELECT namespace FROM market_data_watchlists WHERE owner_id=$1 AND account_id=$2 AND test_run_id=$3 FOR UPDATE`, [scope.ownerId, scope.accountId, scope.testRunId]);
      if (existing.rowCount && existing.rows[0]!.namespace !== scope.namespace) throw new Error("WATCHLIST_SCOPE_CONFLICT");
      const saved = await client.query<any>(`INSERT INTO market_data_watchlists(owner_id,account_id,namespace,test_run_id,holdings,in_flight_orders,candidates,securities,required_count,omitted_candidates,updated_at)
        VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb,now())
        ON CONFLICT(owner_id,account_id,test_run_id) DO UPDATE SET namespace=EXCLUDED.namespace,holdings=EXCLUDED.holdings,in_flight_orders=EXCLUDED.in_flight_orders,candidates=EXCLUDED.candidates,securities=EXCLUDED.securities,required_count=EXCLUDED.required_count,omitted_candidates=EXCLUDED.omitted_candidates,updated_at=now()
        RETURNING *`, [scope.ownerId, scope.accountId, scope.namespace, scope.testRunId, JSON.stringify(input.holdings), JSON.stringify(input.inFlightOrders), JSON.stringify(input.candidates), JSON.stringify(result.securities), result.requiredCount, JSON.stringify(result.omittedCandidates)]);
      await client.query("COMMIT");
      const row = saved.rows[0];
      return { ownerId: row.owner_id, accountId: row.account_id, namespace: row.namespace, testRunId: row.test_run_id, holdings: row.holdings, inFlightOrders: row.in_flight_orders, candidates: row.candidates, accepted: true, securities: row.securities, count: row.securities.length, max: 100, requiredCount: row.required_count, omittedCandidates: row.omitted_candidates, updatedAt: new Date(row.updated_at).toISOString() };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
