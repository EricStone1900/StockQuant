import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PostgresQlibFixtureArtifactRepository } from "../../src/adapters/postgres-qlib-fixture-artifact-repository.js";
import { QlibArtifactContentStore } from "../../src/adapters/qlib-artifact-content-store.js";

const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
    : JSON.stringify(value);

describe("Qlib Artifact shared content store", () => {
  it("stores new Qlib bytes outside PostgreSQL and serves them through the shared store", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-qlib-shared-content-"));
    const payload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: Buffer.from("model").toString("base64"), predictions: [0.1, 0.2] };
    const testRunId = "11111111-1111-4111-8111-111111111111";
    const ownerId = "artifact-owner";
    let row: Record<string, unknown> | null = null;
    const pool = { query: vi.fn(async (sql: string, values?: unknown[]) => {
      if (sql.includes("INSERT INTO qlib_fixture_artifacts")) {
        expect(sql).toMatch(/VALUES\(\$1,\$2,\$3,\$4,\$5,NULL\)/u);
        row = { artifact_id: values?.[0], test_run_id: values?.[1], owner_id: values?.[2], media_type: values?.[3], sha256: values?.[4], payload: null, status: "PUBLISHED", expires_at: null };
        return { rowCount: 1, rows: [{ artifact_id: values?.[0] }] };
      }
      if (sql.includes("SELECT artifact_id,test_run_id,owner_id,media_type,sha256,payload,status,expires_at")) return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
      throw new Error(`unexpected SQL: ${sql}`);
    }) } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(root));
    try {
      const saved = await repository.save({ testRunId, ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload });
      expect(saved.status).toBe("PUBLISHED");
      const bytes = Buffer.from(canonical(payload));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const contentPath = join(root, "research", testRunId, "qlib-fixture", sha256, sha256);
      expect(readFileSync(contentPath)).toEqual(bytes);
      await expect(repository.find(testRunId, sha256, ownerId)).resolves.toMatchObject({ artifactId: sha256, payload, status: "PUBLISHED" });
      writeFileSync(contentPath, "tampered");
      await expect(repository.find(testRunId, sha256, ownerId)).rejects.toThrow("stored artifact hash");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("continues to read legacy JSONB payloads during rolling migration", async () => {
    const payload = { schemaVersion: "v2.3-qlib-fixture-artifact-v1" as const, modelBase64: Buffer.from("old-model").toString("base64"), predictions: [0.4] };
    const bytes = Buffer.from(canonical(payload));
    const sha256 = createHash("sha256").update(bytes).digest("hex").toString();
    const pool = { query: vi.fn(async () => ({ rowCount: 1, rows: [{ artifact_id: sha256, test_run_id: "11111111-1111-4111-8111-111111111111", owner_id: "artifact-owner", media_type: "application/vnd.stockquant.qlib-fixture-model+json", sha256, payload, status: "PUBLISHED", expires_at: null }] })) } as any;
    const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(tmpdir()));
    await expect(repository.find("11111111-1111-4111-8111-111111111111", sha256, "artifact-owner")).resolves.toMatchObject({ artifactId: sha256, payload });
  });
});
