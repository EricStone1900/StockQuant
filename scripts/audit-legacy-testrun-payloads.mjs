import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditTestRunEvidence } from "./version-gate-test-run-evidence.mjs";
import { parseAcceptanceStageRows } from "./version-gate-acceptance.mjs";

const VERSION_DIRECTORIES = { V1: "v1-local-simulation", V2: "v2-data-and-replay" };

async function readVersionGateRows(root, version) {
  const directory = VERSION_DIRECTORIES[version];
  if (!directory) throw new Error(`unsupported version: ${version}`);
  const plan = await readFile(resolve(root, "docs/prd", directory, "00-version-plan.md"), "utf8");
  const stages = [...plan.matchAll(/^\| \[(V\d+\.\d+)\][^|]*\|[^|]*\|[^|]*\| ([^|]+) \|$/gm)]
    .map((match) => ({ stageId: match[1], status: match[2].trim() }));
  if (stages.length === 0) throw new Error(`no stage rows found for ${version}`);
  return { directory, stages };
}

async function jsonFiles(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  const result = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) result.push(path);
  }
  return result;
}

function payloadIdentities(payload) {
  const candidates = [payload, payload?.run];
  return candidates.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({ stageId: item.stageId, testRunId: item.testRunId }));
}

export async function auditLegacyTestRunPayloads(repositoryRoot, versions = ["V1", "V2"]) {
  const root = resolve(repositoryRoot);
  const unresolved = [];
  for (const version of versions) {
    const rows = await readVersionGateRows(root, version);
    const acceptancePath = resolve(root, "docs/prd", rows.directory, "99-acceptance.md");
    const acceptanceRows = parseAcceptanceStageRows(await readFile(acceptancePath, "utf8"));
    const evidence = await auditTestRunEvidence(root, acceptanceRows, rows.stages);
    unresolved.push(...evidence.unresolvedAssociations
      .filter((item) => item.status === "INCOMPLETE" && item.testRunId)
      .map(({ stageId, testRunId }) => ({ version, stageId, testRunId })));
  }

  const files = await jsonFiles(resolve(root, "evidence/local"));
  const payloads = [];
  for (const path of files) {
    let parsed;
    try { parsed = JSON.parse(await readFile(path, "utf8")); }
    catch { continue; }
    for (const identity of payloadIdentities(parsed)) {
      if (typeof identity.testRunId !== "string" || typeof identity.stageId !== "string") continue;
      payloads.push({ ...identity, path: relative(root, path) });
    }
  }

  const matches = unresolved.map((missing) => ({
    ...missing,
    payloadPaths: payloads.filter((candidate) => candidate.testRunId === missing.testRunId && candidate.stageId === missing.stageId)
      .map((candidate) => candidate.path),
  }));
  return {
    schemaVersion: "stockquant.w9-legacy-testrun-payload-audit.v1",
    versions,
    evidenceJsonFilesScanned: files.length,
    unresolvedAssociations: unresolved.length,
    exactPayloadMatches: matches.filter((item) => item.payloadPaths.length > 0).length,
    matches,
    scope: "Read-only identity scan of evidence/local JSON exports for exact stageId and TestRun UUID. A match is a recovery lead, not proof of validity; normal bundle, manifest, assertion, and human-signoff gates still apply.",
  };
}

async function main() {
  const root = resolve(".");
  const result = await auditLegacyTestRunPayloads(root);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
