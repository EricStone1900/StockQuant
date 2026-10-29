import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname);
const document = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/v24-local-price-facts.v1.json"), "utf8"));
const operation = document.paths?.["/internal/v1/c5-local/price-facts"]?.get;
const names = ["ownerId", "accountId", "namespace", "testRunId", "targetId", "clientOrderId", "evaluatedAt"];
if (operation?.operationId !== "getV24LocalPriceFacts" || !operation.security?.some((entry) => entry.ServiceBearer) || !names.every((name) => operation.parameters?.some((parameter) => parameter.in === "query" && parameter.name === name && parameter.required)) || !JSON.stringify(operation.responses?.["200"]).includes("v24-local-price-facts-v1.schema.json")) throw new Error("invalid local price facts OpenAPI");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/v24-local-price-facts.v1.json
import type { V24LocalPriceFactsV1 } from "./generated-types.js";
export class GeneratedV24LocalPriceFactsClient {
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl) || !/^[A-Za-z0-9_-]{32,}$/u.test(token)) throw new Error("local facts client configuration invalid");
  }
  async read(query: { ownerId: string; accountId: string; namespace: string; testRunId: string; targetId: string; clientOrderId: string; evaluatedAt: string }): Promise<V24LocalPriceFactsV1 | null> {
    const response = await this.request(this.baseUrl.replace(/\\/+$/u, "") + "/internal/v1/c5-local/price-facts?" + new URLSearchParams(query), { method: "GET", headers: { "x-stockquant-service-id": "decision-governance-service", authorization: "Bearer " + this.token }, signal: AbortSignal.timeout(5000) });
    if (response.status === 404 || response.status === 409) return null;
    if (!response.ok) throw new Error("C5_LOCAL_FACTS_UNAVAILABLE");
    return await response.json() as V24LocalPriceFactsV1;
  }
}
`;
const output = resolve(root, "services/decision-governance-service/src/contracts/generated-v24-local-price-facts-client.ts");
let actual; try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) { if (process.argv.includes("--check")) throw new Error("local facts client stale"); await writeFile(output, expected); }
console.log(`C5 local price facts client ${process.argv.includes("--check") ? "checked" : "generated"}`);
