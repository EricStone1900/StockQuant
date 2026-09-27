export const MARKET_DATA_SMOKE_PLATFORM_TOKEN = "stockquant-market-data-isolated-http-smoke-token-20260927";
export const marketDataSmokeAuthEnv = { STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: MARKET_DATA_SMOKE_PLATFORM_TOKEN };
export const marketDataSmokeAuthHeaders = {
  "x-stockquant-service-id": "platform-api-service",
  authorization: `Bearer ${MARKET_DATA_SMOKE_PLATFORM_TOKEN}`,
};
