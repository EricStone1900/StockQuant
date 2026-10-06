import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const modelCredentialKeys = ["DEEPSEEK_API_KEY", "SILICONFLOW_API_KEY"];
export const modelCallAuthorizationKey = "STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED";

function parseEnvNamesAndPresence(text) {
  const values = new Map();
  const duplicates = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, key, raw] = match;
    const wrapped = raw.match(/^("|')(.*)\1$/);
    if (values.has(key)) duplicates.add(key);
    values.set(key, wrapped ? wrapped[2] : raw.trim());
  }
  return {
    missing: modelCredentialKeys.filter((key) => !values.get(key)?.trim()),
    duplicates: modelCredentialKeys.filter((key) => duplicates.has(key)),
    providerCallsAuthorized: values.get(modelCallAuthorizationKey) === "true",
    providerCallsAuthorizationValid: !values.has(modelCallAuthorizationKey) || values.get(modelCallAuthorizationKey) === "true" || values.get(modelCallAuthorizationKey) === "false",
  };
}

export async function checkModelCredentialFile(path) {
  const file = resolve(path);
  let info;
  try {
    info = await lstat(file);
  } catch {
    return { status: "BLOCKED", filePresent: false, privateMode: false, configuredReferences: [], missingReferences: [...modelCredentialKeys], duplicateReferences: [...modelCredentialKeys], providerCallsAuthorized: false, modelCalls: "NOT_RUN", liveCallsAuthorized: false };
  }
  const privateMode = info.isFile() && !info.isSymbolicLink() && (info.mode & 0o077) === 0;
  if (!privateMode) return { status: "BLOCKED", filePresent: true, privateMode: false, configuredReferences: [], missingReferences: [...modelCredentialKeys], duplicateReferences: [], providerCallsAuthorized: false, modelCalls: "NOT_RUN", liveCallsAuthorized: false };
  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch {
    return { status: "BLOCKED", filePresent: true, privateMode: true, configuredReferences: [], missingReferences: [...modelCredentialKeys], duplicateReferences: [], providerCallsAuthorized: false, modelCalls: "NOT_RUN", liveCallsAuthorized: false };
  }
  const parsed = parseEnvNamesAndPresence(contents);
  const present = modelCredentialKeys.filter((key) => !parsed.missing.includes(key));
  const status = privateMode && parsed.missing.length === 0 && parsed.duplicates.length === 0 && parsed.providerCallsAuthorizationValid ? "READY_FOR_NEXT_GATE" : "BLOCKED";
  return {
    status,
    filePresent: true,
    privateMode,
    configuredReferences: present,
    missingReferences: parsed.missing,
    duplicateReferences: parsed.duplicates,
    providerCallsAuthorized: parsed.providerCallsAuthorized,
    modelCalls: "NOT_RUN",
    liveCallsAuthorized: false,
  };
}

async function main() {
  const result = await checkModelCredentialFile(resolve(".env.local"));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "READY_FOR_NEXT_GATE" ? 0 : 2);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/v31-model-credential-preflight.mjs")) await main();
