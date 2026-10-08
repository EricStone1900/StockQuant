export function e2eStageCommand(stage) {
  if (stage === "V2.4") return ["--filter", "@stockquant/platform-api-service", "v24:paper-http-smoke"];
  if (stage === "V1.4") return ["test:integration:v14-backtest"];
  if (stage === "V1.2") return ["exec", "node", "scripts/test-v12-e2e-isolated.mjs"];
  if (stage === "V1.3") return ["exec", "node", "scripts/test-v13-web-e2e-isolated.mjs"];
  if (stage === "V1.5") return ["exec", "node", "scripts/test-v15-web-e2e-isolated.mjs"];
  if (stage === "V1.1") return ["test:integration:v11-stage-storage"];
  if (stage) return ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", stage.replaceAll(".", "\\.")];
  return ["--filter", "@stockquant/web", "test:e2e"];
}
