import type { ObservationRecord } from "../adapters/postgres-v24-observation-repository.js";
import { PostgresV24ObservationRepository, type ObservationDayQuality } from "../adapters/postgres-v24-observation-repository.js";
import { V24_MAX_QUOTE_AGE_SECONDS } from "./v24-observation-quality.js";
import type { SchedulerTickHandler } from "./v24-scheduler.js";
import type { CnAShareCalendarSession } from "../contracts/generated-types.js";

type Calendar = Partial<CnAShareCalendarSession>;

export function shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality }: { actualTradingDay: boolean; kind: string; reconciliationStatus: ObservationRecord["reconciliationStatus"]; errors: string[]; quality?: ObservationDayQuality }): boolean {
  const qualityPass = quality !== undefined
    && quality.samplingEvents === 10 && quality.uniqueSamplingWindows === 10 && quality.missingSamplingWindows.length === 0
    && quality.uniqueExecutionWindows === 1 && quality.invalidSamplingEvents === 0 && quality.invalidExecutionEvents === 0
    && quality.invalidSecuritySamples === 0 && quality.expectedSecuritySamples > 0
    && quality.validSecuritySamples === quality.expectedSecuritySamples && quality.errors.length === 0;
  return actualTradingDay && kind === "END_OF_DAY" && reconciliationStatus === "PASS" && errors.length === 0 && qualityPass;
}

export class V24LiveObservationHandler implements SchedulerTickHandler {
  constructor(private readonly repository: PostgresV24ObservationRepository, private readonly marketUrl: string, private readonly executionUrl = "http://127.0.0.1:3005", private readonly executionToken = "") {}

  async handleTick({ now, previousSampleAt, kind, scheduledFor }: Parameters<SchedulerTickHandler["handleTick"]>[0]): Promise<void> {
    const observationDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
    const errors: string[] = [];
    const recoveryActions: string[] = [];
    const calendar = await this.calendar(observationDate, errors);
    const actualTradingDay = calendar.status === "TRADING";
    const testRunId = actualTradingDay ? await this.repository.ensureDailyTestRun(observationDate) : null;
    let sourceAvailable: boolean | null = null;
    let lastSnapshotAt: string | null = null;
    let dataAgeSeconds: number | null = null;
    let outageStatus: ObservationRecord["outageStatus"] = "UNKNOWN";
    let quote: unknown = null;

    if (actualTradingDay && (kind === "SAMPLING_SLOT" || kind === "EXECUTION_WINDOW" || kind === "RECOVERY_CHECK")) {
      try {
        const response = await fetch(`${this.marketUrl}/v2/quote/preview`, { signal: AbortSignal.timeout(8_000) });
        quote = await response.json();
        const probe = typeof quote === "object" && quote !== null ? quote as { requestedSymbols?: unknown; securities?: unknown } : null;
        const requested = Array.isArray(probe?.requestedSymbols) ? probe.requestedSymbols.filter((item): item is string => typeof item === "string") : [];
        const securities = Array.isArray(probe?.securities) ? probe.securities.filter((item): item is { symbol: string; observedAt?: string | null; status?: string } => typeof item === "object" && item !== null && typeof (item as { symbol?: unknown }).symbol === "string") : [];
        const ages = securities.map((item) => typeof item.observedAt === "string" && !Number.isNaN(Date.parse(item.observedAt)) ? Math.floor((now.getTime() - Date.parse(item.observedAt)) / 1000) : null);
        const observed = securities.map((item) => item.observedAt).filter((value): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value))).sort().at(-1) ?? null;
        const expected = new Set(requested);
        const covered = securities.length === expected.size && new Set(securities.map((item) => item.symbol)).size === expected.size && requested.length === expected.size && requested.every((symbol) => {
          const item = securities.find((candidate) => candidate.symbol === symbol);
          const age = item?.observedAt ? (now.getTime() - Date.parse(item.observedAt)) / 1000 : Number.NaN;
          return item?.status === "LIVE_SOURCE" && Number.isFinite(age) && age >= 0 && age <= V24_MAX_QUOTE_AGE_SECONDS;
        });
        sourceAvailable = response.ok && requested.length > 0 && covered;
        lastSnapshotAt = observed;
        dataAgeSeconds = ages.length > 0 && ages.every((age): age is number => age !== null) ? Math.max(...ages) : null;
        outageStatus = sourceAvailable ? "NONE" : ages.some((age) => age !== null && (age < 0 || age > V24_MAX_QUOTE_AGE_SECONDS)) ? "STALE" : "DISCONNECTED";
      } catch (error) { errors.push(error instanceof Error ? error.message : "quote probe failed"); outageStatus = "DISCONNECTED"; }
    }

    const intervalSeconds = previousSampleAt ? (now.getTime() - new Date(previousSampleAt).getTime()) / 1000 : null;
    const previousDate = previousSampleAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(previousSampleAt)) : null;
    const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    const sameDayGap = previousDate === observationDate && intervalSeconds !== null && intervalSeconds > 31 * 60;
    const startupAfterFirstSlot = previousDate !== observationDate && localTime >= "09:35" && localTime < "15:00";
    const scheduledDelaySeconds = scheduledFor ? (now.getTime() - new Date(scheduledFor).getTime()) / 1000 : null;
    const samplingEvery30Minutes = kind === "SAMPLING_SLOT" ? scheduledDelaySeconds !== null && Math.abs(scheduledDelaySeconds) <= 60 : sameDayGap ? false : null;
    if (kind === "RECOVERY_CHECK" && actualTradingDay && (sameDayGap || startupAfterFirstSlot)) recoveryActions.push("RECOVERY_GAP_RECORDED_NO_BACKFILL");
    const enteredExecutionWindow = kind === "EXECUTION_WINDOW";
    const staleOrUnavailable = sourceAvailable === false || outageStatus === "STALE" || outageStatus === "DISCONNECTED";
    const signalStatus: ObservationRecord["signalStatus"] = !actualTradingDay ? "UNKNOWN" : kind === "EXECUTION_WINDOW" ? (staleOrUnavailable ? "UNKNOWN" : "HOLD") : "UNKNOWN";
    const simulatedOrderStatus: ObservationRecord["simulatedOrderStatus"] = signalStatus === "HOLD" ? "NONE" : "UNKNOWN";
    const fillStatus: ObservationRecord["fillStatus"] = signalStatus === "HOLD" ? "NONE" : "UNKNOWN";
    // The conservative V2.4 live policy is HOLD-only until an independently
    // approved mandate/strategy is wired in.  A no-order day reconciles only
    // at the dedicated end-of-day event; no missed window is backfilled.
    let reconciliationStatus: ObservationRecord["reconciliationStatus"] = "UNKNOWN";
    let reconciliation: unknown = null;
    let quality: ObservationDayQuality | undefined;
    if (kind === "END_OF_DAY" && actualTradingDay) {
      try {
        const namespace = `v24-observation-${observationDate}`;
        const response = await fetch(`${this.executionUrl}/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.executionToken}` }, signal: AbortSignal.timeout(5_000) });
        if (!response.ok) throw new Error(`reconciliation status ${response.status}`);
        reconciliation = await response.json();
        const facts = reconciliation as { unresolved_order_count?: number; pending_outbox_count?: number };
        reconciliationStatus = facts.unresolved_order_count === 0 && facts.pending_outbox_count === 0 ? "PASS" : "FAIL";
      } catch (error) { errors.push(error instanceof Error ? error.message : "reconciliation probe failed"); reconciliationStatus = "FAIL"; }
      try {
        const priorErrors = await this.repository.errorsForDate(observationDate);
        for (const priorError of priorErrors) if (!errors.includes(priorError)) errors.push(priorError);
      } catch (error) { errors.push(error instanceof Error ? error.message : "prior observation error lookup failed"); }
      try {
        quality = await this.repository.qualityForDate(observationDate);
        for (const qualityError of quality.errors) if (!errors.includes(qualityError)) errors.push(qualityError);
      } catch (error) { errors.push(error instanceof Error ? error.message : "observation quality lookup failed"); }
    }

    await this.repository.upsertObservation({
      observationDate, sourceAvailable, lastSnapshotAt, dataAgeSeconds, samplingEvery30Minutes, enteredExecutionWindow,
      signalStatus, simulatedOrderStatus, fillStatus, reconciliationStatus, outageStatus, testRunId, errors, recoveryActions,
      evidence: {
        recordedAt: now.toISOString(), eventKind: kind, scheduledFor, scheduledDelaySeconds, previousSampleAt, timeZone: "Asia/Shanghai",
        actualTradingDay: calendar.status ?? "UNKNOWN", calendarVersion: calendar.calendarVersion ?? null, calendarReason: calendar.reason ?? null,
        observationCounted: shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality }),
        observationQuality: quality ?? null,
        dataMode: "LIVE_SOURCE", sourceProbe: quote, reconciliation, mode: "PAPER", brokerMode: "FAKE",
        strategy: signalStatus === "HOLD" ? "v24-conservative-hold-v1" : null,
        noBackfill: true
      }
    });
    if (kind === "END_OF_DAY" && actualTradingDay && testRunId && shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality })) await this.repository.completeDailyTestRun(observationDate, testRunId, { reconciliation, observationCounted: true, observationQuality: quality });
  }

  private async calendar(date: string, errors: string[]): Promise<Calendar> {
    try {
      const response = await fetch(`${this.marketUrl}/v2/calendar/cn-a-share/${date}`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error(`calendar status ${response.status}`);
      return await response.json() as Calendar;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "calendar probe failed");
      return { status: "UNKNOWN", reason: "authoritative market calendar unavailable" };
    }
  }
}
