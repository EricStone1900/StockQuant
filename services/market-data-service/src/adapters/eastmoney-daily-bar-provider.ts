import type { DailyBarFixtureRow } from "../application/v21-daily-bar-completion.js";
import type { DailyBarSourceRequest } from "../application/daily-bar-completion-queue.js";
import { setTimeout as delay } from "node:timers/promises";

/** Independent RAW daily candles; volume is returned in lots of 100 shares. */
export function parseEastmoneyDailyBar(payload: unknown, securityId: string, sessionDate: string): DailyBarFixtureRow {
  const data = (payload as { data?: { code?: string; klines?: unknown[] } } | null)?.data;
  if (data?.code !== securityId.slice(0, 6) || !Array.isArray(data.klines) || data.klines.length !== 1 || typeof data.klines[0] !== "string") throw new Error("DAILY_BAR_SOURCE_COVERAGE_MISMATCH");
  const [date, open, close, high, low, lots, amount] = data.klines[0].split(",");
  if (date !== sessionDate || !open || !close || !high || !low || !lots || !amount || !/^\d+$/u.test(lots)) throw new Error("DAILY_BAR_SOURCE_FIELDS_INVALID");
  const volume = Number(lots) * 100;
  if (!Number.isSafeInteger(volume)) throw new Error("DAILY_BAR_VOLUME_INVALID");
  return { securityId, sessionDate, open, high, low, close, volume, amount };
}

export class EastmoneyDailyBarProvider {
  constructor(private readonly request: typeof fetch = fetch) {}
  async loadDailyBars(request: DailyBarSourceRequest): Promise<DailyBarFixtureRow[]> {
    if (request.sourceId !== "eastmoney-daily" || !/^\d{4}-\d{2}-\d{2}$/u.test(request.sessionDate) || !request.securityIds.length || request.securityIds.length > 100) throw new Error("INVALID_DAILY_BAR_SOURCE_REQUEST");
    const rows: DailyBarFixtureRow[] = [];
    for (const securityId of request.securityIds) {
      if (rows.length) await delay(250);
      if (!/^\d{6}\.(SH|SZ)$/u.test(securityId)) throw new Error("INVALID_DAILY_BAR_SECURITY_ID");
      const date = request.sessionDate.replaceAll("-", "");
      const query = new URLSearchParams({ secid: `${securityId.endsWith(".SH") ? 1 : 0}.${securityId.slice(0, 6)}`, klt: "101", fqt: "0", beg: date, end: date, fields1: "f1,f2,f3,f4,f5,f6", fields2: "f51,f52,f53,f54,f55,f56,f57" });
      const response = await this.request(`https://push2his.eastmoney.com/api/qt/stock/kline/get?${query}`, { redirect: "error", signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } });
      if (!response.ok) throw new Error(`DAILY_BAR_HTTP_${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("DAILY_BAR_EMPTY_RESPONSE");
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 100_000) throw new Error("DAILY_BAR_RESPONSE_TOO_LARGE");
          chunks.push(chunk.value);
        }
      } finally { await reader.cancel(); }
      rows.push(parseEastmoneyDailyBar(JSON.parse(Buffer.concat(chunks).toString("utf8")), securityId, request.sessionDate));
    }
    return rows;
  }
}
