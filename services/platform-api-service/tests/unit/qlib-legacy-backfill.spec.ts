import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PostgresQlibFixtureArtifactRepository } from "../../src/adapters/postgres-qlib-fixture-artifact-repository.js";
import { QlibArtifactContentStore } from "../../src/adapters/qlib-artifact-content-store.js";
import { validateQlibBackfillTarget } from "../../src/application/qlib-backfill-config.js";

const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
    : JSON.stringify(value);
const payload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: Buffer.from("legacy-model").toString("base64"), predictions: [0.25] };
const bytes = Buffer.from(canonical(payload));
const sha = createHash("sha256").update(bytes).digest("hex");
const row = { artifact_id: sha, test_run_id: "11111111-1111-4111-8111-111111111111", sha256: sha, payload, status: "PUBLISHED" };

describe("Qlib legacy payload backfill", () => {
  it("dry-runs, publishes and verifies before a compare-and-set clears JSONB", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-qlib-backfill-"));
    let hasPayload = true;
    const pool = { query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT artifact_id,test_run_id,sha256,payload,status")) return { rowCount: hasPayload ? 1 : 0, rows: hasPayload ? [row] : [] };
      if (sql.includes("UPDATE qlib_fixture_artifacts SET payload=NULL")) { hasPayload = false; return { rowCount: 1, rows: [] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    }) } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(root));
    try {
      await expect(repository.backfillLegacyPayloads(10, false)).resolves.toEqual({ scanned: 1, eligible: 1, migrated: 0, conflicts: 0 });
      expect(pool.query).toHaveBeenCalledTimes(1);
      await expect(repository.backfillLegacyPayloads(10, true)).resolves.toEqual({ scanned: 1, eligible: 1, migrated: 1, conflicts: 0 });
      await expect(repository.backfillLegacyPayloads(10, true)).resolves.toEqual({ scanned: 0, eligible: 0, migrated: 0, conflicts: 0 });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("fails closed on corrupt legacy bytes and preserves the row", async () => {
    const corrupt = { ...row, sha256: "0".repeat(64), artifact_id: "0".repeat(64) };
    const pool = { query: vi.fn(async () => ({ rowCount: 1, rows: [corrupt] })) } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(tmpdir()));
    await expect(repository.backfillLegacyPayloads(1, true)).rejects.toThrow("integrity check failed");
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("preserves JSONB when immutable shared storage refuses the publish", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-qlib-backfill-corrupt-store-"));
    let hasPayload = true;
    const pool = { query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT artifact_id,test_run_id,sha256,payload,status")) return { rowCount: 1, rows: [row] };
      if (sql.includes("UPDATE qlib_fixture_artifacts SET payload=NULL")) { hasPayload = false; return { rowCount: 1, rows: [] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    }) } as any;
    const addressPath = join(root, "research", row.test_run_id, "qlib-fixture", sha, sha);
    mkdirSync(join(addressPath, ".."), { recursive: true });
    writeFileSync(addressPath, "conflicting immutable bytes");
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(root));
    try {
      await expect(repository.backfillLegacyPayloads(1, true)).rejects.toThrow();
      expect(hasPayload).toBe(true);
      expect(pool.query.mock.calls.some(([sql]) => String(sql).includes("UPDATE qlib_fixture_artifacts SET payload=NULL"))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("leaves rows with a concurrent compare-and-set conflict for a later pass", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-qlib-backfill-conflict-"));
    const pool = { query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT artifact_id,test_run_id,sha256,payload,status")) return { rowCount: 1, rows: [row] };
      if (sql.includes("UPDATE qlib_fixture_artifacts SET payload=NULL")) return { rowCount: 0, rows: [] };
      throw new Error(`unexpected SQL: ${sql}`);
    }) } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(root));
    try {
      await expect(repository.backfillLegacyPayloads(1, true)).resolves.toEqual({ scanned: 1, eligible: 1, migrated: 0, conflicts: 1 });
      expect(pool.query.mock.calls.some(([sql]) => String(sql).includes("UPDATE qlib_fixture_artifacts SET payload=NULL"))).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects unbounded batches", async () => {
    const pool = { query: vi.fn() } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(tmpdir()));
    await expect(repository.backfillLegacyPayloads(1001)).rejects.toThrow("limit");
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("Qlib backfill target safety", () => {
  it("accepts only the isolated database and dedicated temp content directory", () => {
    const root = join(tmpdir(), "stockquant-qlib-backfill-a1b2c3d4");
    expect(validateQlibBackfillTarget("postgres://postgres:secret@127.0.0.1:5432/platform_api_test", root)).toEqual({ databaseUrl: "postgres://postgres:secret@127.0.0.1:5432/platform_api_test", contentRoot: root });
  });

  it("rejects active database names and shared volume content roots", () => {
    expect(() => validateQlibBackfillTarget("postgres://postgres:secret@localhost/platform_api", join(tmpdir(), "stockquant-qlib-backfill-a1b2c3d4"))).toThrow("platform_api_test");
    expect(() => validateQlibBackfillTarget("postgres://postgres:secret@localhost/platform_api_test", "/var/lib/stockquant/research-artifacts-v1")).toThrow("system temp directory");
  });
});
