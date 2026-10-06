import type { V32IndependentValidationReport } from "../contracts/generated-types.js";
import { createHash } from "node:crypto";
import { evidenceSha256 } from "./validation-submission.js";
type ValidationCheck = V32IndependentValidationReport["checks"][number];

type Bar = { security: string; date: string; availableAt: string; open: number; high: number; low: number; close: number; volume: number };
type Json = Record<string, unknown>;
const FROZEN_SMA_SOURCE = "def signal(closes, fast=5, slow=20): return sum(closes[-fast:])/fast > sum(closes[-slow:])/slow";

const frozenFiles = ["daily-bars.csv", "candidate.json", "validation-design.json"] as const;

/** Verify byte identity and scope before a fixture is allowed to produce evidence. */
export function verifyV32SyntheticFixture(input: { manifest: Json; files: Record<string, Uint8Array> }): void {
  const manifest = input.manifest;
  if (manifest.fixtureId !== "v3.2-independent-validation-synthetic" || manifest.fixtureVersion !== "v3.2-independent-validation-1" || manifest.stageId !== "V3.2" || manifest.status !== "FROZEN" || manifest.dataMode !== "FIXTURE" || manifest.usageEligibility !== "RESEARCH_ONLY") {
    throw new Error("synthetic validation fixture manifest identity or eligibility is invalid");
  }
  if (!Array.isArray(manifest.files) || Object.keys(input.files).length !== frozenFiles.length || manifest.files.length !== frozenFiles.length) {
    throw new Error("synthetic validation fixture must contain exactly the frozen input files");
  }
  const entries = new Map<string, { path?: unknown; sha256?: unknown }>();
  for (const entry of manifest.files) {
    if (typeof entry !== "object" || entry === null || typeof (entry as { path?: unknown }).path !== "string") throw new Error("synthetic validation fixture manifest has an invalid file entry");
    const name = (entry as { path: string }).path.split("/").at(-1) ?? "";
    if (!frozenFiles.includes(name as typeof frozenFiles[number]) || entries.has(name)) throw new Error("synthetic validation fixture manifest contains an unexpected or duplicate file");
    entries.set(name, entry as { path?: unknown; sha256?: unknown });
  }
  for (const name of frozenFiles) {
    const bytes = input.files[name];
    const entry = entries.get(name);
    const expectedPath = `fixtures/v3/v3.2-independent-validation-v1/${name}`;
    const actualHash = bytes ? createHash("sha256").update(bytes).digest("hex") : "";
    if (!bytes || entry?.path !== expectedPath || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entry.sha256) || actualHash !== entry.sha256) {
      throw new Error(`synthetic validation fixture file is missing or differs from its frozen manifest: ${name}`);
    }
  }
}

function parseBars(csv: string): Bar[] {
  const lines = csv.trimEnd().split("\n");
  if (lines.shift() !== "security,date,availableAt,open,high,low,close,volume") throw new Error("unexpected daily bar header");
  return lines.map((line, index) => {
    const cells = line.split(",");
    if (cells.length !== 8) throw new Error(`daily bar ${index + 2} has invalid column count`);
    const [security, date, availableAt, open, high, low, close, volume] = cells;
    const values = [open, high, low, close, volume].map(Number);
    if (values.some((value) => !Number.isFinite(value)) || values.slice(0, 4).some((value) => value <= 0) || !Number.isSafeInteger(values[4]) || values[4] <= 0) throw new Error(`daily bar ${index + 2} has invalid numeric values`);
    return { security, date, availableAt, open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4] };
  });
}

function checkEvidence(checkId: ValidationCheck["checkId"], status: ValidationCheck["status"], details: Json) {
  const evidenceHash = evidenceSha256(checkId, status, details);
  return { check: { checkId, status, evidenceSha256: evidenceHash }, details };
}

/**
 * Deterministic verifier for the frozen synthetic SMA fixture only. Candidate
 * source is executed in a separate restricted container; this implementation
 * independently checks its signals and computes the resulting report.
 */
export function recomputeV32SyntheticFixture(input: { barsCsv: string; candidate: Json; design: Json; candidateExecution?: { codeSha256: string; decisions: Array<{ security: string; index: number; date: string; targetHeld: boolean }> } }): {
  checks: ValidationCheck[];
  evidence: Record<string, Json>;
} {
  const bars = parseBars(input.barsCsv);
  const candidate = input.candidate as any;
  const design = input.design as any;
  const [trainStart, trainEnd] = design.split.train as [number, number];
  const [validationStart, validationEnd] = design.split.validation as [number, number];
  const [testStart, testEnd] = design.split.test as [number, number];
  const fastWindow = Number(candidate.parameters?.fastWindow);
  const slowWindow = Number(candidate.parameters?.slowWindow);
  const dataBySecurity = new Map<string, Bar[]>();
  for (const bar of bars) {
    const series = dataBySecurity.get(bar.security) ?? [];
    const previous = series.at(-1);
    if (previous && previous.date >= bar.date) throw new Error(`bars are not ordered and unique for ${bar.security}`);
    series.push(bar);
    dataBySecurity.set(bar.security, series);
  }

  const pitViolations: string[] = [];
  let decisionsChecked = 0;
  let ordersSubmitted = 0;
  let capacityViolations: string[] = [];
  const trades: Array<{ security: string; decisionDate: string; executionDate: string; side: "BUY" | "SELL"; quantity: number; executionOpen: number; realizedVolume: number; participation: number; fee: number }> = [];
  let grossPnl = 0;
  let totalFees = 0;
  let finalMarketValue = 0;
  const initialCapital = 100_000;
  const quantity = 100;
  const rulesMetadataValid = candidate.schemaVersion === "v3.2-deterministic-sma-candidate-v1" && candidate.sourceMode === "FIXTURE" && candidate.algorithm === design.checks.rules.allowedAlgorithm && fastWindow === design.checks.rules.fastWindow && slowWindow === design.checks.rules.slowWindow && fastWindow > 0 && fastWindow < slowWindow && candidate.signalTiming === "CLOSE_T_AVAILABLE_AT_T; EXECUTE_AT_NEXT_SESSION_OPEN" && candidate.sourceCode === FROZEN_SMA_SOURCE;
  const candidateSignals = new Map<string, { date: string; targetHeld: boolean }>();
  let malformedCandidateDecisions = false;
  if (input.candidateExecution) {
    if (input.candidateExecution.codeSha256 !== createHash("sha256").update(String(candidate.sourceCode)).digest("hex")) malformedCandidateDecisions = true;
    for (const decision of input.candidateExecution.decisions) {
      if (!decision || typeof decision.security !== "string" || !Number.isSafeInteger(decision.index) || typeof decision.date !== "string" || typeof decision.targetHeld !== "boolean") { malformedCandidateDecisions = true; continue; }
      const key = `${decision.security}:${decision.index}`;
      if (candidateSignals.has(key)) malformedCandidateDecisions = true;
      else candidateSignals.set(key, { date: decision.date, targetHeld: decision.targetHeld });
    }
  }
  let candidateDecisionCount = 0;
  let candidateDecisionMatches = 0;
  const candidateDecisionMismatches: string[] = [];
  const costs = design.checks.cost;
  const costRate = (Number(costs.commissionBpsPerSide) + Number(costs.slippageBpsPerSide)) / 10_000;
  const capacityLimit = Number(design.checks.capacity.maximumParticipation);
  const capacityConfigValid = Number.isFinite(capacityLimit) && capacityLimit > 0 && capacityLimit <= 1;
  const rangesValid = trainStart === 0 && trainEnd > trainStart && trainEnd === validationStart && validationEnd > validationStart && validationEnd === testStart && testEnd > testStart && [trainStart, trainEnd, validationStart, validationEnd, testStart, testEnd].every(Number.isSafeInteger);
  const testSessions = testEnd - testStart;
  const simulationBoundsValid = Number.isSafeInteger(testStart) && Number.isSafeInteger(testEnd) && testStart >= slowWindow - 1 && testEnd > testStart && dataBySecurity.size > 0 && [...dataBySecurity.values()].every((series) => series.length >= testEnd);
  const oosAvailable = rangesValid && testSessions > slowWindow && simulationBoundsValid;

  for (const [security, series] of simulationBoundsValid ? dataBySecurity : []) {
    let held = false;
    let entryPrice = 0;
    for (let decisionIndex = testStart; decisionIndex < testEnd - 1; decisionIndex += 1) {
      const decisionBar = series[decisionIndex];
      const availableAt = Date.parse(decisionBar.availableAt);
      const decisionAt = Date.parse(`${decisionBar.date}T16:00:00+08:00`);
      decisionsChecked += 1;
      if (!Number.isFinite(availableAt) || availableAt > decisionAt || decisionBar.availableAt !== `${decisionBar.date}T16:00:00+08:00`) pitViolations.push(`${security}:${decisionBar.date}:feature-not-available-at-decision`);
      const history = series.slice(decisionIndex - slowWindow + 1, decisionIndex + 1);
      if (history.length !== slowWindow || history.some((bar) => Date.parse(bar.availableAt) > decisionAt)) pitViolations.push(`${security}:${decisionBar.date}:indicator-uses-future-or-incomplete-history`);
      if (!rulesMetadataValid || history.length !== slowWindow) continue;
      const fast = history.slice(-fastWindow).reduce((sum, bar) => sum + bar.close, 0) / fastWindow;
      const slow = history.reduce((sum, bar) => sum + bar.close, 0) / slowWindow;
      const referenceTargetHeld = fast > slow;
      let targetHeld = referenceTargetHeld;
      if (input.candidateExecution) {
        const candidateDecision = candidateSignals.get(`${security}:${decisionIndex}`);
        if (!candidateDecision || candidateDecision.date !== decisionBar.date) {
          candidateDecisionMismatches.push(`${security}:${decisionBar.date}:candidate-decision-missing-or-date-mismatch`);
          continue;
        }
        candidateDecisionCount += 1;
        targetHeld = candidateDecision.targetHeld;
        if (targetHeld === referenceTargetHeld) candidateDecisionMatches += 1;
        else candidateDecisionMismatches.push(`${security}:${decisionBar.date}:candidate-signal-differs-from-frozen-rule`);
      }
      if (targetHeld === held) continue;
      const executionBar = series[decisionIndex + 1];
      const participation = quantity / executionBar.volume;
      ordersSubmitted += 1;
      if (participation > capacityLimit) capacityViolations.push(`${security}:${executionBar.date}:${participation}`);
      const notional = quantity * executionBar.open;
      const fee = notional * costRate;
      totalFees += fee;
      if (targetHeld) {
        entryPrice = executionBar.open;
        held = true;
        trades.push({ security, decisionDate: decisionBar.date, executionDate: executionBar.date, side: "BUY", quantity, executionOpen: executionBar.open, realizedVolume: executionBar.volume, participation, fee });
      } else {
        grossPnl += quantity * (executionBar.open - entryPrice);
        held = false;
        trades.push({ security, decisionDate: decisionBar.date, executionDate: executionBar.date, side: "SELL", quantity, executionOpen: executionBar.open, realizedVolume: executionBar.volume, participation, fee });
      }
    }
    if (held) grossPnl += quantity * (series[testEnd - 1].close - entryPrice);
    if (held) finalMarketValue += quantity * series[testEnd - 1].close;
  }

  const expectedCandidateDecisions = [...dataBySecurity.values()].reduce((count, series) => count + (series.length >= testEnd ? Math.max(0, testEnd - testStart - 1) : 0), 0);
  const candidateDecisionSetComplete = !input.candidateExecution || (!malformedCandidateDecisions && candidateSignals.size === expectedCandidateDecisions && candidateDecisionCount === expectedCandidateDecisions);
  if (input.candidateExecution && candidateSignals.size !== expectedCandidateDecisions) candidateDecisionMismatches.push(`candidate-decision-count:${candidateSignals.size}:expected:${expectedCandidateDecisions}`);
  const rulesValid = rulesMetadataValid && candidateDecisionSetComplete && candidateDecisionMismatches.length === 0;
  const grossReturn = grossPnl / initialCapital;
  const netReturn = (grossPnl - totalFees) / initialCapital;
  const oosDetails = { train: [trainStart, trainEnd], validation: [validationStart, validationEnd], test: [testStart, testEnd], securities: dataBySecurity.size, testSessions, decisionCount: decisionsChecked, ordersSubmitted, trades, grossReturn, netReturn, toleranceAbsoluteReturn: costs.toleranceAbsoluteReturn, finalMarketValue, initialCapital };
  const pit = checkEvidence("PIT", rangesValid && pitViolations.length === 0 ? "PASS" : "FAIL", { decisionsChecked, violations: pitViolations, featureCutoff: "same-session close availableAt", fillTiming: "next-session open" });
  const oos = checkEvidence("OUT_OF_SAMPLE", oosAvailable && candidateDecisionSetComplete && decisionsChecked > 0 && ordersSubmitted > 0 && Number.isFinite(netReturn) ? "PASS" : "FAIL", oosDetails);
  const costValid = Number.isFinite(costRate) && costRate > 0 && Number.isFinite(netReturn) && totalFees >= 0 && netReturn <= grossReturn && (trades.length === 0 || totalFees > 0);
  const cost = checkEvidence("COST", costValid ? "PASS" : "FAIL", { commissionBpsPerSide: costs.commissionBpsPerSide, slippageBpsPerSide: costs.slippageBpsPerSide, effectiveRatePerSide: costRate, totalFees, grossReturn, netReturn, assertion: "costs reduce or preserve performance, never increase it" });
  const rules = checkEvidence("RULES", rulesValid ? "PASS" : "FAIL", { candidateId: candidate.candidateId, algorithm: candidate.algorithm, fastWindow, slowWindow, execution: candidate.signalTiming, valid: rulesValid, candidateSourceExecution: input.candidateExecution ? "EXECUTED_IN_ISOLATED_CONTAINER" : "NOT_PERFORMED", candidateCodeSha256: input.candidateExecution?.codeSha256 ?? null, candidateDecisionCount: input.candidateExecution?.decisions.length ?? 0, candidateDecisionMatches, candidateDecisionMismatches });
  const capacity = checkEvidence("CAPACITY", capacityConfigValid && ordersSubmitted > 0 && capacityViolations.length === 0 ? "PASS" : "FAIL", { quantity, maximumParticipation: capacityLimit, configurationValid: capacityConfigValid, ordersSubmitted, violations: capacityViolations, measureBoundary: "realized full-session volume is a retrospective capacity check, not an execution input" });
  const entries = [pit, oos, cost, rules, capacity];
  const checks = entries.map((entry) => entry.check);
  return { checks, evidence: Object.fromEntries(entries.map(({ check, details }) => [check.checkId, { ...details, evidenceSha256: check.evidenceSha256 }])) };
}
