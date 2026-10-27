import { buildNewsPreview, type NewsEvidenceItem } from "./v21-market-observation.js";

type Article = NewsEvidenceItem & { sourceItemId: string; sourceUrl: string };
type RevisionInput = Omit<Article, "newsId" | "revision">;

/** Persist source facts independently. One failed source must not erase another or old revisions. */
export async function collectV21News(
  sourceIds: string[],
  fetchArticle: (sourceId: string) => Promise<Article | null>,
  append: (article: RevisionInput) => Promise<{ revision: { revision: number } }>,
) {
  const persisted = await Promise.all(sourceIds.map(async (sourceId) => {
    try {
      const article = await fetchArticle(sourceId);
      if (!article) return null;
      if (article.sourceId !== sourceId) throw new Error("NEWS_SOURCE_ID_MISMATCH");
      const { newsId: _newsId, revision: _revision, ...input } = article;
      const { revision } = await append(input);
      return { ...article, revision: revision.revision };
    } catch { return null; }
  }));
  return buildNewsPreview(sourceIds, persisted);
}
