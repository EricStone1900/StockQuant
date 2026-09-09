import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const args = process.argv.slice(2);
const runId = args[args.indexOf("--run") + 1];
const baseUrl = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";
if (!runId) {
  console.error("usage: pnpm evidence:export -- --run RUN_ID");
  process.exit(2);
}

const response = await fetch(`${baseUrl}/api/v1/acceptance/runs/${runId}/evidence`, { headers: { "x-stockquant-user": "acceptance-owner-1" } });
if (!response.ok) {
  console.error(`evidence export failed: ${response.status}`);
  process.exit(1);
}
const evidence = await response.json();
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
const manifestHash = createHash("sha256").update(serialized).digest("hex");
const outputDirectory = join("evidence", "local", runId);
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "evidence.json"), serialized);
await writeFile(join(outputDirectory, "manifest.sha256"), `${manifestHash}  evidence.json\n`);
console.log(JSON.stringify({ outputDirectory, manifestHash }, null, 2));
