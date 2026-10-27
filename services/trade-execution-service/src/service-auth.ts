export type TradeExecutionCaller = "platform-api-service" | "historical-replay-worker";

export type TradeExecutionAuthEnvironment = {
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API?: string;
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY?: string;
};

export function loadTradeExecutionServiceTokens(env: TradeExecutionAuthEnvironment): Record<TradeExecutionCaller, string> {
  const tokens = {
    "platform-api-service": env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "",
    "historical-replay-worker": env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY ?? ""
  };
  if (Object.values(tokens).some((token) => token.length < 32)) throw new Error("trade execution caller Bearer tokens must each be at least 32 characters");
  if (tokens["platform-api-service"] === tokens["historical-replay-worker"]) throw new Error("trade execution caller Bearer tokens must be distinct");
  return tokens;
}

export function authorizeTradeExecutionRequest(input: {
  method: string;
  pathname: string;
  serviceId: string | undefined;
  authorization: string | undefined;
  tokens: Record<TradeExecutionCaller, string>;
}): boolean {
  const caller = input.serviceId as TradeExecutionCaller | undefined;
  if (caller !== "platform-api-service" && caller !== "historical-replay-worker") return false;
  if (input.authorization !== `Bearer ${input.tokens[caller]}`) return false;
  if (input.method === "POST" && input.pathname === "/internal/v1/historical-orders/execute") return caller === "historical-replay-worker";
  if (input.method === "POST" && input.pathname === "/internal/v1/v24/paper-orders/execute-snapshot") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/v24/paper-orders/probe-reservation") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/v13/paper-orders/execute-manual-proposal") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/v13/accounts/settlements") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/v13/paper-orders/execute-auto-proposal") return caller === "platform-api-service";
  if (input.method === "GET" && input.pathname === "/internal/v1/v24/paper-readiness") return caller === "platform-api-service";
  if (input.method === "GET" && input.pathname === "/internal/v1/v13/accounts/assets") return caller === "platform-api-service";
  if (input.method === "GET" && /^\/internal\/v1\/accounts\/[^/]+\/in-flight-orders$/u.test(input.pathname)) return caller === "platform-api-service";
  if (input.method === "GET" && input.pathname === "/internal/v1/orders/by-client-id") return caller === "platform-api-service";
  if (input.method === "POST" && input.pathname === "/internal/v1/fake-broker/external-orders") return caller === "platform-api-service";
  if (input.method === "GET" && /^\/internal\/v1\/historical-orders\/[^/]+$/.test(input.pathname)) return caller === "historical-replay-worker";
  if (input.method === "GET" && /^\/internal\/v1\/orders\/[^/]+$/.test(input.pathname)) return caller === "platform-api-service";
  if (input.method === "GET" && (/^\/internal\/v1\/orders\/[^/]+\/outbox$/.test(input.pathname) || /^\/internal\/v1\/reconciliation\/summary$/.test(input.pathname))) return true;
  if (input.method === "POST" && (/^\/internal\/v1\/orders\/[^/]+\/(cancel|cancel-result|expire|unknown)$/.test(input.pathname) || /^\/internal\/v1\/orders\/[^/]+\/fills\/[^/]+\/fee-corrections$/.test(input.pathname) || /^\/internal\/v1\/orders\/[^/]+\/simulated-fill-reports$/.test(input.pathname) || /^\/internal\/v1\/outbox\/[^/]+\/compensate$/.test(input.pathname))) return caller === "platform-api-service";
  return false;
}
