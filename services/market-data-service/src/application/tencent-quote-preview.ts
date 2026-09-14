export type TencentQuotePreview = {
  symbol: string;
  price: number;
  name: string | null;
  observedAt: string | null;
  ingestedAt: string;
  status: "LIVE_SOURCE" | "MISSING_TIMESTAMP" | "MALFORMED";
};

export function decodeTencentQuote(bytes: ArrayBuffer): string {
  // Tencent's quote endpoint is GB18030 encoded. Decoding it as UTF-8 corrupts
  // Chinese security names and makes the evidence unusable.
  return new TextDecoder("gb18030").decode(bytes);
}

export function previewTencentQuotes(symbols: string[], text: string, ingestedAt: string): TencentQuotePreview[] {
  return symbols.map((symbol) => {
    const code = `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`;
    const match = text.match(new RegExp(`v_${code}="([^\"]*)`));
    const fields = match?.[1]?.split("~") ?? [];
    const rawTimestamp = fields[30] ?? "";
    const timestampMatch = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(rawTimestamp);
    const observedAt = timestampMatch ? `${timestampMatch[1]}-${timestampMatch[2]}-${timestampMatch[3]}T${timestampMatch[4]}:${timestampMatch[5]}:${timestampMatch[6]}+08:00` : null;
    const name = fields[1] || null;
    const price = Number(fields[3] ?? 0);
    const status = !match || !observedAt ? "MISSING_TIMESTAMP" : !name || name.includes("\ufffd") || !Number.isFinite(price) || price <= 0 ? "MALFORMED" : "LIVE_SOURCE";
    return { symbol, price, name, observedAt, ingestedAt, status };
  });
}
