import { timingSafeEqual } from "node:crypto";

export type GovernanceCaller = "historical-replay-worker" | "trade-execution-service" | "platform-api-service";
export type GovernanceTokens = Record<GovernanceCaller, string>;

function bearerMatches(authorization: string | undefined, expected: string): boolean {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function loadGovernanceTokens(env: NodeJS.ProcessEnv): GovernanceTokens {
  const tokens = {
    "historical-replay-worker": env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY?.trim() ?? "",
    "trade-execution-service": env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION?.trim() ?? "",
    "platform-api-service": env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API?.trim() ?? ""
  };
  if (!tokens["platform-api-service"] || tokens["platform-api-service"].length < 32) throw new Error("governance Platform API Bearer token is required and must be at least 32 characters");
  if (Object.values(tokens).some((token) => token.length < 32)) throw new Error("governance caller Bearer tokens must each be at least 32 characters");
  if (new Set(Object.values(tokens)).size !== Object.keys(tokens).length) throw new Error("governance caller Bearer tokens must be distinct");
  return tokens;
}

export function authorizeGovernanceRequest(input: { method: string; pathname: string; serviceId: string | undefined; authorization: string | undefined; tokens: GovernanceTokens }): boolean {
  const caller = input.serviceId as GovernanceCaller | undefined;
  if (caller !== "historical-replay-worker" && caller !== "trade-execution-service" && caller !== "platform-api-service") return false;
  const expected = input.tokens[caller];
  if (!expected || !bearerMatches(input.authorization, expected)) return false;
  if (input.method === "GET" && /^\/internal\/v1\/proposals\/[0-9a-f-]{36}$/iu.test(input.pathname)) return caller === "platform-api-service" || caller === "trade-execution-service";
  if (input.method === "GET" && /^\/internal\/v1\/auto-mandates\/[0-9a-f-]{36}\/runs\/[0-9a-f-]{36}$/iu.test(input.pathname)) return caller === "platform-api-service";
  if (input.method === "GET" && /^\/internal\/v1\/auto-mandates\/[0-9a-f-]{36}\/runs\/[0-9a-f-]{36}\/versions\/[1-9][0-9]*\/budget$/iu.test(input.pathname)) return caller === "platform-api-service";
  if (input.method !== "POST") return false;
  if (input.pathname === "/internal/v1/c5-local/orders/authorize") return caller === "platform-api-service";
  if (input.pathname === "/internal/v1/c5-local/orders/reservations/verify") return caller === "trade-execution-service";
  if (input.pathname === "/internal/v1/v12/strategy-snapshots") return caller === "platform-api-service";
  if (input.pathname === "/internal/v1/authorizations") return caller === "historical-replay-worker";
  if (/^\/internal\/v1\/proposals\/[0-9a-f-]{36}\/execution-authorizations(?:\/validate)?$/iu.test(input.pathname)) return caller === "trade-execution-service";
  if (/^\/internal\/v1\/auto-mandates\/[0-9a-f-]{36}\/orders\/authorize$/iu.test(input.pathname)) return caller === "trade-execution-service";
  if (/^\/internal\/v1\/auto-mandates\/reservations\/[0-9a-f-]{36}\/settle$/iu.test(input.pathname)) return caller === "trade-execution-service";
  if (input.pathname === "/internal/v1/paper-authorizations" || input.pathname === "/internal/v1/paper-authorizations/revoke" || input.pathname === "/internal/v1/candidate-mandates/readiness" || input.pathname === "/internal/v1/proposals" || input.pathname === "/internal/v1/auto-mandates" || /^\/internal\/v1\/auto-mandates\/[0-9a-f-]{36}\/(activate|pause)$/iu.test(input.pathname) || /^\/internal\/v1\/proposals\/[0-9a-f-]{36}\/(approve|reject|revise)$/iu.test(input.pathname)) return caller === "platform-api-service";
  if (input.pathname === "/internal/v1/paper-authorizations/validate" || input.pathname === "/internal/v1/authorizations/validate") return caller === "trade-execution-service";
  return false;
}
