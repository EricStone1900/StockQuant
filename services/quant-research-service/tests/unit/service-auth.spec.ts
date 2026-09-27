import { describe, expect, it } from "vitest";
import { authorizeQuantResearchRequest, loadQuantResearchTokens } from "../../src/service-auth.js";

const tokens = loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) });
const researchTokens = loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: "a".repeat(40) });
const validationTokens = loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: "a".repeat(40), STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER: "v".repeat(40) });
const governanceTokens = loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE: "g".repeat(40) });
const allowed = (method: string, path: string, caller: string, token: string) => authorizeQuantResearchRequest({ method, pathname: path, serviceId: caller, authorization: `Bearer ${token}`, tokens });

describe("quant research service identity and route scopes", () => {
  it("requires distinct strong caller tokens", () => {
    expect(() => loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "short", STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40) })).toThrow();
    expect(() => loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "x".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "x".repeat(40) })).toThrow("must be distinct");
  });
  it("limits replay identity to deterministic replay research", () => {
    expect(allowed("POST", "/v1/research/multi-bar", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(true);
    expect(allowed("GET", "/v1/qlib/probe", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
    expect(allowed("POST", "/v1/research/candidates", "historical-replay-worker", tokens["historical-replay-worker"])).toBe(false);
  });
  it("derives identity from Bearer and treats the service header only as a consistency check", () => {
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/qlib/probe", serviceId: undefined, authorization: `Bearer ${tokens["platform-api-service"]}`, tokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/research/multi-bar", serviceId: undefined, authorization: `Bearer ${tokens["historical-replay-worker"]}`, tokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/qlib/probe", serviceId: "historical-replay-worker", authorization: `Bearer ${tokens["platform-api-service"]}`, tokens })).toBe(false);
  });
  it("rejects missing, forged and wrong credentials", () => {
    expect(allowed("GET", "/v1/qlib/probe", "platform-api-service", tokens["historical-replay-worker"])).toBe(false);
    expect(allowed("GET", "/v1/qlib/probe", "platform-api-service", "q".repeat(40))).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/qlib/probe", serviceId: "platform-api-service", authorization: "Bearer short", tokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/qlib/probe", serviceId: "platform-api-service", authorization: undefined, tokens })).toBe(false);
    expect(allowed("GET", "/v1/qlib/probe", "forged", tokens["platform-api-service"])).toBe(false);
  });
  it("gives research automation its own submission-only credential", () => {
    expect(allowed("POST", "/v1/promotions", "research-automation-service", "a".repeat(40))).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions", serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/abc", serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/abc/detail", serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/abc/detail", serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: researchTokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/research/candidates", serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions", serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(() => loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: "r".repeat(40) })).toThrow("must be distinct");
  });
  it("gives the validation worker immutable request-read and report-write routes only", () => {
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-input", serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-input", serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/detail", serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-report", serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-report", serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-report", serviceId: "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/validation-report", serviceId: "quant-validation-worker", authorization: `Bearer ${"a".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(() => loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER: "r".repeat(40) })).toThrow("must be distinct");
  });
  it("allows only Platform API to record owner-authorized exact-version decisions", () => {
    const path = "/v1/promotions/9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2/decision";
    expect(allowed("POST", path, "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(allowed("GET", path, "platform-api-service", tokens["platform-api-service"])).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: path, serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: path, serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(false);
  });
  it("allows only Platform API to read an exact approved Registry version", () => {
    const path = `/v1/registry/versions/${"b".repeat(64)}`;
    expect(allowed("GET", path, "platform-api-service", tokens["platform-api-service"])).toBe(true);
    expect(allowed("POST", path, "platform-api-service", tokens["platform-api-service"])).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: path, serviceId: "research-automation-service", authorization: `Bearer ${"a".repeat(40)}`, tokens: researchTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: path, serviceId: "quant-validation-worker", authorization: `Bearer ${"v".repeat(40)}`, tokens: validationTokens })).toBe(false);
    expect(allowed("GET", "/v1/registry/versions/not-a-fingerprint", "platform-api-service", tokens["platform-api-service"])).toBe(false);
  });
  it("allows Governance only exact Registry reads with its independent token", () => {
    const path = `/v1/registry/versions/${"b".repeat(64)}`;
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: path, serviceId: "decision-governance-service", authorization: `Bearer ${"g".repeat(40)}`, tokens: governanceTokens })).toBe(true);
    expect(authorizeQuantResearchRequest({ method: "POST", pathname: path, serviceId: "decision-governance-service", authorization: `Bearer ${"g".repeat(40)}`, tokens: governanceTokens })).toBe(false);
    expect(authorizeQuantResearchRequest({ method: "GET", pathname: "/v1/promotions/abc/detail", serviceId: "decision-governance-service", authorization: `Bearer ${"g".repeat(40)}`, tokens: governanceTokens })).toBe(false);
    expect(() => loadQuantResearchTokens({ STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: "r".repeat(40), STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE: "p".repeat(40) })).toThrow("must be distinct");
  });
});
