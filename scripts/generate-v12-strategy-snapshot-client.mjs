import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const document = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json"), "utf8"));
const operation = document.paths?.["/internal/v1/v12/strategy-snapshots"]?.post;
if (operation?.operationId !== "receiveV12StrategySnapshot" || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation.requestBody).includes("v12-strategy-snapshot-command.schema.json") || !operation.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("V1.2 strategy snapshot OpenAPI contract is incomplete");

const output = resolve(root, "services/platform-api-service/src/contracts/generated-v12-strategy-snapshot-client.ts");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json
import type * as Contracts from "./generated-types.js";

export type V12StrategySnapshotResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedPlatformV12StrategySnapshotClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  async receiveStrategySnapshot(command: Contracts.V12StrategySnapshotCommand, timeoutMs = 5000): Promise<V12StrategySnapshotResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/v12/strategy-snapshots", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("Platform generated V1.2 strategy snapshot client is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V1.2 strategy snapshot OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}`);
