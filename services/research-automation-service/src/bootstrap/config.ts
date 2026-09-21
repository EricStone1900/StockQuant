export type ResearchAutomationConfig = {
  environmentMode: "RESEARCH";
  brokerMode: "FAKE";
  liveTradingEnabled: false;
  runnerMode: "NOT_CONFIGURED" | "ISOLATED";
  modelGatewayMode: "NOT_CONFIGURED" | "LIVE";
  chatProvider: string;
  chatModel: string;
  chatBaseUrl: string;
  chatCredentialRef: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: 1024;
  embeddingBaseUrl: string;
  embeddingCredentialRef: string;
  outboundPolicy: "DENY" | "ALLOWLIST";
  outboundAllowlist: string[];
  defaultRounds: number;
  maxRounds: 3;
  budgetCurrency: "USD";
  defaultBudgetCents: number;
  maxExperimentBudgetCents: number;
  stageBudgetCents: number;
  budgetWarningPercent: number;
  workerConcurrency: 1;
  prerequisiteStatus: "PENDING_PREREQUISITES" | "CONFIGURED";
};

const parsePositiveInteger = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseAllowlist = (value: string | undefined): string[] => (value ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export function loadResearchAutomationConfig(env: NodeJS.ProcessEnv = process.env): ResearchAutomationConfig {
  const environmentMode = env.STOCKQUANT_ENVIRONMENT_MODE ?? "RESEARCH";
  const brokerMode = env.STOCKQUANT_BROKER_MODE ?? "FAKE";
  const liveTradingEnabled = env.STOCKQUANT_LIVE_TRADING_ENABLED ?? "false";
  if (environmentMode !== "RESEARCH") throw new Error("research automation requires STOCKQUANT_ENVIRONMENT_MODE=RESEARCH");
  if (brokerMode !== "FAKE") throw new Error("research automation requires STOCKQUANT_BROKER_MODE=FAKE");
  if (liveTradingEnabled !== "false") throw new Error("research automation requires STOCKQUANT_LIVE_TRADING_ENABLED=false");

  const runnerMode = env.STOCKQUANT_RUNNER_MODE ?? "NOT_CONFIGURED";
  if (runnerMode !== "NOT_CONFIGURED" && runnerMode !== "ISOLATED") throw new Error("STOCKQUANT_RUNNER_MODE must be NOT_CONFIGURED or ISOLATED");
  const modelGatewayMode = env.STOCKQUANT_MODEL_GATEWAY_MODE ?? "NOT_CONFIGURED";
  if (modelGatewayMode !== "NOT_CONFIGURED" && modelGatewayMode !== "LIVE") throw new Error("STOCKQUANT_MODEL_GATEWAY_MODE must be NOT_CONFIGURED or LIVE");
  const chatProvider = env.STOCKQUANT_RESEARCH_CHAT_PROVIDER ?? "deepseek";
  const chatModel = env.STOCKQUANT_RESEARCH_CHAT_MODEL ?? "deepseek/deepseek-flash";
  const chatBaseUrl = env.STOCKQUANT_RESEARCH_CHAT_BASE_URL ?? "https://api.deepseek.com";
  const chatCredentialRef = env.STOCKQUANT_RESEARCH_CHAT_CREDENTIAL_REF ?? "DEEPSEEK_API_KEY";
  const embeddingProvider = env.STOCKQUANT_RESEARCH_EMBEDDING_PROVIDER ?? "siliconflow";
  const embeddingModel = env.STOCKQUANT_RESEARCH_EMBEDDING_MODEL ?? "litellm_proxy/Qwen/Qwen3-Embedding-4B";
  const embeddingDimensions = parsePositiveInteger("STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS", env.STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS, 1024);
  if (![64, 128, 256, 512, 768, 1024, 1536, 2048, 2560].includes(embeddingDimensions)) throw new Error("STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS must be a supported Qwen3 dimension");
  if (embeddingDimensions !== 1024) throw new Error("STOCKQUANT_RESEARCH_EMBEDDING_DIMENSIONS must be exactly 1024 for V3.1");
  const embeddingBaseUrl = env.STOCKQUANT_RESEARCH_EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1";
  const embeddingCredentialRef = env.STOCKQUANT_RESEARCH_EMBEDDING_CREDENTIAL_REF ?? "SILICONFLOW_API_KEY";
  const outboundPolicy = env.STOCKQUANT_RESEARCH_OUTBOUND_POLICY ?? "DENY";
  if (outboundPolicy !== "DENY" && outboundPolicy !== "ALLOWLIST") throw new Error("STOCKQUANT_RESEARCH_OUTBOUND_POLICY must be DENY or ALLOWLIST");
  const outboundAllowlist = parseAllowlist(env.STOCKQUANT_RESEARCH_OUTBOUND_ALLOWLIST);
  if (outboundPolicy === "ALLOWLIST" && outboundAllowlist.length === 0) throw new Error("ALLOWLIST outbound policy requires STOCKQUANT_RESEARCH_OUTBOUND_ALLOWLIST");

  const defaultRounds = parsePositiveInteger("STOCKQUANT_RESEARCH_DEFAULT_ROUNDS", env.STOCKQUANT_RESEARCH_DEFAULT_ROUNDS, 1);
  if (defaultRounds > 3) throw new Error("STOCKQUANT_RESEARCH_DEFAULT_ROUNDS must be at most 3");
  const budgetCurrency = env.STOCKQUANT_RESEARCH_BUDGET_CURRENCY ?? "USD";
  if (budgetCurrency !== "USD") throw new Error("STOCKQUANT_RESEARCH_BUDGET_CURRENCY must be USD");
  const defaultBudgetCents = parsePositiveInteger("STOCKQUANT_RESEARCH_DEFAULT_BUDGET_CENTS", env.STOCKQUANT_RESEARCH_DEFAULT_BUDGET_CENTS, 300);
  const maxExperimentBudgetCents = parsePositiveInteger("STOCKQUANT_RESEARCH_MAX_EXPERIMENT_BUDGET_CENTS", env.STOCKQUANT_RESEARCH_MAX_EXPERIMENT_BUDGET_CENTS, 1000);
  const stageBudgetCents = parsePositiveInteger("STOCKQUANT_RESEARCH_STAGE_BUDGET_CENTS", env.STOCKQUANT_RESEARCH_STAGE_BUDGET_CENTS, 3000);
  const budgetWarningPercent = parsePositiveInteger("STOCKQUANT_RESEARCH_BUDGET_WARNING_PERCENT", env.STOCKQUANT_RESEARCH_BUDGET_WARNING_PERCENT, 80);
  if (maxExperimentBudgetCents > 1000) throw new Error("STOCKQUANT_RESEARCH_MAX_EXPERIMENT_BUDGET_CENTS must be at most 1000");
  if (defaultBudgetCents > maxExperimentBudgetCents) throw new Error("STOCKQUANT_RESEARCH_DEFAULT_BUDGET_CENTS must not exceed STOCKQUANT_RESEARCH_MAX_EXPERIMENT_BUDGET_CENTS");
  if (maxExperimentBudgetCents > stageBudgetCents) throw new Error("STOCKQUANT_RESEARCH_MAX_EXPERIMENT_BUDGET_CENTS must not exceed STOCKQUANT_RESEARCH_STAGE_BUDGET_CENTS");
  if (budgetWarningPercent > 100) throw new Error("STOCKQUANT_RESEARCH_BUDGET_WARNING_PERCENT must be at most 100");
  const workerConcurrency = parsePositiveInteger("STOCKQUANT_RESEARCH_WORKER_CONCURRENCY", env.STOCKQUANT_RESEARCH_WORKER_CONCURRENCY, 1);
  if (workerConcurrency !== 1) throw new Error("STOCKQUANT_RESEARCH_WORKER_CONCURRENCY must remain 1 for V3.1");

  const configured = runnerMode === "ISOLATED" && modelGatewayMode === "LIVE";
  return {
    environmentMode: "RESEARCH",
    brokerMode: "FAKE",
    liveTradingEnabled: false,
    runnerMode,
    modelGatewayMode,
    chatProvider,
    chatModel,
    chatBaseUrl,
    chatCredentialRef,
    embeddingProvider,
    embeddingModel,
    embeddingDimensions: 1024,
    embeddingBaseUrl,
    embeddingCredentialRef,
    outboundPolicy,
    outboundAllowlist,
    defaultRounds,
    maxRounds: 3,
    budgetCurrency: "USD",
    defaultBudgetCents,
    maxExperimentBudgetCents,
    stageBudgetCents,
    budgetWarningPercent,
    workerConcurrency: 1,
    prerequisiteStatus: configured ? "CONFIGURED" : "PENDING_PREREQUISITES"
  };
}
