import { createHash } from "node:crypto";

export type HistoricalContextKind = "SECURITY_UNIVERSE" | "MARKET_RULE_SET" | "CORPORATE_ACTIONS";
export type HistoricalContextVersion = {
  kind: HistoricalContextKind;
  version: string;
  content: Record<string, unknown>;
  sha256: string;
  validFrom: string;
  validTo: string;
  sourceReference: string;
  attestedBy: string;
};
export type HistoricalContextRefs = {
  securityUniverseVersion: string | null;
  marketRuleSetVersion: string | null;
  corporateActionVersion: string | null;
};
export type HistoricalContextReadiness = {
  status: "READY" | "BLOCKED";
  /** Hash, shape, date and security-scope checks only; source facts are not independently verified. */
  evidenceAssurance: "STRUCTURAL_CHECK_ONLY_OWNER_ATTESTATION";
  reasons: string[];
  resolved: Array<{ kind: HistoricalContextKind; version: string; sha256: string; validFrom: string; validTo: string }>;
  from: string | null;
  to: string | null;
  securities: string[];
};

export function canonicalHistoricalContent(content: Record<string, unknown>): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, normalize(item)]));
    return value;
  };
  return JSON.stringify(normalize(content));
}

export function historicalContentSha256(content: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalHistoricalContent(content)).digest("hex");
}

function coversSecurity(entries: unknown, security: string, from: string, to: string): boolean {
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const item = entry as Record<string, unknown>;
    return item.securityId === security && typeof item.validFrom === "string" && typeof item.validTo === "string"
      && Number.isFinite(Date.parse(item.validFrom)) && Number.isFinite(Date.parse(item.validTo))
      && Date.parse(item.validFrom) <= Date.parse(from) && Date.parse(item.validTo) >= Date.parse(to);
  });
}

export function checkHistoricalContext(input: {
  refs: HistoricalContextRefs;
  records: Partial<Record<HistoricalContextKind, HistoricalContextVersion>>;
  from: string | null;
  to: string | null;
  securities: string[];
  market: string;
}): HistoricalContextReadiness {
  const reasons: string[] = [];
  const resolved: HistoricalContextReadiness["resolved"] = [];
  const bindings: Array<[HistoricalContextKind, string | null]> = [
    ["SECURITY_UNIVERSE", input.refs.securityUniverseVersion],
    ["MARKET_RULE_SET", input.refs.marketRuleSetVersion],
    ["CORPORATE_ACTIONS", input.refs.corporateActionVersion],
  ];
  if (!input.from || !input.to) reasons.push("IMPORT_HAS_NO_BARS");
  for (const [kind, ref] of bindings) {
    if (!ref) { reasons.push(`${kind}_REFERENCE_MISSING`); continue; }
    const record = input.records[kind];
    if (!record || record.version !== ref) { reasons.push(`${kind}_VERSION_UNKNOWN`); continue; }
    if (historicalContentSha256(record.content) !== record.sha256) reasons.push(`${kind}_CONTENT_HASH_MISMATCH`);
    if (!record.sourceReference.trim() || !record.attestedBy.trim()) reasons.push(`${kind}_ATTESTATION_MISSING`);
    if (input.from && input.to && (record.validFrom > input.from || record.validTo < input.to)) reasons.push(`${kind}_VALIDITY_OUT_OF_RANGE`);
    if (kind === "SECURITY_UNIVERSE") {
      if (!input.from || !input.to || input.securities.some((security) => !coversSecurity(record.content.securities, security, input.from!, input.to!))) reasons.push("SECURITY_UNIVERSE_COVERAGE_INCOMPLETE");
    }
    if (kind === "MARKET_RULE_SET" && record.content.market !== input.market) reasons.push("MARKET_RULE_SET_MARKET_MISMATCH");
    if (kind === "MARKET_RULE_SET" && (!Array.isArray(record.content.sessions) || record.content.sessions.length === 0)) reasons.push("MARKET_RULE_SET_CONTENT_INCOMPLETE");
    if (kind === "CORPORATE_ACTIONS" && !Array.isArray(record.content.actions)) reasons.push("CORPORATE_ACTIONS_CONTENT_INCOMPLETE");
    if (kind === "CORPORATE_ACTIONS") {
      if (!input.from || !input.to || input.securities.some((security) => !coversSecurity(record.content.securities, security, input.from!, input.to!))) reasons.push("CORPORATE_ACTIONS_COVERAGE_INCOMPLETE");
    }
    resolved.push({ kind, version: record.version, sha256: record.sha256, validFrom: record.validFrom, validTo: record.validTo });
  }
  return { status: reasons.length === 0 ? "READY" : "BLOCKED", evidenceAssurance: "STRUCTURAL_CHECK_ONLY_OWNER_ATTESTATION", reasons: [...new Set(reasons)], resolved, from: input.from, to: input.to, securities: [...input.securities].sort() };
}
