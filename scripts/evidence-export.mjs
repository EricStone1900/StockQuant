import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const args = process.argv.slice(2);
const runId = args[args.indexOf("--run") + 1];
const stage = args.includes("--stage") ? args[args.indexOf("--stage") + 1] : "V1.1";
const baseUrl = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";
if (!runId) {
  console.error("usage: pnpm evidence:export -- --stage V2.1|V2.2|V2.3|V2.4|V2.5 --run RUN_ID");
  process.exit(2);
}

const v2RunRoutes = {
  "V2.1": "/api/v1/acceptance/v2/v2.1/runs",
  "V2.2": "/api/v1/acceptance/v2/v2.2/runs",
  "V2.3": "/api/v1/acceptance/v2/v2.3/runs",
  "V2.4": "/api/v1/acceptance/v2/v2.4/runs"
  ,"V2.5": "/api/v1/acceptance/v2/v2.5/runs"
};
if (stage.startsWith("V2.") && !v2RunRoutes[stage]) {
  console.error(`${stage} has no implemented evidence export endpoint`);
  process.exit(2);
}
const path = v2RunRoutes[stage]
  ? `${v2RunRoutes[stage]}/${runId}`
  : `/api/v1/acceptance/runs/${runId}/evidence`;
const response = await fetch(`${baseUrl}${path}`, { headers: { "x-stockquant-user": "acceptance-owner-1" } });
if (!response.ok) {
  console.error(`evidence export failed: ${response.status}`);
  process.exit(1);
}
const run = await response.json();
const evidence = v2RunRoutes[stage]
  ? { evidenceVersion: "acceptance-export-v2-1", stageId: stage, testRunId: runId, run }
  : run;
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
const manifestHash = createHash("sha256").update(serialized).digest("hex");
const outputDirectory = v2RunRoutes[stage]
  ? join("evidence", "local", stage, runId)
  : join("evidence", "local", runId);
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "evidence.json"), serialized);
await writeFile(join(outputDirectory, "manifest.sha256"), `${manifestHash}  evidence.json\n`);
console.log(JSON.stringify({ outputDirectory, manifestHash }, null, 2));
