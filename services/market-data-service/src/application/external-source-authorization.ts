export type SourceUse = "QUOTE" | "NEWS" | "MINUTE_COLLECTION" | "HISTORICAL_RESEARCH";

const CONFIG = {
  QUOTE: ["STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED", "STOCKQUANT_MARKET_QUOTE_SOURCE_AUTHORIZATION_REF", "STOCKQUANT_MARKET_QUOTE_DATA_VERSION", "STOCKQUANT_MARKET_QUOTE_AUTHORIZED_SOURCE_IDS"],
  NEWS: ["STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED", "STOCKQUANT_MARKET_NEWS_SOURCE_AUTHORIZATION_REF", "STOCKQUANT_MARKET_NEWS_DATA_VERSION", "STOCKQUANT_MARKET_NEWS_AUTHORIZED_SOURCE_IDS"],
  MINUTE_COLLECTION: ["STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED", "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF", "STOCKQUANT_COLLECTION_DATA_VERSION", "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS"],
  HISTORICAL_RESEARCH: ["STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED", "STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF", "STOCKQUANT_MARKET_RESEARCH_DATA_VERSION", "STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS"],
} as const satisfies Record<SourceUse, readonly [string, string, string, string]>;
const DEFAULT_SOURCES: Record<SourceUse, readonly string[]> = {
  QUOTE: ["tencent-quote", "sina-quote"],
  NEWS: ["eastmoney-news", "cls-news"],
  MINUTE_COLLECTION: ["sina", "baostock"],
  HISTORICAL_RESEARCH: ["baostock"],
};

function shouldEnableAuthorizedCollectionWorker(requested: boolean, sourceIds: readonly string[], env: NodeJS.ProcessEnv): boolean {
  return requested && externalSourceUseAuthorized("MINUTE_COLLECTION", sourceIds, env);
}

/** Scheduling collection runs is fail-closed too: without permission, do not create work that cannot legally execute. */
export function shouldEnableCollectionScheduler(requested: boolean, sourceIds: readonly string[], env: NodeJS.ProcessEnv = process.env): boolean {
  return shouldEnableAuthorizedCollectionWorker(requested, sourceIds, env);
}

/** The worker that calls external minute sources requires the same exact source authorization as its scheduler. */
export function shouldEnableCollectionExecutor(requested: boolean, sourceIds: readonly string[], env: NodeJS.ProcessEnv = process.env): boolean {
  return shouldEnableAuthorizedCollectionWorker(requested, sourceIds, env);
}

/** Runtime opt-in guard; a config flag alone is not legal permission or product approval. */
export function externalSourceUseAuthorized(use: SourceUse, requiredSourceIds: readonly string[] = [], env: NodeJS.ProcessEnv = process.env): boolean {
  const [flag, authorizationRef, dataVersion, authorizedSourceIds] = CONFIG[use];
  const required = requiredSourceIds.length > 0 ? requiredSourceIds : DEFAULT_SOURCES[use];
  const allowed = new Set((env[authorizedSourceIds] ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  return env[flag] === "true" && Boolean(env[authorizationRef]?.trim()) && Boolean(env[dataVersion]?.trim())
    && required.every((sourceId) => allowed.has(sourceId));
}

export function missingSourceAuthorizationConfig(use: SourceUse, requiredSourceIds: readonly string[] = [], env: NodeJS.ProcessEnv = process.env): string[] {
  const [flag, authorizationRef, dataVersion, authorizedSourceIds] = CONFIG[use];
  const required = requiredSourceIds.length > 0 ? requiredSourceIds : DEFAULT_SOURCES[use];
  const allowed = new Set((env[authorizedSourceIds] ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  return [
    ...(env[flag] === "true" ? [] : [flag]),
    ...(env[authorizationRef]?.trim() ? [] : [authorizationRef]),
    ...(env[dataVersion]?.trim() ? [] : [dataVersion]),
    ...(required.every((sourceId) => allowed.has(sourceId)) ? [] : [authorizedSourceIds]),
  ];
}
