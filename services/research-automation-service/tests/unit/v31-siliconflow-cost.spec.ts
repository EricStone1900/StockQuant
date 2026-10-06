import { describe, expect, it } from "vitest";
import { calculateSiliconFlowEmbeddingCost } from "../../src/application/v31-siliconflow-cost.js";

describe("SiliconFlow Qwen3-Embedding-4B versioned tariff calculation", () => {
  it("calculates one million input tokens and marks invoice reconciliation pending", () => {
    expect(calculateSiliconFlowEmbeddingCost({ prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 })).toEqual({
      status: "CALCULATED_COST",
      tariffVersion: "siliconflow-qwen3-embedding-4b-official-2026-09-30",
      model: "Qwen/Qwen3-Embedding-4B",
      promptTokens: 1_000_000,
      costNanoUsd: 20_000_000,
      reservationCents: 2,
      invoiceReconciliation: "NOT_PERFORMED",
    });
  });

  it("rounds a fractional cent reservation up and rejects inconsistent or unsafe usage", () => {
    expect(calculateSiliconFlowEmbeddingCost({ prompt_tokens: 100_000, completion_tokens: 0, total_tokens: 100_000 }).reservationCents).toBe(1);
    expect(() => calculateSiliconFlowEmbeddingCost({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })).toThrow("incomplete or inconsistent");
    expect(() => calculateSiliconFlowEmbeddingCost({ prompt_tokens: 10, completion_tokens: 1, total_tokens: 10 })).toThrow("incomplete or inconsistent");
    expect(() => calculateSiliconFlowEmbeddingCost({ prompt_tokens: Number.MAX_SAFE_INTEGER, completion_tokens: 0, total_tokens: Number.MAX_SAFE_INTEGER })).toThrow("safe integer precision");
  });
});
