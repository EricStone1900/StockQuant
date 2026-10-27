export type SinaQuotePreview = {
  symbol: string;
  price: number | null;
  name: string | null;
  observedAt: string | null;
  ingestedAt: string;
  status: "LIVE_SOURCE" | "MISSING_TIMESTAMP" | "MALFORMED" | "SOURCE_ERROR";
};

/** Sina quote payloads use GB18030-compatible encoding. */
export function decodeSinaQuote(bytes: ArrayBuffer): string {
  return new TextDecoder("gb18030").decode(bytes);
}

function sinaCode(symbol: string): string {
  const match = /^(\d{6})\.(SH|SZ)$/u.exec(symbol);
  if (!match) throw new Error("SINA_QUOTE_INVALID_SECURITY_ID");
  return `${match[2] === "SH" ? "sh" : "sz"}${match[1]}`;
}

export function previewSinaQuotes(symbols: string[], text: string, ingestedAt: string): SinaQuotePreview[] {
  return symbols.map((symbol) => {
    const code = sinaCode(symbol);
    const payload = text.match(new RegExp(`(?:^|\\s)hq_str_${code}="([^"]*)`, "u"))?.[1];
    const fields = payload?.split(",") ?? [];
    const name = fields[0]?.trim() || null;
    const priceValue = Number(fields[3]);
    const price = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null;
    const rawTimestamp = `${fields[30] ?? ""} ${fields[31] ?? ""}`;
    const timestampShape = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/u.exec(rawTimestamp);
    const timestampParts = timestampShape?.slice(1).map(Number);
    const timestampMs = timestampParts ? Date.UTC(timestampParts[0], timestampParts[1] - 1, timestampParts[2], timestampParts[3], timestampParts[4], timestampParts[5]) : Number.NaN;
    const roundTrip = new Date(timestampMs);
    const timestampValid = timestampParts !== undefined && timestampParts[0] >= 1000
      && roundTrip.getUTCFullYear() === timestampParts[0] && roundTrip.getUTCMonth() === timestampParts[1] - 1 && roundTrip.getUTCDate() === timestampParts[2]
      && roundTrip.getUTCHours() === timestampParts[3] && roundTrip.getUTCMinutes() === timestampParts[4] && roundTrip.getUTCSeconds() === timestampParts[5];
    const observedAt = timestampValid
      ? `${rawTimestamp.replace(" ", "T")}+08:00`
      : null;
    const status = !payload || !observedAt ? "MISSING_TIMESTAMP" : !name || price === null ? "MALFORMED" : "LIVE_SOURCE";
    return { symbol, price, name, observedAt, ingestedAt, status };
  });
}
