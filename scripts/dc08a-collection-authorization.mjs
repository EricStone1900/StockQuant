import { readFileSync } from "node:fs";

const DEFAULT_SOURCE_IDS = ["sina", "baostock"];

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/u).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

export function collectionSourceConfiguration(env = process.env, localText) {
  let text = localText;
  if (text === undefined) {
    try { text = readFileSync(".env.local", "utf8"); } catch { text = ""; }
  }
  const config = { ...parseEnv(text), ...env };
  const requiredSourceIds = (config.STOCKQUANT_COLLECTION_SOURCES ?? DEFAULT_SOURCE_IDS.join(","))
    .split(",").map((sourceId) => sourceId.trim().toLowerCase()).filter(Boolean);
  const authorizedSourceIds = new Set((config.STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS ?? "")
    .split(",").map((sourceId) => sourceId.trim()).filter(Boolean));
  const missingConfiguration = [
    ...(config.STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED === "true" ? [] : ["STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED"]),
    ...(config.STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF?.trim() ? [] : ["STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF"]),
    ...(config.STOCKQUANT_COLLECTION_DATA_VERSION?.trim() ? [] : ["STOCKQUANT_COLLECTION_DATA_VERSION"]),
    ...(requiredSourceIds.length > 0 && requiredSourceIds.every((sourceId) => authorizedSourceIds.has(sourceId)) ? [] : ["STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS"]),
  ];
  return { authorized: missingConfiguration.length === 0, missingConfiguration, requiredSourceIds };
}
