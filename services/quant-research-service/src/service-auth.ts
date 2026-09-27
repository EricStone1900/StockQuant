export type QuantResearchCaller = "platform-api-service" | "historical-replay-worker" | "research-automation-service" | "quant-validation-worker" | "decision-governance-service";
export type QuantResearchTokens = Record<"platform-api-service" | "historical-replay-worker", string> & Partial<Record<"research-automation-service" | "quant-validation-worker" | "decision-governance-service", string>>;

function bearerMatches(authorization: string | undefined, expected: string): boolean {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function loadQuantResearchTokens(env: NodeJS.ProcessEnv): QuantResearchTokens {
  const tokens = {
    "platform-api-service": env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "",
    "historical-replay-worker": env.STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY ?? "",
    "research-automation-service": env.STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION?.trim() || undefined,
    "quant-validation-worker": env.STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER?.trim() || undefined,
    "decision-governance-service": env.STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE?.trim() || undefined
  };
  if (tokens["platform-api-service"].length < 32 || tokens["historical-replay-worker"].length < 32 || Object.entries(tokens).some(([caller, token]) => caller !== "platform-api-service" && caller !== "historical-replay-worker" && token !== undefined && token.length < 32)) throw new Error("quant research caller Bearer tokens must each be at least 32 characters");
  if (tokens["platform-api-service"] === tokens["historical-replay-worker"]) throw new Error("quant research caller Bearer tokens must be distinct");
  if (tokens["research-automation-service"] && (tokens["research-automation-service"] === tokens["platform-api-service"] || tokens["research-automation-service"] === tokens["historical-replay-worker"])) throw new Error("quant research caller Bearer tokens must be distinct");
  if (tokens["quant-validation-worker"] && [tokens["platform-api-service"], tokens["historical-replay-worker"], tokens["research-automation-service"]].includes(tokens["quant-validation-worker"])) throw new Error("quant research caller Bearer tokens must be distinct");
  if (tokens["decision-governance-service"] && [tokens["platform-api-service"], tokens["historical-replay-worker"], tokens["research-automation-service"], tokens["quant-validation-worker"]].includes(tokens["decision-governance-service"])) throw new Error("quant research caller Bearer tokens must be distinct");
  return tokens;
}

export function authorizeQuantResearchRequest(input: { method: string; pathname: string; serviceId: string | undefined; authorization: string | undefined; tokens: QuantResearchTokens }): boolean {
  const callers: QuantResearchCaller[] = ["platform-api-service", "historical-replay-worker", "research-automation-service", "quant-validation-worker", "decision-governance-service"];
  const caller = callers.find((candidate) => {
    const expected = input.tokens[candidate];
    return expected !== undefined && bearerMatches(input.authorization, expected);
  });
  if (!caller || (input.serviceId !== undefined && input.serviceId !== caller)) return false;
  if (caller === "historical-replay-worker") return input.method === "POST" && input.pathname === "/v1/research/multi-bar";
  if (caller === "research-automation-service") return input.method === "POST" && input.pathname === "/v1/promotions";
  if (/^\/v1\/promotions\/[^/]+\/validation-input$/i.test(input.pathname)) return caller === "quant-validation-worker" && input.method === "GET";
  if (caller === "quant-validation-worker") return input.method === "POST" && /^\/v1\/promotions\/[^/]+\/validation-report$/i.test(input.pathname);
  if (/^\/v1\/promotions\/[^/]+\/decision$/i.test(input.pathname)) return caller === "platform-api-service" && input.method === "POST";
  if (input.pathname.startsWith("/v1/registry/versions/")) return (caller === "platform-api-service" || caller === "decision-governance-service") && input.method === "GET" && /^\/v1\/registry\/versions\/[a-f0-9]{64}$/i.test(input.pathname);
  if (input.pathname === "/v1/promotions" || input.pathname.startsWith("/v1/promotions/")) return caller === "platform-api-service" && input.method === "GET";
  if (input.pathname === "/v1/research/qlib/fit-fixture") return caller === "platform-api-service" && input.method === "POST";
  return caller === "platform-api-service" && input.pathname.startsWith("/v1/");
}
import { timingSafeEqual } from "node:crypto";
