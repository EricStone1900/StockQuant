export type ReplayWorkerTokens = { platformApi: string; self: string };

function bearerMatches(authorization: string | undefined, expected: string): boolean {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function loadReplayWorkerTokens(env: NodeJS.ProcessEnv): ReplayWorkerTokens {
  const tokens = { platformApi: env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "", self: env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY ?? "" };
  if (tokens.platformApi.length < 32 || tokens.self.length < 32) throw new Error("replay worker platform and service Bearer tokens must each be at least 32 characters");
  if (tokens.platformApi === tokens.self) throw new Error("replay worker platform and service Bearer tokens must be distinct");
  return tokens;
}

export function isReplayWorkerPlatformRequest(input: { serviceId: string | undefined; authorization: string | undefined; tokens: ReplayWorkerTokens }): boolean {
  return input.serviceId === "platform-api-service" && bearerMatches(input.authorization, input.tokens.platformApi);
}
import { timingSafeEqual } from "node:crypto";
