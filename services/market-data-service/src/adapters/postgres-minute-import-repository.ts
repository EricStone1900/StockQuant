import type { Pool, PoolClient } from "pg";
import type { MinuteBarPage, MinuteImportBar, MinuteImportRecord, PersistedMinuteImport, PublishMinuteImportInput, PublishMinuteImportStreamInput, StreamingMinuteImportParse } from "../domain/minute-import.js";
import type { MinuteImportPort } from "../ports/minute-import.js";
export type { MinuteBarPage, MinuteImportBar, MinuteImportRecord, PersistedMinuteImport, StreamingMinuteImportParse } from "../domain/minute-import.js";

type MinuteImportRow = {
  import_id: string;
  version: string;
  status: MinuteImportRecord["status"];
  accepted: number;
  errors: unknown[];
  source_sha256: string;
  import_manifest: MinuteImportRecord["manifest"];
};

function mapRow(row: MinuteImportRow): MinuteImportRecord {
  return {
    importId: row.import_id, version: row.version, status: row.status, accepted: row.accepted, errors: row.errors, sha256: row.source_sha256,
    manifest: row.import_manifest ?? { mapping: {}, semantics: {}, provenance: null, researchUseAllowed: false },
  };
}

export class MinuteImportRepository implements MinuteImportPort {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`
      CREATE TABLE IF NOT EXISTS market_data_minute_imports (
        import_key_sha256 TEXT NOT NULL CHECK (import_key_sha256 ~ '^[0-9a-f]{64}$'),
        source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
        import_manifest JSONB NOT NULL DEFAULT '{"mapping":{},"semantics":{}}'::jsonb,
        import_id TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('PUBLISHED','REJECTED')),
        accepted INTEGER NOT NULL CHECK (accepted >= 0),
        errors JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY(import_key_sha256)
      );
      ALTER TABLE market_data_minute_imports ADD COLUMN IF NOT EXISTS import_key_sha256 TEXT;
      ALTER TABLE market_data_minute_imports ADD COLUMN IF NOT EXISTS import_manifest JSONB NOT NULL DEFAULT '{"mapping":{},"semantics":{}}'::jsonb;
      UPDATE market_data_minute_imports SET import_manifest = import_manifest || '{"provenance":null,"researchUseAllowed":false}'::jsonb
        WHERE NOT (import_manifest ? 'provenance') OR NOT (import_manifest ? 'researchUseAllowed');
      UPDATE market_data_minute_imports SET import_key_sha256=source_sha256 WHERE import_key_sha256 IS NULL;
      ALTER TABLE market_data_minute_imports ALTER COLUMN import_key_sha256 SET NOT NULL;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='market_data_minute_imports'::regclass AND conname='market_data_minute_imports_import_key_sha256_check') THEN
          ALTER TABLE market_data_minute_imports ADD CONSTRAINT market_data_minute_imports_import_key_sha256_check CHECK (import_key_sha256 ~ '^[0-9a-f]{64}$');
        END IF;
      END $$;
      DO $$
      DECLARE primary_name TEXT; primary_definition TEXT;
      BEGIN
        SELECT conname, pg_get_constraintdef(oid) INTO primary_name, primary_definition
          FROM pg_constraint WHERE conrelid='market_data_minute_imports'::regclass AND contype='p';
        IF primary_name IS NULL THEN
          ALTER TABLE market_data_minute_imports ADD CONSTRAINT market_data_minute_imports_pkey PRIMARY KEY(import_key_sha256);
        ELSIF primary_definition NOT LIKE '%import_key_sha256%' THEN
          EXECUTE format('ALTER TABLE market_data_minute_imports DROP CONSTRAINT %I', primary_name);
          ALTER TABLE market_data_minute_imports ADD CONSTRAINT market_data_minute_imports_pkey PRIMARY KEY(import_key_sha256);
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS market_data_minute_import_rows (
        version TEXT NOT NULL REFERENCES market_data_minute_imports(version) ON DELETE CASCADE,
        row_number INTEGER NOT NULL CHECK (row_number > 0),
        security_id TEXT NOT NULL,
        bar_start TIMESTAMPTZ NOT NULL,
        bar JSONB NOT NULL,
        PRIMARY KEY(version, row_number)
      );
      CREATE INDEX IF NOT EXISTS market_data_minute_import_rows_partition_idx
        ON market_data_minute_import_rows(version, security_id, bar_start, row_number);
      CREATE TABLE IF NOT EXISTS market_data_minute_import_bars_by_day (
        version TEXT NOT NULL REFERENCES market_data_minute_imports(version) ON DELETE CASCADE,
        bar_start TIMESTAMPTZ NOT NULL,
        row_number INTEGER NOT NULL CHECK (row_number > 0),
        security_id TEXT NOT NULL,
        bar JSONB NOT NULL,
        PRIMARY KEY(version, bar_start, row_number)
      ) PARTITION BY RANGE(bar_start);
      CREATE INDEX IF NOT EXISTS market_data_minute_import_bars_by_day_lookup_idx
        ON market_data_minute_import_bars_by_day(version, security_id, bar_start, row_number);
    `);
  }

  async publish(input: PublishMinuteImportInput): Promise<PersistedMinuteImport> {
    if (!/^[0-9a-f]{64}$/u.test(input.sourceSha256) || (input.importKeySha256 !== undefined && !/^[0-9a-f]{64}$/u.test(input.importKeySha256))) throw new Error("minute import identity hashes must be lowercase SHA-256");
    const manifest = input.manifest ?? { mapping: {}, semantics: {}, provenance: null, researchUseAllowed: false };
    if (manifest.researchUseAllowed !== (manifest.provenance?.licenseVerification === "OPERATOR_CONFIRMED")) throw new Error("minute import research-use status must match the explicit license declaration");
    if (!Number.isSafeInteger(input.accepted) || input.accepted < 0 || !Array.isArray(input.errors) || !Array.isArray(input.bars)) throw new Error("minute import metadata is invalid");
    if (input.status === "PUBLISHED" && input.accepted !== input.bars.length) throw new Error("published minute import accepted count must equal its persisted row count");
    if (input.status === "REJECTED" && (input.accepted !== 0 || input.bars.length !== 0)) throw new Error("rejected minute imports cannot persist accepted rows");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize identical content keys so concurrent retries return one durable import.
      const importKeySha256 = input.importKeySha256 ?? input.sourceSha256;
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [importKeySha256]);
      const existing = await client.query<MinuteImportRow>("SELECT * FROM market_data_minute_imports WHERE import_key_sha256=$1", [importKeySha256]);
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { record: mapRow(existing.rows[0]), idempotent: true };
      }
      const version = `v2.2-import-${importKeySha256.slice(0, 12)}`;
      const record = {
        importId: `minute-import-${importKeySha256.slice(0, 24)}`,
        version,
        status: input.status,
        accepted: input.accepted,
        errors: input.errors,
        sha256: input.sourceSha256,
        manifest,
      } satisfies MinuteImportRecord;
      await client.query("INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)", [importKeySha256, record.sha256, record.importId, record.version, record.status, record.accepted, JSON.stringify(record.errors), JSON.stringify(record.manifest)]);
      if (input.bars.length) await this.insertBars(client, version, input.bars);
      await client.query("COMMIT");
      return { record, idempotent: false };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Parse an uploaded file while staging at most one caller-supplied batch in
   * memory. The staging table is transaction-local; rejected or failed imports
   * never publish partial minute rows.
   */
  async publishStream(input: PublishMinuteImportStreamInput): Promise<PersistedMinuteImport> {
    if (!/^[0-9a-f]{64}$/u.test(input.expectedSha256)) throw new Error("minute import expected SHA-256 must be lowercase SHA-256");
    if (input.manifest.researchUseAllowed !== (input.manifest.provenance?.licenseVerification === "OPERATOR_CONFIRMED")) throw new Error("minute import research-use status must match the explicit license declaration");
    const client = await this.pool.connect();
    let stagedRows = 0;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE TEMP TABLE minute_import_stage_rows (
        row_number INTEGER PRIMARY KEY, security_id TEXT NOT NULL, bar_start TIMESTAMPTZ NOT NULL, bar JSONB NOT NULL
      ) ON COMMIT DROP`);
      const writeBarsBatch = async (bars: MinuteImportBar[]) => {
        if (!Array.isArray(bars) || bars.length > 10_000) throw new Error("minute import persistence batch exceeds 10000 bars");
        if (!bars.length) return;
        const rows = bars.map((bar, index) => ({ row_number: stagedRows + index + 1, security_id: bar.securityId, bar_start: bar.barStart, bar }));
        await client.query(`INSERT INTO minute_import_stage_rows(row_number,security_id,bar_start,bar)
          SELECT entry.row_number,entry.security_id,entry.bar_start,entry.bar
          FROM jsonb_to_recordset($1::jsonb) AS entry(row_number INTEGER,security_id TEXT,bar_start TIMESTAMPTZ,bar JSONB)`, [JSON.stringify(rows)]);
        stagedRows += bars.length;
      };
      const parsed = await input.parse(writeBarsBatch);
      if (parsed.sourceSha256 !== input.expectedSha256) throw new Error("assembled upload size or SHA-256 does not match declaration");
      if (!Number.isSafeInteger(parsed.accepted) || parsed.accepted < 0 || !Array.isArray(parsed.errors)) throw new Error("streamed minute import result is invalid");
      const status: MinuteImportRecord["status"] = parsed.errors.length > 0 || parsed.accepted === 0 ? "REJECTED" : "PUBLISHED";
      if (status === "PUBLISHED" && parsed.accepted !== stagedRows) throw new Error("published streamed import accepted count must equal staged row count");
      const importKeySha256 = input.importKeyForSha(parsed.sourceSha256);
      if (!/^[0-9a-f]{64}$/u.test(importKeySha256)) throw new Error("minute import key must be lowercase SHA-256");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [importKeySha256]);
      const existing = await client.query<MinuteImportRow>("SELECT * FROM market_data_minute_imports WHERE import_key_sha256=$1", [importKeySha256]);
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { record: mapRow(existing.rows[0]), idempotent: true };
      }
      const record = {
        importId: `minute-import-${importKeySha256.slice(0, 24)}`,
        version: `v2.2-import-${importKeySha256.slice(0, 12)}`,
        status,
        accepted: status === "PUBLISHED" ? parsed.accepted : 0,
        errors: parsed.errors,
        sha256: parsed.sourceSha256,
        manifest: input.manifest,
      } satisfies MinuteImportRecord;
      await client.query("INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)", [importKeySha256,record.sha256,record.importId,record.version,record.status,record.accepted,JSON.stringify(record.errors),JSON.stringify(record.manifest)]);
      if (status === "PUBLISHED") {
        const starts = await client.query<{ bar_start: string }>("SELECT DISTINCT bar_start FROM minute_import_stage_rows");
        await this.ensureDailyPartitions(client, starts.rows.map(row => row.bar_start));
        await client.query(`INSERT INTO market_data_minute_import_bars_by_day(version,bar_start,row_number,security_id,bar)
          SELECT $1,bar_start,row_number,security_id,bar FROM minute_import_stage_rows ORDER BY row_number`, [record.version]);
      }
      await client.query("COMMIT");
      return { record, idempotent: false };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async find(version: string): Promise<MinuteImportRecord | null> {
    const result = await this.pool.query<MinuteImportRow>("SELECT * FROM market_data_minute_imports WHERE version=$1", [version]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async page(version: string, cursor: number, pageSize: number, securityId?: string, fromBarStart?: string, toBarStart?: string): Promise<MinuteBarPage> {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("minute import cursor must be a non-negative integer");
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("minute import pageSize must be between 1 and 1000");
    for (const boundary of [fromBarStart,toBarStart]) if (boundary !== undefined && !Number.isFinite(Date.parse(boundary))) throw new Error("minute import time range must use valid timestamps");
    if (fromBarStart && toBarStart && Date.parse(fromBarStart) >= Date.parse(toBarStart)) throw new Error("minute import fromBarStart must be earlier than toBarStart");
    const values: unknown[] = [version,cursor];
    const filters: Array<{ column: string; operator: "=" | ">" | ">=" | "<" }> = [{ column: "version", operator: "=" }, { column: "row_number", operator: ">" }];
    if (securityId !== undefined) { values.push(securityId); filters.push({ column: "security_id", operator: "=" }); }
    if (fromBarStart !== undefined) { values.push(fromBarStart); filters.push({ column: "bar_start", operator: ">=" }); }
    if (toBarStart !== undefined) { values.push(toBarStart); filters.push({ column: "bar_start", operator: "<" }); }
    const where = (alias: string) => filters.map(({ column,operator },index) => `${alias}.${column}${operator}$${index+1}${column === "bar_start" ? "::timestamptz" : ""}`).join(" AND ");
    values.push(pageSize + 1);
    const result = await this.pool.query<{ row_number: number; bar: MinuteImportBar }>(
      `WITH visible_rows AS (
         SELECT row_number,security_id,bar_start,bar FROM market_data_minute_import_bars_by_day
         WHERE ${where("market_data_minute_import_bars_by_day")}
         UNION ALL
         SELECT legacy.row_number,legacy.security_id,legacy.bar_start,legacy.bar FROM market_data_minute_import_rows legacy
         WHERE ${where("legacy")}
           AND NOT EXISTS (SELECT 1 FROM market_data_minute_import_bars_by_day current
             WHERE current.version=legacy.version AND current.row_number=legacy.row_number)
       )
       SELECT row_number,bar FROM visible_rows ORDER BY row_number LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > pageSize;
    const selected = result.rows.slice(0, pageSize);
    return { version, items: selected.map((row) => row.bar), nextCursor: hasMore && selected.length ? String(selected.at(-1)!.row_number) : null };
  }

  async backfillLegacyPartitions(batchSize = 1_000): Promise<number> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) throw new Error("minute partition backfill batchSize must be between 1 and 10000");
    let cursorVersion = "";
    let cursorRow = 0;
    let copied = 0;
    for (;;) {
      const legacy = await this.pool.query<{ version: string; row_number: number; security_id: string; bar_start: string; bar: MinuteImportBar }>(
        `SELECT legacy.version,legacy.row_number,legacy.security_id,legacy.bar_start,legacy.bar FROM market_data_minute_import_rows legacy
         WHERE (legacy.version,legacy.row_number)>($1,$2)
           AND NOT EXISTS (SELECT 1 FROM market_data_minute_import_bars_by_day current
             WHERE current.version=legacy.version AND current.row_number=legacy.row_number)
         ORDER BY legacy.version,legacy.row_number LIMIT $3`, [cursorVersion,cursorRow,batchSize]);
      if (legacy.rows.length === 0) return copied;
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await this.ensureDailyPartitions(client, legacy.rows.map(row => row.bar_start));
        const inserted = await client.query(`INSERT INTO market_data_minute_import_bars_by_day(version,bar_start,row_number,security_id,bar)
          SELECT entry.version,entry.bar_start,entry.row_number,entry.security_id,entry.bar
          FROM jsonb_to_recordset($1::jsonb) AS entry(version TEXT,bar_start TIMESTAMPTZ,row_number INTEGER,security_id TEXT,bar JSONB)
          ON CONFLICT(version,bar_start,row_number) DO NOTHING`, [JSON.stringify(legacy.rows)]);
        await client.query("COMMIT");
        copied += inserted.rowCount ?? 0;
      } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
      finally { client.release(); }
      const last = legacy.rows.at(-1)!; cursorVersion = last.version; cursorRow = last.row_number;
    }
  }

  private async ensureDailyPartitions(client: PoolClient, timestamps: string[]): Promise<void> {
    const days = new Set<string>();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
    for (const timestamp of timestamps) {
      const date = new Date(timestamp);
      if (!Number.isFinite(date.getTime())) throw new Error("minute bar start must be a valid timestamp");
      const parts = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type,part.value]));
      days.add(`${parts.year}-${parts.month}-${parts.day}`);
    }
    for (const day of days) {
      const nextDate = new Date(`${day}T00:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const [nextDay] = nextDate.toISOString().split("T");
      const partition = `market_data_minute_import_bars_${day.replaceAll("-", "")}`;
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`minute-bars-partition:${day}`]);
      await client.query(`CREATE TABLE IF NOT EXISTS ${partition} PARTITION OF market_data_minute_import_bars_by_day
        FOR VALUES FROM ('${day} 00:00:00+08') TO ('${nextDay} 00:00:00+08')`);
    }
  }

  private async insertBars(client: PoolClient, version: string, bars: MinuteImportBar[]): Promise<void> {
    const batchSize = 1_000;
    await this.ensureDailyPartitions(client, bars.map(bar => bar.barStart));
    for (let offset = 0; offset < bars.length; offset += batchSize) {
      const batch = bars.slice(offset, offset + batchSize);
      const rows = batch.map((bar, index) => ({ row_number: offset + index + 1, security_id: bar.securityId, bar_start: bar.barStart, bar }));
      await client.query(
        `INSERT INTO market_data_minute_import_bars_by_day(version,bar_start,row_number,security_id,bar)
         SELECT $1,entry.bar_start,entry.row_number,entry.security_id,entry.bar
         FROM jsonb_to_recordset($2::jsonb) AS entry(row_number INTEGER,security_id TEXT,bar_start TIMESTAMPTZ,bar JSONB)`,
        [version, JSON.stringify(rows)],
      );
    }
  }
}
