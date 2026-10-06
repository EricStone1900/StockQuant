import { timingSafeEqual } from "node:crypto";

export type ResearchServiceId = "platform-api-service" | "runner-host" | "quant-validation-worker";
export type ResearchServiceCredentials = Partial<Record<ResearchServiceId, string>>;
export type ResearchAuthResult = "AUTHORIZED" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_CONFIGURED";

export function identifyResearchService(authorization: string | undefined, credentials: ResearchServiceCredentials): ResearchServiceId | null {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match) return null;
  const suppliedBytes = Buffer.from(match[1]);
  let identity: ResearchServiceId | null = null;
  for (const serviceId of ["platform-api-service", "runner-host", "quant-validation-worker"] as const) {
    const expected = credentials[serviceId];
    if (!expected) continue;
    const expectedBytes = Buffer.from(expected);
    if (suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)) identity = serviceId;
  }
  return identity;
}

function isAllowedRoute(serviceId: string, method: string, url: string): serviceId is ResearchServiceId {
  if (serviceId === "platform-api-service") {
    return (method === "POST" && ["/v1/experiments", "/v1/runner/budgets/test-run/limit", "/v1/runner/jobs/validate", "/v1/runner/jobs", "/v1/artifacts/validate", "/v1/artifacts/publish", "/v1/artifacts/read"].includes(url))
      || (method === "POST" && ["/v1/promotions/prepare", "/v1/promotions/submit"].includes(url))
      || (method === "GET" && url === "/v1/model-gateway/preflight")
      || (method === "POST" && url === "/v1/model-gateway/fixture-call")
      || (method === "POST" && url === "/v1/model-gateway/fixture/openai/v1/chat/completions")
      || (method === "POST" && url === "/v1/model-gateway/fixture/openai/v1/embeddings")
      || (method === "GET" && /^\/v1\/experiments\/[^/]+$/.test(url))
      || (method === "GET" && /^\/v1\/experiments\/[^/]+\/budget$/.test(url))
      || (method === "POST" && /^\/v1\/experiments\/[^/]+\/budget\/settle$/.test(url))
      || (method === "POST" && /^\/v1\/experiments\/[^/]+\/budget\/settle-from-model-calls$/.test(url))
      || (method === "GET" && /^\/v1\/runner\/jobs\/[^/]+$/.test(url))
      || (method === "GET" && /^\/v1\/runner\/jobs\?.+$/u.test(url))
      || (method === "GET" && /^\/v1\/runner\/jobs\/cursor\?.+$/u.test(url))
      || (method === "GET" && /^\/v1\/runner\/checkpoints\?.+$/u.test(url))
      || (method === "GET" && /^\/v1\/runner\/budgets\?.+$/u.test(url))
      || (method === "GET" && /^\/v1\/runner\/budgets\/test-run\?.+$/u.test(url))
      || (method === "POST" && /^\/v1\/runner\/jobs\/[^/]+\/cancel$/.test(url))
      || (method === "POST" && /^\/v1\/experiments\/[^/]+\/cancel$/.test(url));
  }
  if (serviceId === "runner-host") {
    return (method === "POST" && (url === "/v1/runner/jobs/claim" || /^\/v1\/runner\/jobs\/[^/]+\/(?:input|heartbeat|complete|checkpoint|checkpoint\/read)$/.test(url) || url === "/v1/runner/jobs/validate" || url === "/v1/artifacts/validate" || url === "/v1/artifacts/publish"))
      || (method === "GET" && /^\/v1\/runner\/jobs\/[^/?]+$/.test(url));
  }
  if (serviceId === "quant-validation-worker") {
    return method === "GET" && /^\/v1\/promotions\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/candidate-artifact$/iu.test(url);
  }
  return false;
}

export function authorizeResearchServiceRequest(input: {
  method: string;
  url: string;
  serviceId?: string;
  authorization: string | undefined;
  credentials: ResearchServiceCredentials;
}): ResearchAuthResult {
  if (Object.keys(input.credentials).length === 0) return "NOT_CONFIGURED";
  const identity = identifyResearchService(input.authorization, input.credentials);
  if (!identity) return "UNAUTHENTICATED";
  if (input.serviceId && identity !== input.serviceId) return "FORBIDDEN";
  if (!isAllowedRoute(identity, input.method, input.url)) return "FORBIDDEN";
  return "AUTHORIZED";
}
