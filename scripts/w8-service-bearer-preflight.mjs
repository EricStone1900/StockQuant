import { randomBytes } from "node:crypto";
import { chmod, lstat, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const requiredServiceTokens = [
  "STOCKQUANT_SERVICE_TOKEN_PLATFORM_API",
  "STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION",
  "STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY",
  "STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE",
  "STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION",
  "STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER",
  "STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE",
  "STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST",
];

export function parseEnvAssignments(contents) {
  const entries = new Map();
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    const values = entries.get(match[1]) ?? [];
    values.push(value);
    entries.set(match[1], values);
  }
  return entries;
}

function inspectAssignments(entries) {
  const values = new Map();
  const invalid = [];
  const missing = [];
  for (const name of requiredServiceTokens) {
    const assignments = entries.get(name) ?? [];
    if (assignments.length > 1) {
      invalid.push(name);
      continue;
    }
    const value = assignments[0] ?? "";
    if (!value) {
      missing.push(name);
      continue;
    }
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(value)) {
      invalid.push(name);
      continue;
    }
    values.set(name, value);
  }
  const counts = new Map();
  for (const value of values.values()) counts.set(value, (counts.get(value) ?? 0) + 1);
  const duplicates = requiredServiceTokens.filter((name) => values.has(name) && counts.get(values.get(name)) > 1);
  return { values, missing, invalid, duplicates };
}

export async function runServiceBearerPreflight(envFile, { prepare = false } = {}) {
  const path = resolve(envFile);
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(".env.local must be a regular file, not a symlink");
  if ((metadata.mode & 0o077) !== 0) throw new Error(".env.local permissions must be 0600 or stricter");
  const original = await readFile(path, "utf8");
  const entries = parseEnvAssignments(original);
  let result = inspectAssignments(entries);

  if (prepare && (result.invalid.length || result.duplicates.length)) throw new Error("refusing to prepare tokens while existing service credentials are invalid or duplicated");
  if (prepare && result.missing.length) {
    const additions = [];
    const existing = new Set(result.values.values());
    for (const name of result.missing) {
      let value;
      do { value = randomBytes(48).toString("base64url"); } while (existing.has(value));
      existing.add(value);
      additions.push(`${name}=${value}`);
    }
    const updated = `${original.replace(/\s*$/u, "")}\n\n# W8 prepared independent service Bearer tokens (not yet applied to active services)\n${additions.join("\n")}\n`;
    const temporary = resolve(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
    await writeFile(temporary, updated, { mode: 0o600, flag: "wx" });
    await chmod(temporary, 0o600);
    await rename(temporary, path);
    result = inspectAssignments(parseEnvAssignments(updated));
  }

  return {
    status: result.invalid.length || result.duplicates.length ? "FAIL" : result.missing.length ? "INCOMPLETE" : "PASS",
    fileMode: (metadata.mode & 0o777).toString(8),
    prepared: prepare,
    identities: requiredServiceTokens.map((name) => ({ name, status: result.invalid.includes(name) || result.duplicates.includes(name) ? "INVALID" : result.values.has(name) ? "CONFIGURED" : "UNSET" })),
    duplicateIdentities: result.duplicates,
    invalidIdentities: result.invalid,
    secretsPrinted: false,
    appliedToActiveServices: false,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const prepare = process.argv.includes("--prepare");
  const envFile = resolve(process.cwd(), ".env.local");
  try {
    const result = await runServiceBearerPreflight(envFile, { prepare });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "service Bearer preflight failed");
    process.exitCode = 1;
  }
}
