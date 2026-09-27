import { readFileSync } from "node:fs";

export function platformMarketDataHeaders({ env = process.env, file = ".env.local", extra = {} } = {}) {
  let configuredFile = "";
  try { configuredFile = readFileSync(file, "utf8"); } catch { /* environment-only invocations are supported */ }
  const token = env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API?.trim()
    || configuredFile.match(/^STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=(.+)$/m)?.[1]?.trim()
    || "";
  if (token.length < 32) throw new Error("STOCKQUANT_SERVICE_TOKEN_PLATFORM_API must be configured with at least 32 characters");
  return { ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` };
}
