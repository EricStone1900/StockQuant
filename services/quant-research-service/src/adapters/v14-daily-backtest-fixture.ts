import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { V14CorporateAction, V14DailyBar, V14RestrictionBar } from "../domain/v14-daily-backtest.js";
import type { V14CorporateActionFixture, V14DailyBacktestFixture, V14DailyBacktestFixturePort, V14RestrictionFixture } from "../ports/v14-daily-backtest-fixture.js";

const EXPECTED_SHA256 = "88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef";
export const HISTORICAL_FEES_FIXTURE_SHA256 = "5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573";
export const RESTRICTIONS_FIXTURE_SHA256 = "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a";
const CORPORATE_ACTION_BARS_SHA256 = "826436b30245e6a9d4250274a29012b216edf474fb94b444cd70411704f9a0e6";
const CORPORATE_ACTIONS_SHA256 = "ff33b0f3eb1214a1670ead8337988db13fa60c823ba001cd2e6d841c109f342f";
export const CORPORATE_ACTION_FIXTURE_SHA256 = "914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc";

export function loadV14RestrictionFixture(root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../")) {
  const bytes = readFileSync(resolve(root, "fixtures/v1/v1.4/market_restrictions_synthetic.csv"));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== RESTRICTIONS_FIXTURE_SHA256) throw new Error(`V1.4 restrictions fixture hash mismatch: ${sha256}`);
  const lines = bytes.toString("utf8").trim().split(/\r?\n/u);
  if (lines.shift() !== "case_id,side,date,security_id,open,high,low,close,volume,trading_status,upper_limit,lower_limit") throw new Error("V1.4 restrictions fixture has an unexpected header");
  const bars: V14RestrictionBar[] = lines.map((line) => {
    const [caseId, side, date, securityId, open, high, low, close, volume, tradingStatus, upperLimit, lowerLimit, ...extra] = line.split(",");
    if (!caseId || !["BUY", "SELL"].includes(side ?? "") || !date || !securityId || !["TRADED", "SUSPENDED"].includes(tradingStatus ?? "") || extra.length) throw new Error("V1.4 restrictions fixture contains a malformed row");
    const [openCents, highCents, lowCents, closeCents, parsedVolume, upperLimitCents, lowerLimitCents] = [open, high, low, close, volume, upperLimit, lowerLimit].map((value) => Math.round(Number(value) * 100));
    if ([openCents, highCents, lowCents, closeCents, parsedVolume, upperLimitCents, lowerLimitCents].some((value) => !Number.isSafeInteger(value)) || [openCents, highCents, lowCents, closeCents, upperLimitCents, lowerLimitCents].some((value) => value <= 0) || parsedVolume! < 0 || highCents! < Math.max(openCents!, closeCents!, lowCents!) || lowCents! > Math.min(openCents!, closeCents!)) throw new Error("V1.4 restrictions fixture contains invalid OHLCV or limit values");
    return { caseId, side: side as "BUY" | "SELL", date, securityId, openCents: openCents!, highCents: highCents!, lowCents: lowCents!, closeCents: closeCents!, volume: parsedVolume!, tradingStatus: tradingStatus as "TRADED" | "SUSPENDED", upperLimitCents: upperLimitCents!, lowerLimitCents: lowerLimitCents! };
  });
  return { bars, sha256 };
}

export function loadV14DailyBacktestFixture(root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../")): V14DailyBacktestFixture {
  return loadDailyFixture(root, "backtest_daily.csv", EXPECTED_SHA256);
}

export function loadV14HistoricalFeesFixture(root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../")): V14DailyBacktestFixture {
  return loadDailyFixture(root, "backtest_historical_fees.csv", HISTORICAL_FEES_FIXTURE_SHA256);
}

export function loadV14CorporateActionFixture(root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../")): V14CorporateActionFixture {
  const barsBytes = readFileSync(resolve(root, "fixtures/v1/v1.4/corporate_action_daily.csv"));
  const actionsBytes = readFileSync(resolve(root, "fixtures/v1/v1.4/corporate_actions.csv"));
  const barsHash = createHash("sha256").update(barsBytes).digest("hex");
  const actionsHash = createHash("sha256").update(actionsBytes).digest("hex");
  if (barsHash !== CORPORATE_ACTION_BARS_SHA256 || actionsHash !== CORPORATE_ACTIONS_SHA256) throw new Error("V1.4 corporate-action Fixture file hash mismatch");
  const descriptor = [{ path: "fixtures/v1/v1.4/corporate_action_daily.csv", sha256: barsHash }, { path: "fixtures/v1/v1.4/corporate_actions.csv", sha256: actionsHash }];
  const sha256 = createHash("sha256").update(JSON.stringify(descriptor)).digest("hex");
  if (sha256 !== CORPORATE_ACTION_FIXTURE_SHA256) throw new Error("V1.4 corporate-action Fixture manifest descriptor hash mismatch");
  const bars = parseDailyBars(barsBytes, "date,security_id,close,volume");
  const lines = actionsBytes.toString("utf8").trim().split(/\r?\n/u);
  if (lines.shift() !== "action_id,kind,ex_date,numerator,denominator,amount_per_share_cents,pay_date") throw new Error("V1.4 corporate-action Fixture has an unexpected header");
  const actions: V14CorporateAction[] = lines.map((line) => {
    const [actionId, kind, exDate, numerator, denominator, amount, payDate, ...extra] = line.split(",");
    if (!actionId || !["SPLIT", "CASH_DIVIDEND"].includes(kind ?? "") || !exDate || extra.length) throw new Error("V1.4 corporate-action Fixture contains a malformed action");
    if (kind === "SPLIT") return { actionId, kind: "SPLIT", exDate, numerator: Number(numerator), denominator: Number(denominator) };
    return { actionId, kind: "CASH_DIVIDEND", exDate, amountPerShareCents: Number(amount), payDate };
  });
  return { bars, actions, sha256 };
}

function loadDailyFixture(root: string, filename: string, expectedHash: string): V14DailyBacktestFixture {
  const bytes = readFileSync(resolve(root, "fixtures/v1/v1.4", filename));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expectedHash) throw new Error(`V1.4 fixture hash mismatch: ${sha256}`);
  return { bars: parseDailyBars(bytes, "date,security_id,close,volume"), sha256 };
}

function parseDailyBars(bytes: Buffer, expectedHeader: string): V14DailyBar[] {
  const lines = bytes.toString("utf8").trim().split(/\r?\n/u);
  if (lines.shift() !== expectedHeader) throw new Error("V1.4 fixture has an unexpected header");
  return lines.map((line) => {
    const [date, securityId, close, volume, ...extra] = line.split(",");
    if (!date || !securityId || !close || !volume || extra.length) throw new Error("V1.4 fixture contains a malformed row");
    const closeCents = Math.round(Number(close) * 100);
    const parsedVolume = Number(volume);
    if (!Number.isSafeInteger(closeCents) || closeCents <= 0 || !Number.isSafeInteger(parsedVolume) || parsedVolume < 0) throw new Error("V1.4 fixture contains invalid numeric values");
    return { date, securityId, closeCents, volume: parsedVolume };
  });
}

export class V14DailyBacktestFixtureAdapter implements V14DailyBacktestFixturePort {
  constructor(private readonly root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../")) {}
  load(): V14DailyBacktestFixture { return loadV14DailyBacktestFixture(this.root); }
  loadHistoricalFees(): V14DailyBacktestFixture { return loadV14HistoricalFeesFixture(this.root); }
  loadRestrictions(): V14RestrictionFixture { return loadV14RestrictionFixture(this.root); }
  loadCorporateActions(): V14CorporateActionFixture { return loadV14CorporateActionFixture(this.root); }
}
