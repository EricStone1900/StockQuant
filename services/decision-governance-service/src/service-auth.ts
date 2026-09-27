export type GovernanceCaller = "historical-replay-worker" | "trade-execution-service" | "platform-api-service";
export type GovernanceTokens = Record<"historical-replay-worker" | "trade-execution-service", string> & Partial<Record<"platform-api-service", string>>;

function bearerMatches(authorization: string | undefined, expected: string): boolean {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function loadGovernanceTokens(env: NodeJS.ProcessEnv): GovernanceTokens {
  const tokens = {
    "historical-replay-worker": env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY ?? "",
    "trade-execution-service": env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "",
    "platform-api-service": env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API?.trim() || undefined
  };
  if (!tokens["historical-replay-worker"] || !tokens["trade-execution-service"] || tokens["historical-replay-worker"].length < 32 || tokens["trade-execution-service"].length < 32 || (tokens["platform-api-service"] !== undefined && tokens["platform-api-service"].length < 32)) throw new Error("governance caller Bearer tokens must each be at least 32 characters");
  if (tokens["historical-replay-worker"] === tokens["trade-execution-service"]) throw new Error("governance caller Bearer tokens must be distinct");
  if (tokens["platform-api-service"] && [tokens["historical-replay-worker"], tokens["trade-execution-service"]].includes(tokens["platform-api-service"])) throw new Error("governance caller Bearer tokens must be distinct");
  return tokens;
}

export function authorizeGovernanceRequest(input: { method: string; pathname: string; serviceId: string | undefined; authorization: string | undefined; tokens: GovernanceTokens }): boolean {
  const path = input.pathname.split("?", 1)[0];
  const caller = input.serviceId as GovernanceCaller | undefined;
  if (caller !== "historical-replay-worker" && caller !== "trade-execution-service" && caller !== "platform-api-service") return false;
  const expected = input.tokens[caller];
  if (!expected || !bearerMatches(input.authorization, expected)) return false;
  if (input.method !== "POST") return false;
  if (path === "/internal/v1/authorizations") return caller === "historical-replay-worker";
  if (path === "/internal/v1/authorizations/validate") return caller === "trade-execution-service";
  if (path === "/internal/v1/candidate-mandates/readiness") return caller === "platform-api-service";
  return false;
}
import { timingSafeEqual } from "node:crypto";
