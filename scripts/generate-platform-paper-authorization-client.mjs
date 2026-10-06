import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/decision-governance-paper-authorization.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-platform-paper-authorization-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/paper-authorizations"]?.post;
const caller = operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const;
if (operation?.operationId !== "authorizeV24PaperFixtureRun" || caller !== "platform-api-service" || !operation.security?.some((rule) => rule.ServiceBearer) || !JSON.stringify(operation.requestBody).includes("v24-paper-authorization-command.schema.json") || !JSON.stringify(operation.responses?.["200"]).includes("v24-paper-authorization-result.schema.json")) throw new Error("Expected Platform-scoped V2.4 Paper authorization operation with canonical schemas");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-paper-authorization.v1.json
import type * as Contracts from "./generated-types.js";

export type PlatformPaperAuthorizationResponse = { status: number; body?: Contracts.V24PaperAuthorizationResult | Record<string, unknown> };

export class GeneratedPlatformPaperAuthorizationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async authorizeV24PaperFixtureRun(body: Contracts.V24PaperAuthorizationCommand, timeoutMs: number = 5000): Promise<PlatformPaperAuthorizationResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/paper-authorizations", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as Contracts.V24PaperAuthorizationResult | Record<string, unknown> | undefined;
    return { status: response.status, body: value };
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-platform-paper-authorization-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Platform Paper authorization OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/platform-api-service/src/contracts/generated-platform-paper-authorization-client.ts`);
