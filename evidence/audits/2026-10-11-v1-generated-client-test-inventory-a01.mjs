import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const clientFiles = [
  "services/platform-api-service/src/contracts/generated-portfolio-account-client.ts",
  "services/platform-api-service/src/contracts/generated-v21-market-data-client.ts",
  "services/platform-api-service/src/contracts/generated-v24-market-observation-client.ts",
  "services/platform-api-service/src/contracts/generated-quant-v14-backtest-client.ts",
  "services/platform-api-service/src/contracts/generated-quant-qlib-client.ts",
  "services/platform-api-service/src/contracts/generated-quant-v12-preview-client.ts",
  "services/platform-api-service/src/contracts/generated-v12-strategy-snapshot-client.ts",
  "services/platform-api-service/src/contracts/generated-v13-auto-mandate-client.ts",
  "services/platform-api-service/src/contracts/generated-v13-manual-trade-client.ts",
  "services/platform-api-service/src/contracts/generated-v13-proposal-client.ts",
  "services/platform-api-service/src/contracts/generated-platform-paper-execution-client.ts",
  "services/trade-execution-service/src/contracts/generated-portfolio-account-client.ts",
  "services/trade-execution-service/src/contracts/generated-replay-governance-client.ts",
  "services/trade-execution-service/src/contracts/generated-v13-auto-mandate-client.ts",
  "services/trade-execution-service/src/contracts/generated-v13-governance-client.ts",
  "services/historical-replay-worker/src/contracts/generated-portfolio-account-client.ts",
  "services/historical-replay-worker/src/contracts/generated-trade-execution-client.ts",
  "services/historical-replay-worker/src/contracts/generated-replay-dependencies-client.ts",
  "services/quant-research-service/src/contracts/generated-qlib-worker-client.ts",
  "services/decision-governance-service/src/contracts/generated-quant-registry-client.ts",
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return files.flat();
}

const serviceFiles = (await filesUnder("services")).filter((path) => path.endsWith(".ts"));
const serviceSources = await Promise.all(serviceFiles.map(async (path) => [path, await readFile(path, "utf8")]));
const digest = (text) => createHash("sha256").update(text).digest("hex");
const results = [];

for (const clientPath of clientFiles) {
  const source = await readFile(clientPath, "utf8");
  const clientClass = source.match(/export class (Generated\w+Client)/u)?.[1];
  if (!clientClass) throw new Error(`Generated client class missing: ${clientPath}`);
  const methods = [...source.matchAll(/^\s{2}(?:async\s+)?(\w+)\s*\(/gmu)]
    .map((match) => match[1])
    .filter((name) => name !== "constructor" && name !== "call");
  const serviceRoot = clientPath.split("/").slice(0, 2).join("/");
  const production = serviceSources.filter(([path]) => path.startsWith(`${serviceRoot}/src/`)
    && !path.includes("/contracts/") && !path.includes("/tests/"));
  const tests = serviceSources.filter(([path, text]) => path.startsWith(`${serviceRoot}/tests/`)
    && text.includes(clientClass));
  const methodResults = methods.map((method) => {
    const productionCallSites = production.filter(([, text]) => text.includes(`.${method}(`)).map(([path]) => relative(".", path));
    const testCallSites = tests.filter(([, text]) => text.includes(`.${method}(`)).map(([path]) => relative(".", path));
    return { method, productionCallSites, testCallSites, hasClientScopedMethodTest: testCallSites.length > 0 };
  }).filter((result) => result.productionCallSites.length > 0);
  results.push({
    clientClass,
    clientPath,
    clientSha256: digest(source),
    productionMethods: methodResults,
  });
}

const missing = results.flatMap((client) => client.productionMethods
  .filter((method) => !method.hasClientScopedMethodTest)
  .map(({ method }) => `${client.clientClass}.${method}`));
console.log(JSON.stringify({
  schemaVersion: "stockquant.v1-generated-client-method-test-inventory.v1",
  auditId: "V1-GENERATED-CLIENT-TEST-INVENTORY-A01",
  date: "2026-10-11",
  status: missing.length === 0 ? "PASS_STATIC_REFERENCE_ONLY" : "GAPS_FOUND",
  clientsScanned: results.length,
  productionClientMethodsScanned: results.reduce((count, client) => count + client.productionMethods.length, 0),
  missingClientScopedMethodTests: missing,
  clients: results,
  limitations: [
    "This is lexical inventory, not TypeScript call-graph analysis.",
    "A method-name reference in a test only proves a direct test reference, not assertion sufficiency or runtime behavior.",
    "It does not assess server route authorization, business side effects, migrations, release/rollback, or human acceptance.",
    "Do not infer V1 product scope from V2/V3 methods sharing a generated client; A06/A23 govern operation scope.",
  ],
}, null, 2));
if (missing.length > 0) process.exitCode = 1;
