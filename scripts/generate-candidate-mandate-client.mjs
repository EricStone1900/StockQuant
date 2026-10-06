import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/decision-governance-candidate-mandate.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-candidate-mandate-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/candidate-mandates/readiness"]?.post;
const caller = operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const;
if (operation?.operationId !== "assessApprovedCandidateMandateBinding" || caller !== "platform-api-service" || !operation.security?.some((rule) => rule.ServiceBearer)) throw new Error("Expected Platform-scoped Governance candidate Mandate readiness operation");
if (!JSON.stringify(operation.requestBody).includes("v3.2-candidate-mandate-binding-command.schema.json") || !JSON.stringify(operation.responses?.["200"]).includes("v3.2-candidate-mandate-binding-result.schema.json")) throw new Error("Candidate Mandate readiness operation requires canonical request and response schemas");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-candidate-mandate.v1.json
import type * as Contracts from "./generated-types.js";

export type CandidateMandateReadinessResult = { status: number; body?: Contracts.V32CandidateMandateBindingResult | Record<string, unknown> };

export class GeneratedCandidateMandateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async assessApprovedCandidateMandateBinding(body: Contracts.V32CandidateMandateBindingCommand, timeoutMs: number = 5000): Promise<CandidateMandateReadinessResult> {
    const response = await this.request(this.baseUrl + "/internal/v1/candidate-mandates/readiness", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as Contracts.V32CandidateMandateBindingResult | Record<string, unknown> | undefined;
    return { status: response.status, body: value };
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-candidate-mandate-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Candidate Mandate OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/platform-api-service/src/contracts/generated-candidate-mandate-client.ts`);
