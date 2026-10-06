/**
 * Calculates a conservative reservation charge from DeepSeek usage and a
 * versioned tariff snapshot. This is not invoice reconciliation; callers must
 * keep the live-call preflight blocked until provider billing is reconciled.
 */
export type DeepSeekUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cache_hit_tokens: number;
  prompt_cache_miss_tokens: number;
};

export type DeepSeekPricingWindow = "PEAK" | "OFF_PEAK";

export const DEEPSEEK_FLASH_RATE_CARD = {
  version: "deepseek-flash-official-2026-09-30",
  source: "https://api-docs.deepseek.com/quick_start/pricing/",
  currency: "USD",
  unitsPerMillionTokens: 1_000_000,
  nanoUsdPerMillionTokens: {
    OFF_PEAK: { inputCacheHit: 3_000_000, inputCacheMiss: 150_000_000, output: 600_000_000 },
    PEAK: { inputCacheHit: 6_000_000, inputCacheMiss: 300_000_000, output: 1_200_000_000 },
  },
  nanoUsdPerCent: 10_000_000,
} as const;

export type DeepSeekCostResult = {
  status: "CALCULATED_COST";
  tariffVersion: string;
  pricingWindow: DeepSeekPricingWindow;
  usage: DeepSeekUsage;
  costNanoUsd: number;
  reservationCents: number;
  invoiceReconciliation: "NOT_PERFORMED";
};

const nonNegativeSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export function calculateDeepSeekFlashCost(usage: DeepSeekUsage, pricingWindow: DeepSeekPricingWindow): DeepSeekCostResult {
  if (!usage || !nonNegativeSafeInteger(usage.prompt_tokens)
    || !nonNegativeSafeInteger(usage.completion_tokens)
    || !nonNegativeSafeInteger(usage.total_tokens)
    || !nonNegativeSafeInteger(usage.prompt_cache_hit_tokens)
    || !nonNegativeSafeInteger(usage.prompt_cache_miss_tokens)) throw new Error("DeepSeek usage is incomplete or invalid");
  if (usage.prompt_tokens !== usage.prompt_cache_hit_tokens + usage.prompt_cache_miss_tokens
    || usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens) throw new Error("DeepSeek token usage totals are inconsistent");
  if (pricingWindow !== "PEAK" && pricingWindow !== "OFF_PEAK") throw new Error("DeepSeek pricing window must be explicitly determined");

  const rate = DEEPSEEK_FLASH_RATE_CARD.nanoUsdPerMillionTokens[pricingWindow];
  const numerator = usage.prompt_cache_hit_tokens * rate.inputCacheHit
    + usage.prompt_cache_miss_tokens * rate.inputCacheMiss
    + usage.completion_tokens * rate.output;
  if (!Number.isSafeInteger(numerator)) throw new Error("DeepSeek cost calculation exceeds safe integer precision");
  const costNanoUsd = Math.ceil(numerator / DEEPSEEK_FLASH_RATE_CARD.unitsPerMillionTokens);
  const reservationCents = Math.ceil(costNanoUsd / DEEPSEEK_FLASH_RATE_CARD.nanoUsdPerCent);
  return {
    status: "CALCULATED_COST",
    tariffVersion: DEEPSEEK_FLASH_RATE_CARD.version,
    pricingWindow,
    usage: { ...usage },
    costNanoUsd,
    reservationCents,
    invoiceReconciliation: "NOT_PERFORMED",
  };
}
