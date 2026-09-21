import { describe, expect, it } from "vitest";
import { loadResearchAutomationConfig } from "../../src/bootstrap/config.js";

describe("V3.1 research configuration", () => {
  it("keeps the preparation defaults safe and blocked", () => {
    const config = loadResearchAutomationConfig({});
    expect(config).toMatchObject({
      environmentMode: "RESEARCH",
      brokerMode: "FAKE",
      liveTradingEnabled: false,
      runnerMode: "NOT_CONFIGURED",
      modelGatewayMode: "NOT_CONFIGURED",
      chatProvider: "deepseek",
      chatModel: "deepseek/deepseek-flash",
      chatBaseUrl: "https://api.deepseek.com",
      chatCredentialRef: "DEEPSEEK_API_KEY",
      embeddingProvider: "siliconflow",
      embeddingModel: "litellm_proxy/Qwen/Qwen3-Embedding-4B",
      embeddingDimensions: 1024,
      embeddingBaseUrl: "https://api.siliconflow.cn/v1",
      embeddingCredentialRef: "SILICONFLOW_API_KEY",
      outboundPolicy: "DENY",
      defaultRounds: 1,
      maxRounds: 3,
      budgetCurrency: "USD",
      defaultBudgetCents: 300,
      maxExperimentBudgetCents: 1000,
      stageBudgetCents: 3000,
      budgetWarningPercent: 80,
      workerConcurrency: 1,
      prerequisiteStatus: "PENDING_PREREQUISITES"
    });
  });

  it("rejects live trading or non research modes", () => {
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_BROKER_MODE: "LIVE" })).toThrow("BROKER_MODE=FAKE");
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_ENVIRONMENT_MODE: "PAPER" })).toThrow("ENVIRONMENT_MODE=RESEARCH");
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_LIVE_TRADING_ENABLED: "true" })).toThrow("LIVE_TRADING_ENABLED=false");
  });

  it("requires explicit hosts before an allowlist can be enabled", () => {
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "ALLOWLIST" })).toThrow("OUTBOUND_ALLOWLIST");
    expect(loadResearchAutomationConfig({
      STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "ALLOWLIST",
      STOCKQUANT_RESEARCH_OUTBOUND_ALLOWLIST: "model-gateway.internal,127.0.0.1"
    }).outboundAllowlist).toEqual(["model-gateway.internal", "127.0.0.1"]);
  });

  it("keeps the confirmed budget hierarchy valid", () => {
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_RESEARCH_DEFAULT_BUDGET_CENTS: "1001" })).toThrow("must not exceed");
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_RESEARCH_BUDGET_WARNING_PERCENT: "101" })).toThrow("at most 100");
  });

  it("keeps the V3.1 embedding dimension fixed at 1024", () => {
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS: "2560" })).toThrow("exactly 1024");
    expect(() => loadResearchAutomationConfig({ STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS: "768" })).toThrow("exactly 1024");
    expect(loadResearchAutomationConfig({}).embeddingDimensions).toBe(1024);
  });
});
