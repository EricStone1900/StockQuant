#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HEADER = "date,code,open,high,low,close,volume,amount";
const CODE = /^(?:sh|sz)\.\d{6}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

export function auditBaostockArchive(manifestPath) {
  const manifestRealPath = realpathSync(manifestPath);
  const archiveRoot = path.dirname(manifestRealPath);
  const manifest = JSON.parse(readFileSync(manifestRealPath, "utf8"));
  const failures = [];
  const codes = manifest?.selectedCodes;
  const completed = manifest?.completed;
  const artifacts = manifest?.artifacts;

  if (manifest?.source !== "baostock") failures.push("manifest source must be baostock");
  if (manifest?.sourceMode !== "READ_ONLY") failures.push("manifest sourceMode must be READ_ONLY");
  if (manifest?.frequency !== "d") failures.push("manifest frequency must be daily");
  if (manifest?.status !== "COMPLETED") failures.push("manifest status must be COMPLETED");
  if (!Array.isArray(codes) || !codes.length || codes.some((code) => typeof code !== "string" || !CODE.test(code))) failures.push("manifest selectedCodes must be a non-empty list of Baostock stock codes");
  if (Array.isArray(codes) && new Set(codes).size !== codes.length) failures.push("manifest selectedCodes contains duplicates");
  if (manifest?.sampleSize !== codes?.length) failures.push("manifest sampleSize does not match selectedCodes");
  if (!Array.isArray(completed) || new Set(completed).size !== codes?.length || codes?.some((code) => !completed.includes(code))) failures.push("manifest completed list does not exactly match selectedCodes");
  if (!artifacts || typeof artifacts !== "object" || Array.isArray(artifacts)) failures.push("manifest artifacts must be an object");
  if (artifacts && Array.isArray(codes)) {
    const artifactCodes = Object.keys(artifacts);
    if (artifactCodes.length !== codes.length || codes.some((code) => !Object.hasOwn(artifacts, code))) failures.push("manifest artifact keys do not exactly match selectedCodes");
  }

  let checkedFiles = 0;
  let checkedRows = 0;
  let checkedBytes = 0;
  let firstObservedDate = null;
  let lastObservedDate = null;
  for (const code of Array.isArray(codes) ? codes : []) {
    const artifact = artifacts?.[code];
    if (!artifact || typeof artifact.path !== "string" || !/^[^\\]/u.test(artifact.path) || path.isAbsolute(artifact.path)
      || artifact.path.split(/[\\/]/u).some((segment) => segment === ".." || segment === ".")) {
      failures.push(`${code}: unsafe or missing artifact path`);
      continue;
    }
    const candidate = path.resolve(archiveRoot, artifact.path);
    let realFile;
    try {
      realFile = realpathSync(candidate);
      const relative = path.relative(archiveRoot, realFile);
      if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) throw new Error("file escapes archive root");
      if (lstatSync(candidate).isSymbolicLink() || !lstatSync(realFile).isFile()) throw new Error("file is not a regular non-symlink file");
    } catch (error) {
      failures.push(`${code}: ${error instanceof Error ? error.message : "artifact cannot be read"}`);
      continue;
    }

    const bytes = readFileSync(realFile);
    checkedFiles++;
    checkedBytes += bytes.length;
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== artifact.sha256) failures.push(`${code}: SHA-256 mismatch`);
    const text = bytes.toString("utf8").replace(/^\uFEFF/u, "");
    const lines = text.split(/\r?\n/u);
    if (lines.at(-1) === "") lines.pop();
    if (lines.shift() !== HEADER) failures.push(`${code}: CSV header mismatch`);
    const rows = lines.length;
    if (rows !== artifact.rows) failures.push(`${code}: row count mismatch`);
    let priorDate = "";
    for (let index = 0; index < rows; index++) {
      const columns = lines[index].split(",");
      const date = columns[0];
      if (columns.length !== 8 || columns[1] !== code || !DATE.test(date) || (priorDate && date <= priorDate)) {
        failures.push(`${code}: invalid column count, code, date, or date ordering at data row ${index + 1}`);
        break;
      }
      if (date < manifest.startDate || date > manifest.endDate) {
        failures.push(`${code}: row date is outside the manifest range`);
        break;
      }
      priorDate = date;
    }
    if (rows) {
      const start = lines[0].split(",")[0];
      const end = lines.at(-1).split(",")[0];
      firstObservedDate = firstObservedDate === null || start < firstObservedDate ? start : firstObservedDate;
      lastObservedDate = lastObservedDate === null || end > lastObservedDate ? end : lastObservedDate;
    }
    checkedRows += rows;
  }

  if (checkedFiles !== codes?.length) failures.push("checked file count does not match selectedCodes");
  if (manifest?.rows !== checkedRows) failures.push("manifest rows does not match verified row total");

  const authorizationMetadataPresent = typeof manifest?.license === "string" && manifest.license.trim().length > 0
    && typeof manifest?.authorizationRef === "string" && manifest.authorizationRef.trim().length > 0
    && typeof manifest?.authorizedUse === "string" && manifest.authorizedUse.trim().length > 0;
  return {
    archiveIntegrity: failures.length ? "FAIL" : "PASS",
    usageAuthorizationMetadata: authorizationMetadataPresent ? "PRESENT_UNVERIFIED" : "BLOCKED_MISSING_METADATA",
    manifestSha256: createHash("sha256").update(readFileSync(manifestRealPath)).digest("hex"),
    source: manifest?.source ?? null,
    sourceMode: manifest?.sourceMode ?? null,
    frequency: manifest?.frequency ?? null,
    dateRange: { requestedStart: manifest?.startDate ?? null, requestedEnd: manifest?.endDate ?? null, observedStart: firstObservedDate, observedEnd: lastObservedDate },
    manifestUpdatedAt: manifest?.updatedAt ?? null,
    selectedSecurities: Array.isArray(codes) ? codes.length : 0,
    checkedFiles,
    checkedRows,
    checkedBytes,
    failures,
    scope: "read-only archive integrity and CSV structure check; does not authorize research use, verify source licensing, assess survivorship/PIT quality, call BaoStock, or run Qlib",
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--manifest") {
    console.error("Usage: node scripts/audit-local-baostock-archive.mjs --manifest <path>");
    process.exitCode = 2;
    return;
  }
  try {
    const result = auditBaostockArchive(args[1]);
    console.log(JSON.stringify(result, null, 2));
    if (result.archiveIntegrity !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
