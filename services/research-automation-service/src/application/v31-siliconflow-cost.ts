import type { SiliconFlowEmbeddingUsage } from "./v31-siliconflow-embedding-response.js";

/** Versioned snapshot from SiliconFlow's model page; re-check before any live call. */
export const SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD = {
  version: "siliconflow-qwen3-embedding-4b-official-2026-09-30",
  source: "https://www.siliconflow.com/models/qwen3-embedding-4b",
  model: "Qwen/Qwen3-Embedding-4B",
  inputUsdPerMillionTokens: 0.02,
  nanoUsdPerMillionTokens: 20_000_000,
  unitsPerMillionTokens: 1_000_000,
  nanoUsdPerCent: 10_000_000,
} as const;

export type SiliconFlowEmbeddingCostResult = {
  status: "CALCULATED_COST";
  tariffVersion: string;
  model: string;
  promptTokens: number;
  costNanoUsd: number;
  reservationCents: number;
  invoiceReconciliation: "NOT_PERFORMED";
};

export function calculateSiliconFlowEmbeddingCost(usage: SiliconFlowEmbeddingUsage): SiliconFlowEmbeddingCostResult {
  if (!usage || !Number.isSafeInteger(usage.prompt_tokens) || usage.prompt_tokens <= 0
    || !Number.isSafeInteger(usage.completion_tokens) || usage.completion_tokens < 0
    || !Number.isSafeInteger(usage.total_tokens) || usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens) {
    throw new Error("SiliconFlow embedding usage is incomplete or inconsistent");
  }
  const numerator = usage.prompt_tokens * SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD.nanoUsdPerMillionTokens;
  if (!Number.isSafeInteger(numerator)) throw new Error("SiliconFlow cost calculation exceeds safe integer precision");
  const costNanoUsd = Math.ceil(numerator / SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD.unitsPerMillionTokens);
  return {
    status: "CALCULATED_COST",
    tariffVersion: SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD.version,
    model: SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD.model,
    promptTokens: usage.prompt_tokens,
    costNanoUsd,
    reservationCents: Math.ceil(costNanoUsd / SILICONFLOW_QWEN3_EMBEDDING_4B_RATE_CARD.nanoUsdPerCent),
    invoiceReconciliation: "NOT_PERFORMED",
  };
}
