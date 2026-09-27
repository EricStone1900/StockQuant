import { Pool } from "pg";
import { MinuteImportRepository } from "../dist/application/minute-import-repository.js";

const connectionString = process.env.MARKET_DATA_PARTITION_BACKFILL_DATABASE_URL;
if (!connectionString) {
  console.error("set MARKET_DATA_PARTITION_BACKFILL_DATABASE_URL explicitly; no database default is permitted");
  process.exit(2);
}

const target = new URL(connectionString);
const database = decodeURIComponent(target.pathname.replace(/^\//u, ""));
if (database === "market_data" || decodeURIComponent(target.username) === "market_data") {
  console.error("refusing to target the formal market_data database or service identity");
  process.exit(2);
}

const apply = process.argv.includes("--apply");
const batchArg = process.argv.find((argument) => argument.startsWith("--batch-size="));
const batchSize = batchArg ? Number(batchArg.slice("--batch-size=".length)) : 1_000;
if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
  console.error("--batch-size must be an integer from 1 to 10000");
  process.exit(2);
}

const pool = new Pool({ connectionString });
try {
  const repository = new MinuteImportRepository(pool);
  await repository.migrate();
  const before = await pool.query(`SELECT count(*)::bigint AS legacy_rows,
    count(*) FILTER (WHERE partitioned.row_number IS NULL)::bigint AS pending_rows
    FROM market_data_minute_import_rows legacy
    LEFT JOIN market_data_minute_import_bars_by_day partitioned
      ON partitioned.version=legacy.version AND partitioned.row_number=legacy.row_number`);
  const copied = apply ? await repository.backfillLegacyPartitions(batchSize) : 0;
  const after = await pool.query(`SELECT count(*)::bigint AS partitioned_rows,
    count(*) FILTER (WHERE partitioned.row_number IS NULL)::bigint AS pending_rows
    FROM market_data_minute_import_rows legacy
    LEFT JOIN market_data_minute_import_bars_by_day partitioned
      ON partitioned.version=legacy.version AND partitioned.row_number=legacy.row_number`);
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "PREVIEW", database, batchSize, legacyRows: Number(before.rows[0].legacy_rows), pendingBefore: Number(before.rows[0].pending_rows), insertedRows: copied, pendingAfter: Number(after.rows[0].pending_rows), legacyRowsRetained: true }, null, 2));
  if (apply && Number(after.rows[0].pending_rows) !== 0) process.exitCode = 1;
} finally {
  await pool.end();
}
