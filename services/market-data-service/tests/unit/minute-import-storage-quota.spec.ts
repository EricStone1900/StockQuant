import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { MinuteImportRepository, MINUTE_IMPORT_MAX_PUBLISHED_ROWS } from "../../src/adapters/postgres-minute-import-repository.js";
import { MinuteImportStorageQuotaExceeded, withMinuteBarContextDefaults } from "../../src/domain/minute-import.js";

describe("published minute import storage quota", () => {
  it("rejects a publish that would exceed the durable row cap", async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.includes("SELECT * FROM market_data_minute_imports WHERE import_key_sha256")) return { rows: [], rowCount: 0 };
        if (sql.includes("sum(accepted)")) return { rows: [{ used: String(MINUTE_IMPORT_MAX_PUBLISHED_ROWS) }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) } as unknown as Pool;
    const repository = new MinuteImportRepository(pool);
    const bar = withMinuteBarContextDefaults({
      securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: "2024-01-02T01:30:00.000Z",
      barEnd: "2024-01-02T01:35:00.000Z", availableAt: "2024-01-02T01:35:00.000Z", open: 10, high: 10,
      low: 10, close: 10, volume: 1, amount: 10, adjustment: "RAW",
    });

    await expect(repository.publish({
      sourceSha256: "a".repeat(64), status: "PUBLISHED", accepted: 1, errors: [], bars: [bar],
      manifest: { mapping: {}, semantics: {}, provenance: null, researchUseAllowed: false },
    })).rejects.toBeInstanceOf(MinuteImportStorageQuotaExceeded);
    expect(statements.some((sql) => sql.includes("pg_advisory_xact_lock") && statements.indexOf(sql) > 0)).toBe(true);
    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
  });
});
