import { describe, expect, it } from "vitest";
import { calculateDeepSeekFlashCost } from "../../src/application/v31-deepseek-cost.js";

const usage = {
  prompt_tokens: 1_000,
  completion_tokens: 500,
  total_tokens: 1_500,
  prompt_cache_hit_tokens: 800,
  prompt_cache_miss_tokens: 200,
};

describe("DeepSeek Flash versioned tariff calculation", () => {
  it("separates cache-hit, cache-miss and output usage and labels calculated cost as unreconciled", () => {
    expect(calculateDeepSeekFlashCost(usage, "OFF_PEAK")).toEqual({
      status: "CALCULATED_COST",
      tariffVersion: "deepseek-flash-official-2026-09-30",
      pricingWindow: "OFF_PEAK",
      usage,
      costNanoUsd: 332_400,
      reservationCents: 1,
      invoiceReconciliation: "NOT_PERFORMED",
    });
  });

  it("uses peak rates and rounds fractional cents up for a conservative reservation", () => {
    const result = calculateDeepSeekFlashCost({
      prompt_tokens: 20_000,
      completion_tokens: 20_000,
      total_tokens: 40_000,
      prompt_cache_hit_tokens: 0,
      prompt_cache_miss_tokens: 20_000,
    }, "PEAK");
    expect(result.costNanoUsd).toBe(30_000_000);
    expect(result.reservationCents).toBe(3);
  });

  it("rejects missing, inconsistent, unsafe, or implicitly selected pricing inputs", () => {
    expect(() => calculateDeepSeekFlashCost({ ...usage, prompt_cache_hit_tokens: 900 } as any, "OFF_PEAK")).toThrow("inconsistent");
    expect(() => calculateDeepSeekFlashCost({ ...usage, total_tokens: 10 } as any, "OFF_PEAK")).toThrow("inconsistent");
    expect(() => calculateDeepSeekFlashCost({ prompt_tokens: 0, completion_tokens: Number.MAX_SAFE_INTEGER, total_tokens: Number.MAX_SAFE_INTEGER, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 0 }, "OFF_PEAK")).toThrow("safe integer precision");
    expect(() => calculateDeepSeekFlashCost(usage, undefined as any)).toThrow("explicitly determined");
  });
});
