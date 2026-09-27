import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/research-automation-promotions.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-research-promotion-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/v1/promotions/submit"]?.post;
if (operation?.operationId !== "submitPromotionAfterV31Acceptance" || !operation.security?.some((rule) => rule.ServiceBearer)) throw new Error("Expected the Platform-scoped Research Automation V3.2 submit operation");
const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
const responseSchema = operation.responses?.["201"]?.content?.["application/json"]?.schema;
if (!requestSchema?.$ref || !responseSchema?.$ref) throw new Error("Promotion submit operation requires typed request and response schemas");
const requestType = "Contracts.V32PromotionRequestSubmissionCommand";
const responseType = "Contracts.V32PromotionRequestSubmissionResult";
const sourceUrl = "packages/contracts/openapi/research-automation-promotions.v1.json";
const expected = `// GENERATED FILE. DO NOT EDIT. Source: ${sourceUrl}
import type * as Contracts from "./generated-types.js";

export class ResearchPromotionHttpError extends Error {
  constructor(readonly status: number, detail?: string) { super("Research Automation promotion submit returned HTTP " + status + (detail ? ": " + detail : "")); this.name = "ResearchPromotionHttpError"; }
}

export class GeneratedResearchPromotionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Research Automation base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async submitPromotionAfterV31Acceptance(body: ${requestType}, timeoutMs: number = 10000): Promise<${responseType}> {
    const response = await this.request(this.baseUrl + "/v1/promotions/submit", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ResearchPromotionHttpError(response.status, typeof value?.error === "string" ? value.error : undefined);
    return value as ${responseType};
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-research-promotion-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Research promotion OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/platform-api-service/src/contracts/generated-research-promotion-client.ts`);
