import type { ObservationDayQuality, ObservationRecord, ObservationRepository } from "../ports/observation-repository.js";
import { V24_MAX_QUOTE_AGE_SECONDS } from "./v24-observation-quality.js";
import { v24SamplingSlots, type SchedulerTickHandler } from "./v24-scheduler.js";
import type { CnAShareCalendarSession } from "../contracts/generated-types.js";
import { GeneratedV24MarketObservationClient } from "../contracts/generated-v24-market-observation-client.js";
import { GeneratedPlatformPaperExecutionClient } from "../contracts/generated-platform-paper-execution-client.js";

type Calendar = Partial<CnAShareCalendarSession>;

export function isV24QuoteSourceUseConfigured({ approved, authorizationRef, dataVersion }: { approved: boolean; authorizationRef: string; dataVersion: string }): boolean {
  return approved && authorizationRef.trim().length > 0 && dataVersion.trim().length > 0;
}

export function shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality }: { actualTradingDay: boolean; kind: string; reconciliationStatus: ObservationRecord["reconciliationStatus"]; errors: string[]; quality?: ObservationDayQuality }): boolean {
  const expectedSamplingEvents = quality?.samplingIntervalMinutes === 20 ? 14 : quality?.samplingIntervalMinutes === 30 ? 10 : -1;
  const qualityPass = quality !== undefined
    && expectedSamplingEvents > 0 && quality.samplingEvents === expectedSamplingEvents && quality.uniqueSamplingWindows === expectedSamplingEvents && quality.missingSamplingWindows.length === 0
    && quality.uniqueExecutionWindows === 1 && quality.invalidSamplingEvents === 0 && quality.invalidExecutionEvents === 0
    && quality.invalidSecuritySamples === 0 && quality.expectedSecuritySamples > 0
    && quality.validSecuritySamples === quality.expectedSecuritySamples && quality.errors.length === 0;
  return actualTradingDay && kind === "END_OF_DAY" && reconciliationStatus === "PASS" && errors.length === 0 && qualityPass;
}

export function hasMissedV24SamplingWindow({ previousSampleAt, now, samplingIntervalMinutes, scheduledFor }: { previousSampleAt: string | null; now: Date; samplingIntervalMinutes: number; scheduledFor: string | null }): boolean {
  if (!previousSampleAt) return false;
  const previous = new Date(previousSampleAt);
  if (!Number.isFinite(previous.getTime())) return false;
  const localDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
  const previousDate = localDate(previous);
  const nowDate = localDate(now);
  if (previousDate !== nowDate) return false;
  const cutoff = scheduledFor ? Math.min(now.getTime(), Date.parse(scheduledFor)) : now.getTime();
  if (!Number.isFinite(cutoff)) return false;
  return v24SamplingSlots(samplingIntervalMinutes).some((slot) => {
    const slotAt = new Date(`${nowDate}T${slot}+08:00`).getTime();
    return slotAt > previous.getTime() && slotAt < cutoff;
  });
}

function executionGate({ actualTradingDay, kind, sourceAvailable, outageStatus, sourceUseConfigured }: { actualTradingDay: boolean; kind: string; sourceAvailable: boolean | null; outageStatus: ObservationRecord["outageStatus"]; sourceUseConfigured: boolean }): { status: "OPEN" | "PAUSED" | "NOT_APPLICABLE"; reason: string } {
  if (kind !== "EXECUTION_WINDOW") return { status: "NOT_APPLICABLE", reason: "OUTSIDE_EXECUTION_WINDOW" };
  if (!actualTradingDay) return { status: "PAUSED", reason: "MARKET_CALENDAR_NOT_CONFIRMED_TRADING" };
  if (!sourceUseConfigured) return { status: "PAUSED", reason: "QUOTE_SOURCE_NOT_AUTHORIZED" };
  if (sourceAvailable !== true || outageStatus !== "NONE") {
    const reason = outageStatus === "STALE" ? "QUOTE_DATA_STALE" : outageStatus === "DISCONNECTED" ? "QUOTE_SOURCE_DISCONNECTED" : "QUOTE_SOURCE_STATUS_UNKNOWN";
    return { status: "PAUSED", reason };
  }
  // Activity remains disabled until an account and an independently approved mandate exist.
  return { status: "PAUSED", reason: "NO_ACTIVE_PAPER_ACCOUNT_OR_APPROVED_MANDATE" };
}

export class V24LiveObservationHandler implements SchedulerTickHandler {
  private readonly marketObservationClient: GeneratedV24MarketObservationClient;
  private readonly executionClient: GeneratedPlatformPaperExecutionClient;
  constructor(
    private readonly repository: ObservationRepository,
    private readonly marketUrl: string,
    private readonly executionUrl = "http://127.0.0.1:3005",
    private readonly executionToken = "",
    private readonly quoteSourceUseApproved = false,
    private readonly quoteSourceAuthorizationRef = "",
    private readonly quoteDataVersion = "",
  ) {
    this.marketObservationClient = new GeneratedV24MarketObservationClient(this.marketUrl, this.executionToken);
    this.executionClient = new GeneratedPlatformPaperExecutionClient(this.executionUrl, this.executionToken);
  }

  private get sourceUseConfigured(): boolean {
    return isV24QuoteSourceUseConfigured({ approved: this.quoteSourceUseApproved, authorizationRef: this.quoteSourceAuthorizationRef, dataVersion: this.quoteDataVersion });
  }

  async handleTick({ now, previousSampleAt, kind, scheduledFor, samplingIntervalMinutes = 30 }: Parameters<SchedulerTickHandler["handleTick"]>[0]): Promise<void> {
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

    const quoteObservationTick = actualTradingDay && (kind === "SAMPLING_SLOT" || kind === "EXECUTION_WINDOW" || kind === "RECOVERY_CHECK");
    if (quoteObservationTick && !this.sourceUseConfigured) {
      sourceAvailable = false;
      if (!this.quoteSourceUseApproved) errors.push("QUOTE_SOURCE_USE_NOT_AUTHORIZED");
      else {
        if (!this.quoteSourceAuthorizationRef.trim()) errors.push("QUOTE_SOURCE_AUTHORIZATION_REFERENCE_MISSING");
        if (!this.quoteDataVersion.trim()) errors.push("QUOTE_DATA_VERSION_MISSING");
      }
    } else if (quoteObservationTick) {
      try {
        quote = await this.marketObservationClient.getV24AuthorizedQuotePreview(8_000);
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
        sourceAvailable = requested.length > 0 && covered;
        lastSnapshotAt = observed;
        dataAgeSeconds = ages.length > 0 && ages.every((age): age is number => age !== null) ? Math.max(...ages) : null;
        outageStatus = sourceAvailable ? "NONE" : ages.some((age) => age !== null && (age < 0 || age > V24_MAX_QUOTE_AGE_SECONDS)) ? "STALE" : "DISCONNECTED";
      } catch (error) { errors.push(error instanceof Error ? error.message : "quote probe failed"); outageStatus = "DISCONNECTED"; }
    }

    const intervalSeconds = previousSampleAt ? (now.getTime() - new Date(previousSampleAt).getTime()) / 1000 : null;
    const previousDate = previousSampleAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(previousSampleAt)) : null;
    const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    const sameDayGap = previousDate === observationDate && hasMissedV24SamplingWindow({ previousSampleAt, now, samplingIntervalMinutes, scheduledFor: kind === "SAMPLING_SLOT" ? scheduledFor : null });
    const startupAfterFirstSlot = previousDate !== observationDate && localTime >= "09:35" && localTime < "15:00";
    const scheduledDelaySeconds = scheduledFor ? (now.getTime() - new Date(scheduledFor).getTime()) / 1000 : null;
    const samplingEvery30Minutes = kind === "SAMPLING_SLOT" ? samplingIntervalMinutes === 30 && scheduledDelaySeconds !== null && Math.abs(scheduledDelaySeconds) <= 60 : sameDayGap ? false : null;
    if (kind === "RECOVERY_CHECK" && actualTradingDay && (sameDayGap || startupAfterFirstSlot)) recoveryActions.push("RECOVERY_GAP_RECORDED_NO_BACKFILL");
    const enteredExecutionWindow = kind === "EXECUTION_WINDOW";
    const gate = executionGate({ actualTradingDay, kind, sourceAvailable, outageStatus, sourceUseConfigured: this.sourceUseConfigured });
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
        const response = await this.executionClient.readV24PaperReconciliationSummary(namespace);
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
        recordedAt: now.toISOString(), eventKind: kind, scheduledFor, scheduledDelaySeconds, previousSampleAt, samplingIntervalMinutes, timeZone: "Asia/Shanghai",
        actualTradingDay: calendar.status ?? "UNKNOWN", calendarVersion: calendar.calendarVersion ?? null, calendarReason: calendar.reason ?? null,
        observationCounted: shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality }),
        observationQuality: quality ?? null,
        ...(enteredExecutionWindow ? { executionGate: gate } : {}),
        dataMode: this.sourceUseConfigured ? "LIVE_SOURCE" : "NOT_CONNECTED",
        sourceUsage: {
          status: this.sourceUseConfigured ? "CONFIGURED_WITH_APPROVAL_REFERENCE" : this.quoteSourceUseApproved ? "APPROVAL_EVIDENCE_INCOMPLETE" : "NOT_AUTHORIZED",
          sourceId: "tencent-quote",
          authorizationEvidenceRef: this.quoteSourceAuthorizationRef.trim() || null,
          dataVersion: this.quoteDataVersion.trim() || null,
        },
        sourceProbe: quote, reconciliation, mode: "PAPER", brokerMode: "FAKE",
        strategy: signalStatus === "HOLD" ? "v24-conservative-hold-v1" : null,
        noBackfill: true
      }
    });
    if (kind === "END_OF_DAY" && actualTradingDay && testRunId && shouldCountDailyObservation({ actualTradingDay, kind, reconciliationStatus, errors, quality })) await this.repository.completeDailyTestRun(observationDate, testRunId, { reconciliation, observationCounted: true, observationQuality: quality });
  }

  private async calendar(date: string, errors: string[]): Promise<Calendar> {
    try {
      return await this.marketObservationClient.getCnAShareCalendarSession(date);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "calendar probe failed");
      return { status: "UNKNOWN", reason: "authoritative market calendar unavailable" };
    }
  }
}
