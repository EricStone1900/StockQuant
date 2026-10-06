import { describe, expect, it } from "vitest";
import { SingleFlightGate } from "../../src/application/single-flight-gate.js";
import { PostgresAdvisorySingleFlightGate } from "../../src/adapters/postgres-single-flight-gate.js";

describe("SingleFlightGate", () => {
  it("admits one expensive task, fails fast while held and admits the next after release", () => {
    const gate = new SingleFlightGate();
    const release = gate.tryAcquire();
    expect(release).toBeTypeOf("function");
    expect(gate.tryAcquire()).toBeNull();
    release?.();
    expect(gate.tryAcquire()).toBeTypeOf("function");
  });

  it("keeps release idempotent", () => {
    const gate = new SingleFlightGate();
    const release = gate.tryAcquire();
    release?.(); release?.();
    expect(gate.tryAcquire()).toBeTypeOf("function");
  });
});

describe("PostgresAdvisorySingleFlightGate", () => {
  function createPool() {
    let locked = false;
    const released: boolean[] = [];
    return {
      released,
      pool: {
        async connect() {
          return {
            async query(sql: string) {
              if (sql.includes("pg_try_advisory_lock")) {
                if (locked) return { rows: [{ acquired: false }] };
                locked = true; return { rows: [{ acquired: true }] };
              }
              if (sql.includes("pg_advisory_unlock")) {
                const wasLocked = locked; locked = false; return { rows: [{ unlocked: wasLocked }] };
              }
              throw new Error("unexpected SQL");
            },
            release(error?: Error | boolean) { released.push(Boolean(error)); },
          };
        },
      },
    };
  }

  it("coordinates independent pool sessions and makes release idempotent", async () => {
    const fixture = createPool();
    const first = new PostgresAdvisorySingleFlightGate(fixture.pool as never, [123, 456]);
    const second = new PostgresAdvisorySingleFlightGate(fixture.pool as never, [123, 456]);
    const release = await first.tryAcquire();
    expect(release).toBeTypeOf("function");
    expect(await second.tryAcquire()).toBeNull();
    await release?.(); await release?.();
    expect(fixture.released).toEqual([false, false]);
    expect(await second.tryAcquire()).toBeTypeOf("function");
  });

  it("fails closed when PostgreSQL cannot provide coordination", async () => {
    const gate = new PostgresAdvisorySingleFlightGate({ connect: async () => { throw new Error("database unavailable"); } } as never, [123, 456]);
    await expect(gate.tryAcquire()).rejects.toThrow("database unavailable");
  });
});
