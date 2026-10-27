import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export type NewsRevisionInput = { sourceId: string; sourceItemId: string; sourceUrl: string | null; title: string; publishedAt: string | null; symbols: string[]; observedAt: string; ingestedAt: string; availableAt: string };
export type NewsRevision = NewsRevisionInput & { revision: number; contentHash: string; supersedesRevision: number | null };

function contentHash(input: NewsRevisionInput): string {
  return createHash("sha256").update(JSON.stringify({ sourceUrl: input.sourceUrl, title: input.title.trim().normalize("NFKC"), publishedAt: input.publishedAt, symbols: [...new Set(input.symbols)].sort() })).digest("hex");
}

export class PostgresNewsRevisionRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_news_revisions (
      source_id TEXT NOT NULL,
      source_item_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision > 0),
      source_url TEXT,
      title TEXT NOT NULL,
      published_at TIMESTAMPTZ,
      symbols JSONB NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ NOT NULL,
      available_at TIMESTAMPTZ NOT NULL,
      content_hash TEXT NOT NULL,
      supersedes_revision INTEGER,
      PRIMARY KEY(source_id, source_item_id, revision),
      UNIQUE(source_id, source_item_id, content_hash)
    )`);
  }

  async append(input: NewsRevisionInput): Promise<{ revision: NewsRevision; created: boolean }> {
    if (!input.sourceId.trim() || !input.sourceItemId.trim() || !input.title.trim()) throw new Error("NEWS_STABLE_ID_REQUIRED");
    if (input.publishedAt !== null && !Number.isFinite(Date.parse(input.publishedAt))) throw new Error("INVALID_PUBLISHED_AT");
    const hash = contentHash(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))", [input.sourceId, input.sourceItemId]);
      const existing = await client.query<any>("SELECT * FROM market_data_news_revisions WHERE source_id=$1 AND source_item_id=$2 AND content_hash=$3", [input.sourceId, input.sourceItemId, hash]);
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { revision: this.map(existing.rows[0]), created: false };
      }
      const latest = await client.query<{ revision: number }>("SELECT revision FROM market_data_news_revisions WHERE source_id=$1 AND source_item_id=$2 ORDER BY revision DESC LIMIT 1 FOR UPDATE", [input.sourceId, input.sourceItemId]);
      const supersedesRevision = latest.rows[0]?.revision ?? null;
      const revision = (supersedesRevision ?? 0) + 1;
      const inserted = await client.query<any>(`INSERT INTO market_data_news_revisions(source_id,source_item_id,revision,source_url,title,published_at,symbols,observed_at,ingested_at,available_at,content_hash,supersedes_revision)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12) RETURNING *`, [input.sourceId, input.sourceItemId, revision, input.sourceUrl, input.title.trim().normalize("NFKC"), input.publishedAt, JSON.stringify([...new Set(input.symbols)]), input.observedAt, input.ingestedAt, input.availableAt, hash, supersedesRevision]);
      await client.query("COMMIT");
      return { revision: this.map(inserted.rows[0]), created: true };
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async list(sourceId: string, sourceItemId: string): Promise<NewsRevision[]> {
    const result = await this.pool.query<any>("SELECT * FROM market_data_news_revisions WHERE source_id=$1 AND source_item_id=$2 ORDER BY revision", [sourceId, sourceItemId]);
    return result.rows.map((row) => this.map(row));
  }

  async listBySource(sourceId: string): Promise<NewsRevision[]> {
    const result = await this.pool.query<any>("SELECT * FROM market_data_news_revisions WHERE source_id=$1 ORDER BY source_item_id,revision", [sourceId]);
    return result.rows.map((row) => this.map(row));
  }

  private map(row: any): NewsRevision {
    return { sourceId: row.source_id, sourceItemId: row.source_item_id, revision: row.revision, sourceUrl: row.source_url, title: row.title, publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null, symbols: row.symbols, observedAt: new Date(row.observed_at).toISOString(), ingestedAt: new Date(row.ingested_at).toISOString(), availableAt: new Date(row.available_at).toISOString(), contentHash: row.content_hash, supersedesRevision: row.supersedes_revision };
  }
}
