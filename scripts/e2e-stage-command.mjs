export function e2eStageCommand(stage) {
  if (stage === "V2.4") return ["--filter", "@stockquant/platform-api-service", "v24:waiting-http-smoke"];
  if (stage) return ["--filter", "@stockquant/web", "exec", "playwright", "test", "-g", stage.replaceAll(".", "\\.")];
  return ["--filter", "@stockquant/web", "test:e2e"];
}
