import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/quant-promotions.v1.json");
const output = resolve(root, "services/decision-governance-service/src/contracts/generated-quant-registry-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/v1/registry/versions/{versionFingerprint}"]?.get;
const caller = operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.enum;
if (operation?.operationId !== "getApprovedPromotionRegistryVersion" || JSON.stringify(caller) !== JSON.stringify(["platform-api-service", "decision-governance-service"]) || !operation.security?.some((rule) => rule.ServiceBearer)) throw new Error("Expected service-scoped approved Registry version lookup OpenAPI operation");
if (!JSON.stringify(operation.responses?.["200"]).includes("v3.2-promotion-registry-version.schema.json")) throw new Error("Registry version response must use the canonical schema");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export type QuantRegistryLookupResult = { status: number; body?: Contracts.V32PromotionRegistryVersion | Record<string, unknown> };

export class GeneratedQuantRegistryClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Decision Governance service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async getApprovedPromotionRegistryVersion(versionFingerprint: string, timeoutMs: number = 3000): Promise<QuantRegistryLookupResult> {
    if (!/^[a-f0-9]{64}$/u.test(versionFingerprint)) throw new Error("Registry version fingerprint must be a lowercase SHA-256");
    const response = await this.request(this.baseUrl + "/v1/registry/versions/" + encodeURIComponent(versionFingerprint), { headers: { "x-stockquant-service-id": "decision-governance-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json().catch(() => undefined) as Contracts.V32PromotionRegistryVersion | Record<string, unknown> | undefined;
    return { status: response.status, body };
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-quant-registry-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Quant Registry OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/decision-governance-service/src/contracts/generated-quant-registry-client.ts`);
