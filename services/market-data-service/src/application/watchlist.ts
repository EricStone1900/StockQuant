export type WatchlistUpdate =
  | { accepted: true; securities: string[] }
  | { accepted: false; max: 100 };

export type WatchlistPriorityInput = {
  holdings: string[];
  inFlightOrders: string[];
  candidates: string[];
};

export type WatchlistPriorityResult =
  | { accepted: true; securities: string[]; requiredCount: number; omittedCandidates: string[] }
  | { accepted: false; reason: "REQUIRED_SECURITIES_EXCEED_LIMIT"; max: 100; requiredCount: number };

/** Enforce the online pool limit after de-duplication, since capacity is unique securities. */
export function normalizeWatchlist(input: unknown): WatchlistUpdate {
  const values = Array.isArray(input) ? input.map(String) : [];
  const securities = [...new Set(values)];
  if (securities.length > 100) return { accepted: false, max: 100 };
  return { accepted: true, securities };
}

/**
 * Build a deterministic online pool. Holdings and securities with in-flight
 * orders are mandatory; candidates use only the capacity left after them.
 * Facts must be supplied by the authenticated service layer, never the browser.
 */
export function prioritizeWatchlist(input: WatchlistPriorityInput): WatchlistPriorityResult {
  const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const holdings = unique(input.holdings);
  const holdingSet = new Set(holdings);
  const inFlight = unique(input.inFlightOrders).filter((security) => !holdingSet.has(security));
  const required = [...holdings, ...inFlight];
  if (required.length > 100) {
    return { accepted: false, reason: "REQUIRED_SECURITIES_EXCEED_LIMIT", max: 100, requiredCount: required.length };
  }

  const requiredSet = new Set(required);
  const candidates = unique(input.candidates).filter((security) => !requiredSet.has(security));
  const available = 100 - required.length;
  return {
    accepted: true,
    securities: [...required, ...candidates.slice(0, available)],
    requiredCount: required.length,
    omittedCandidates: candidates.slice(available),
  };
}
