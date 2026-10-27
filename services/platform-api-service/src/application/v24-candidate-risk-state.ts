export type V24CandidateRiskState = {
  testRunId: string; ownerId: string; accountId: string; namespace: string;
  sessionDate: string;
  initialCash: string; maxGrossExposure: string; maxDailyTurnover: string; cumulativeLossLimit: string;
  dailyTurnover: string; grossExposure: string; cumulativeLoss: string;
  appliedFills: Array<{ externalFillId: string; fingerprint: string }>;
  sessionTransitions: Array<{ fromSessionDate: string; toSessionDate: string; approvedBy: string | null; approvedAt: string | null }>;
  status: "ACTIVE" | "PAUSED"; reason: "MANDATE_INACTIVE" | "LOSS_LIMIT_REACHED" | "DAILY_TURNOVER_LIMIT" | "GROSS_EXPOSURE_LIMIT" | null;
};

const units = (value: string): bigint | null => {
  if (!/^\d+(?:\.\d{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
};

/** Deterministic Candidate A risk state, kept separate from broker and ledger facts. */
export function initializeV24CandidateRiskState(input: Omit<V24CandidateRiskState, "dailyTurnover" | "grossExposure" | "cumulativeLoss" | "appliedFills" | "sessionTransitions" | "status" | "reason"> & { mandateStatus: "PENDING" | "ACTIVE" | "PAUSED" }): V24CandidateRiskState {
  const values = [input.initialCash, input.maxGrossExposure, input.maxDailyTurnover, input.cumulativeLossLimit].map(units);
  if (values.some((value) => value === null || value! <= 0n) || !/^\d{4}-\d{2}-\d{2}$/u.test(input.sessionDate) || !input.ownerId || !input.accountId || input.namespace !== `v24-paper-v2-${input.testRunId}`) throw new Error("C5_RISK_STATE_INPUT_INVALID");
  return { ...input, dailyTurnover: "0.0000", grossExposure: "0.0000", cumulativeLoss: "0.0000", appliedFills: [], sessionTransitions: [], status: input.mandateStatus === "ACTIVE" ? "ACTIVE" : "PAUSED", reason: input.mandateStatus === "ACTIVE" ? null : "MANDATE_INACTIVE" };
}

/** Applies independently recomputed, non-negative risk facts; it never creates an order. */
export function applyV24CandidateRiskFacts(state: V24CandidateRiskState, facts: { dailyTurnover: string; grossExposure: string; cumulativeLoss: string }): V24CandidateRiskState {
  const dailyTurnover = units(facts.dailyTurnover); const grossExposure = units(facts.grossExposure); const cumulativeLoss = units(facts.cumulativeLoss);
  const dailyLimit = units(state.maxDailyTurnover); const exposureLimit = units(state.maxGrossExposure); const lossLimit = units(state.cumulativeLossLimit);
  if ([dailyTurnover, grossExposure, cumulativeLoss, dailyLimit, exposureLimit, lossLimit].some((value) => value === null || value! < 0n)) throw new Error("C5_RISK_FACTS_INVALID");
  if (state.status === "PAUSED") return { ...state, dailyTurnover: facts.dailyTurnover, grossExposure: facts.grossExposure, cumulativeLoss: facts.cumulativeLoss };
  const reason = dailyTurnover! > dailyLimit! ? "DAILY_TURNOVER_LIMIT" : grossExposure! > exposureLimit! ? "GROSS_EXPOSURE_LIMIT" : cumulativeLoss! >= lossLimit! ? "LOSS_LIMIT_REACHED" : null;
  return { ...state, dailyTurnover: facts.dailyTurnover, grossExposure: facts.grossExposure, cumulativeLoss: facts.cumulativeLoss, status: reason ? "PAUSED" : "ACTIVE", reason };
}

const formatUnits = (value: bigint): string => `${value / 10_000n}.${(value % 10_000n).toString().padStart(4, "0")}`;

/**
 * Adds one independently reconciled FakeBroker Fill to the current TestRun day.
 * A duplicate external fill is a no-op; a non-matching ledger must never advance
 * turnover or risk state.
 */
export function applyV24CandidateRiskFill(state: V24CandidateRiskState, input: {
  externalFillId: string; security: string; quantity: number; price: string; currency: string;
  tradeDate: string; grossExposure: string; cumulativeLoss: string; reconciliation: "MATCH";
}): V24CandidateRiskState {
  if (!input.externalFillId || input.security !== "600000.SH" || input.currency !== "CNY" || input.tradeDate !== state.sessionDate || !Number.isSafeInteger(input.quantity) || input.quantity <= 0 || input.reconciliation !== "MATCH") throw new Error("C5_RISK_FILL_INPUT_INVALID");
  const fingerprint = JSON.stringify({ security: input.security, quantity: input.quantity, price: input.price, currency: input.currency, tradeDate: input.tradeDate, grossExposure: input.grossExposure, cumulativeLoss: input.cumulativeLoss });
  const existing = state.appliedFills.find((fill) => fill.externalFillId === input.externalFillId);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new Error("C5_RISK_FILL_CONFLICT");
    return state;
  }
  const price = units(input.price);
  const currentTurnover = units(state.dailyTurnover);
  if (price === null || currentTurnover === null) throw new Error("C5_RISK_FILL_INPUT_INVALID");
  const dailyTurnover = formatUnits(currentTurnover + BigInt(input.quantity) * price);
  const next = applyV24CandidateRiskFacts(state, { dailyTurnover, grossExposure: input.grossExposure, cumulativeLoss: input.cumulativeLoss });
  return { ...next, appliedFills: [...state.appliedFills, { externalFillId: input.externalFillId, fingerprint }] };
}

/**
 * Opens a later trading-date risk ledger.  A threshold-paused candidate needs
 * a recorded operator approval; an inactive Mandate remains non-resumable.
 */
export function advanceV24CandidateRiskSession(state: V24CandidateRiskState, input: {
  nextSessionDate: string; grossExposure: string; cumulativeLoss: string; reconciliation: "MATCH";
  recoveryApproval?: { approvedBy: string; approvedAt: string };
}): V24CandidateRiskState {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.nextSessionDate) || input.nextSessionDate <= state.sessionDate || input.reconciliation !== "MATCH") throw new Error("C5_RISK_SESSION_INPUT_INVALID");
  if (state.status === "PAUSED" && state.reason === "MANDATE_INACTIVE") throw new Error("C5_RISK_SESSION_MANDATE_INACTIVE");
  const approval = input.recoveryApproval;
  if (state.status === "PAUSED" && (!approval?.approvedBy || !Number.isFinite(Date.parse(approval.approvedAt)))) throw new Error("C5_RISK_SESSION_APPROVAL_REQUIRED");
  const next = {
    ...state, sessionDate: input.nextSessionDate, dailyTurnover: "0.0000", appliedFills: [], status: "ACTIVE" as const, reason: null,
    sessionTransitions: [...state.sessionTransitions, { fromSessionDate: state.sessionDate, toSessionDate: input.nextSessionDate, approvedBy: approval?.approvedBy ?? null, approvedAt: approval?.approvedAt ?? null }],
  };
  return applyV24CandidateRiskFacts(next, { dailyTurnover: "0.0000", grossExposure: input.grossExposure, cumulativeLoss: input.cumulativeLoss });
}

export interface V24CandidateRiskStateRepository {
  saveInitial(state: V24CandidateRiskState): Promise<{ state: V24CandidateRiskState; created: boolean }>;
  find(testRunId: string, ownerId: string, accountId: string, namespace: string): Promise<V24CandidateRiskState | null>;
  applyFacts(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, facts: { dailyTurnover: string; grossExposure: string; cumulativeLoss: string }): Promise<V24CandidateRiskState>;
  applyFill(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, input: Parameters<typeof applyV24CandidateRiskFill>[1]): Promise<V24CandidateRiskState>;
  advanceSession(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, input: Parameters<typeof advanceV24CandidateRiskSession>[1]): Promise<V24CandidateRiskState>;
}
