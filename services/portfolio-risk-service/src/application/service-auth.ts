import { timingSafeEqual } from "node:crypto";

export type PortfolioCaller = "platform-api-service" | "trade-execution-service" | "historical-replay-worker" | "test-harness";
export type PortfolioCredentials = Partial<Record<PortfolioCaller, string>>;
export type PortfolioAuthResult = "AUTHORIZED" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_CONFIGURED";

export function arePortfolioServiceCredentialsValid(credentials: PortfolioCredentials): boolean {
  const required = [credentials["platform-api-service"], credentials["trade-execution-service"], credentials["historical-replay-worker"]];
  return required.every((credential) => typeof credential === "string" && credential.length >= 32)
    && new Set(required).size === required.length;
}

const ACCOUNT_ID = "[^/]+";

function isAllowedRoute(caller: string, method: string, path: string): caller is PortfolioCaller {
  if (caller === "platform-api-service") return (method === "POST" && path === "/internal/v1/accounts/initialize") || (method === "GET" && new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/(?:snapshot|sellable)$`, "u").test(path));
  if (caller === "trade-execution-service") return method === "POST" && [
    new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/fills$`, "u"),
    new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/fills/[^/]+/fee-corrections$`, "u"),
    new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/reservations$`, "u"),
    new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/settlements$`, "u"),
    new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/reservations/${ACCOUNT_ID}/resolve$`, "u")
  ].some((route) => route.test(path)) || (caller === "trade-execution-service" && method === "GET" && new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/snapshot$`, "u").test(path));
  if (caller === "historical-replay-worker") return (method === "POST" && path === "/internal/v1/accounts/initialize") || (method === "GET" && new RegExp(`^/internal/v1/accounts/${ACCOUNT_ID}/snapshot$`, "u").test(path));
  if (caller === "test-harness") return method === "POST" && path === "/internal/v1/faults/fill";
  return false;
}

/** Service ID is only a route selector; identity is proven by its independent bearer secret. */
export function authorizePortfolioRequest(input: {
  callerId: string | undefined;
  authorization: string | undefined;
  method: string;
  path: string;
  credentials: PortfolioCredentials;
}): PortfolioAuthResult {
  if (!input.callerId || !isAllowedRoute(input.callerId, input.method, input.path)) return "FORBIDDEN";
  if (!arePortfolioServiceCredentialsValid(input.credentials)) return "NOT_CONFIGURED";
  const expected = input.credentials[input.callerId];
  if (!expected) return "NOT_CONFIGURED";
  const bearer = /^Bearer ([A-Za-z0-9_-]{32,})$/u.exec(input.authorization ?? "");
  if (!bearer) return "UNAUTHENTICATED";
  const supplied = Buffer.from(bearer[1]);
  const configured = Buffer.from(expected);
  if (supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) return "UNAUTHENTICATED";
  return "AUTHORIZED";
}

export function loadPortfolioCredentials(env: NodeJS.ProcessEnv): PortfolioCredentials {
  return {
    "platform-api-service": env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API,
    "trade-execution-service": env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION,
    "historical-replay-worker": env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY,
    ...(env.NODE_ENV === "test" ? { "test-harness": env.STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS } : {}),
  };
}
