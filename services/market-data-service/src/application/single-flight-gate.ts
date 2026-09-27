import type { Pool } from "pg";

/** A process-local fallback gate for non-persistent/test deployments. */
export class SingleFlightGate {
  private held = false;

  tryAcquire(): (() => void) | null {
    if (this.held) return null;
    this.held = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.held = false;
    };
  }
}

/** A PostgreSQL session advisory lock shared by every service instance using the same database. */
export class PostgresAdvisorySingleFlightGate {
  constructor(private readonly pool: Pick<Pool, "connect">, private readonly key: readonly [number, number]) {}

  async tryAcquire(): Promise<(() => Promise<void>) | null> {
    const client = await this.pool.connect();
    let acquired: boolean;
    try {
      const result = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1::integer, $2::integer) AS acquired", [...this.key]);
      acquired = result.rows[0]?.acquired === true;
    } catch (error) {
      client.release(error instanceof Error ? error : true);
      throw error;
    }
    if (!acquired) {
      client.release();
      return null;
    }

    let released = false;
    return async () => {
      if (released) return;
      released = true;
      try {
        const result = await client.query<{ unlocked: boolean }>("SELECT pg_advisory_unlock($1::integer, $2::integer) AS unlocked", [...this.key]);
        if (result.rows[0]?.unlocked !== true) {
          client.release(true);
          return;
        }
        client.release();
      } catch {
        // Destroy the session if unlock status is uncertain; returning it to the pool could strand the lock.
        client.release(true);
      }
    };
  }
}
