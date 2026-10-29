import { timingSafeEqual } from "node:crypto";

export function loadMarketDataServiceTokens(env: { STOCKQUANT_SERVICE_TOKEN_PLATFORM_API?: string }): { "platform-api-service": string } {
  const token = env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "";
  if (token.length < 32) throw new Error("market data platform API Bearer token must be at least 32 characters");
  return { "platform-api-service": token };
}

export function isAuthorizedPlatformApi(input: {
  serviceId: string | undefined;
  authorization: string | undefined;
  tokens: { "platform-api-service": string };
}): boolean {
  if (input.serviceId !== undefined && input.serviceId !== "platform-api-service") return false;
  const expected = Buffer.from(`Bearer ${input.tokens["platform-api-service"]}`);
  const supplied = Buffer.from(input.authorization ?? "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function isProtectedPlatformApiRequest(method: string, pathname: string): boolean {
  const collectionRead = method === "GET" && (
    ["/v2/collection-scheduler/status", "/v2/collection-schedules", "/v2/minute/sources", "/v2/alerts"].includes(pathname)
    || /^\/v2\/collection-scheduler\/plan(?:\/|$)/u.test(pathname)
    || /^\/v2\/collection\/health(?:\/|$)/u.test(pathname)
    || /^\/v2\/collection-schedules\/[^/]+$/u.test(pathname)
    || /^\/v2\/collection-runs(?:\/[^/]+)?$/u.test(pathname)
    || /^\/v2\/minute\/gaps\/[^/]+$/u.test(pathname)
    || /^\/v2\/minute\/backfills(?:\/[^/]+)?$/u.test(pathname)
  );
  if (collectionRead) return true;
  return pathname === "/v2/minute/import"
    || /^\/v1\/(?:fixtures\/(?:normal|bad-future)\/preview|fixtures\/research-preview|artifacts\/)/u.test(pathname)
    || (method === "GET" && pathname === "/v2/minute/preview")
    || (method === "POST" && ["/v2/minute/quality", "/v2/minute/coverage"].includes(pathname))
    || /^\/v2\/minute\/(?:csv|parquet)\/(?:preview|import|uploads(?:\/|$))/u.test(pathname)
    || /^\/v2\/minute\/imports\/[^/]+(?:\/bars)?$/u.test(pathname)
    || (method === "POST" && pathname === "/v2/historical-context/versions")
    || (method === "GET" && /^\/v2\/minute\/imports\/[^/]+\/replay-readiness$/u.test(pathname))
    || pathname === "/v2/watchlist"
    || pathname === "/v2/watchlist/scoped"
    || (method === "POST" && /^\/v2\/alerts\/[0-9a-f-]+\/acknowledge$/iu.test(pathname))
    || (method === "POST" && pathname === "/v2/alerts/paper-reconciliation")
    || ["/v2/sources", "/v2/sampling", "/v2/news/preview", "/v2/news/fixture/history"].includes(pathname)
    || (method === "POST" && pathname === "/v2/news/fixture/ingest")
    || (method === "POST" && pathname === "/v2/sampling/tasks/tick")
    || (method === "PUT" && pathname === "/v2/sampling/schedules")
    || (method === "POST" && pathname === "/v2/sampling/c5-local/plan")
    || (method === "GET" && pathname === "/v2/sampling/c5-local/selection")
    || (method === "POST" && pathname === "/v2/sampling/tasks/tick-fixture")
    || (method === "GET" && pathname === "/v2/sampling/tasks/latest")
    || (method === "POST" && pathname === "/v2/daily-bars/fixture/complete")
    || (method === "POST" && pathname === "/v2/daily-bars/real/complete")
    || (method === "GET" && pathname === "/v2/daily-bars/completions/latest")
    || (method === "GET" && pathname === "/v2/daily-bars/completions/sessions")
    || (method === "PUT" && pathname === "/v2/daily-bars/schedules")
    || (method === "GET" && ["/v2/quote/preview", "/v2/news/live", "/v2/sources/smoke"].includes(pathname))
    || (method === "PUT" && ["/v2/sampling", "/v2/watchlist"].includes(pathname))
    || (method === "PUT" && pathname === "/v2/sampling/monitor-policy")
    || (method === "POST" && /^\/v2\/sources\/[^/]+\/(?:fail|recover)$/u.test(pathname));
}
