export function e2eStageCommand(stage) {
  if (stage === "V2.4") return ["--filter", "@stockquant/platform-api-service", "v24:paper-http-smoke"];
  if (stage === "V1.4") return ["test:integration:v14-backtest"];
  if (stage === "V1.2") return ["exec", "node", "scripts/test-v12-e2e-isolated.mjs"];
  if (stage) return ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", stage.replaceAll(".", "\\.")];
  return ["--filter", "@stockquant/web", "test:e2e"];
}
