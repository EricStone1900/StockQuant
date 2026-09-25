import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const path = resolve(root, "packages/contracts/openapi/portfolio-account.v1.json");
const document = JSON.parse(await readFile(path, "utf8"));
if (document.openapi !== "3.1.0") throw new Error("portfolio account OpenAPI document must use 3.1.0");
const initialize = document.paths?.["/internal/v1/accounts/initialize"]?.post;
const snapshot = document.paths?.["/internal/v1/accounts/{accountId}/snapshot"]?.get;
if (initialize?.operationId !== "initializeAccount") throw new Error("initializeAccount operation is missing");
if (snapshot?.operationId !== "getAccountSnapshot") throw new Error("getAccountSnapshot operation is missing");
const refs = JSON.stringify(document);
for (const ref of ["account-initialization-command.schema.json", "account-snapshot.schema.json"]) {
  if (!refs.includes(`https://stockquant.local/schemas/common/${ref}`)) throw new Error(`OpenAPI reference missing: ${ref}`);
}
for (const status of ["200", "403", "409"]) if (!initialize.responses?.[status]) throw new Error(`initializeAccount response ${status} is missing`);
for (const status of ["200", "403", "404"]) if (!snapshot.responses?.[status]) throw new Error(`getAccountSnapshot response ${status} is missing`);

const observationPath = resolve(root, "packages/contracts/openapi/v24-observation.v1.json");
const observationDocument = JSON.parse(await readFile(observationPath, "utf8"));
if (observationDocument.openapi !== "3.1.0") throw new Error("V2.4 observation OpenAPI document must use 3.1.0");
const revisions = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs/{testRunId}/revisions"]?.get;
if (revisions?.operationId !== "listV24ObservationRunRevisions") throw new Error("listV24ObservationRunRevisions operation is missing");
if (!JSON.stringify(revisions).includes("v24-observation-run-revision-list.schema.json")) throw new Error("V2.4 revision response schema reference is missing");
for (const status of ["200", "401", "403", "404"]) if (!revisions.responses?.[status]) throw new Error(`listV24ObservationRunRevisions response ${status} is missing`);
console.log("OpenAPI contracts checked: portfolio-account.v1 (2 operations), v24-observation.v1 (1 operation)");
