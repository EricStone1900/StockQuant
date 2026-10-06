import { Pool } from "pg";
import { PostgresQlibFixtureArtifactRepository } from "../dist/adapters/postgres-qlib-fixture-artifact-repository.js";
import { QlibArtifactContentStore } from "../dist/adapters/qlib-artifact-content-store.js";
import { validateQlibBackfillTarget } from "../dist/application/qlib-backfill-config.js";

const { databaseUrl, contentRoot } = validateQlibBackfillTarget(process.env.PLATFORM_API_QLIB_BACKFILL_DATABASE_URL, process.env.PLATFORM_API_QLIB_BACKFILL_CONTENT_ROOT);
const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : 100;
const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
try {
  const repository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(contentRoot));
  const result = await repository.backfillLegacyPayloads(limit, apply);
  console.log(JSON.stringify({ status: "PASS", mode: apply ? "apply" : "dry-run", ...result }));
} finally {
  await pool.end();
}
