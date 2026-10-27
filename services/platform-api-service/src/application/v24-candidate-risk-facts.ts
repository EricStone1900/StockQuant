type Money = { amount?: string; currency?: string };
type Position = { security?: string; quantity?: number };
type Receivable = { amount?: string; currency?: string; status?: string };

export type V24CandidatePortfolioSnapshot = {
  cash?: Money;
  positions?: Position[];
  unsettledReceivables?: Receivable[];
};

export type V24CandidateIndependentAssets = {
  initial_cash?: string;
  current_cash?: string;
  currency?: string;
  positions?: Position[];
  unsettledReceivables?: Receivable[];
};

const SCALE = 10_000n;

const parseAmount = (value: string | undefined): bigint => {
  if (!value || !/^\d+(?:\.\d{1,4})?$/u.test(value)) throw new Error("C5_RISK_FACT_AMOUNT_INVALID");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(4, "0"));
};

const formatAmount = (value: bigint): string => `${value / SCALE}.${(value % SCALE).toString().padStart(4, "0")}`;

const requireCny = (currency: string | undefined): void => {
  if (currency !== "CNY") throw new Error("C5_RISK_FACT_CURRENCY_INVALID");
};

const holdingQuantity = (positions: Position[] | undefined): number => {
  let quantity = 0;
  for (const position of positions ?? []) {
    const positionQuantity = position.quantity;
    if (position.security !== "600000.SH" || !Number.isSafeInteger(positionQuantity) || positionQuantity === undefined || positionQuantity < 0) throw new Error("C5_RISK_FACT_POSITION_INVALID");
    quantity += positionQuantity;
  }
  return quantity;
};

const receivablesValue = (receivables: Receivable[] | undefined): bigint => (receivables ?? []).reduce((total, receivable) => {
  requireCny(receivable.currency);
  if (receivable.status !== "PENDING" && receivable.status !== "SETTLED") throw new Error("C5_RISK_FACT_RECEIVABLE_INVALID");
  // A SETTLED receivable has already become cash in Portfolio and must not be
  // counted a second time in net value.
  return receivable.status === "PENDING" ? total + parseAmount(receivable.amount) : total;
}, 0n);

const sameReceivables = (left: Receivable[] | undefined, right: Receivable[] | undefined): boolean => {
  const normalize = (items: Receivable[] | undefined) => (items ?? []).map((item) => ({ amount: formatAmount(parseAmount(item.amount)), currency: item.currency, status: item.status })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

/**
 * Projects auditable Candidate A risk facts from the Portfolio snapshot.  It is
 * deliberately read-only: turnover needs fill facts, and risk state may only
 * be updated once the independent FakeBroker asset snapshot is available too.
 */
export function projectV24CandidateRiskFacts(input: {
  initialCash: string;
  referencePrice: string;
  portfolio: V24CandidatePortfolioSnapshot;
  independentAssets?: V24CandidateIndependentAssets | null;
}): {
  grossExposure: string;
  cumulativeLoss: string;
  netValue: string;
  holdingQuantity: number;
  dailyTurnover: { status: "NOT_AVAILABLE"; reason: "FILL_FACTS_REQUIRED" };
  reconciliation: { status: "NOT_AVAILABLE" | "MATCH" | "DISCREPANCY"; reason: string | null };
  eligibleForRiskUpdate: false;
} {
  requireCny(input.portfolio.cash?.currency);
  const initialCash = parseAmount(input.initialCash);
  const referencePrice = parseAmount(input.referencePrice);
  const cash = parseAmount(input.portfolio.cash?.amount);
  const quantity = holdingQuantity(input.portfolio.positions);
  const receivables = receivablesValue(input.portfolio.unsettledReceivables);
  const grossExposure = BigInt(quantity) * referencePrice;
  const netValue = cash + grossExposure + receivables;
  const cumulativeLoss = initialCash > netValue ? initialCash - netValue : 0n;
  const independent = input.independentAssets;
  let reconciliation: { status: "NOT_AVAILABLE" | "MATCH" | "DISCREPANCY"; reason: string | null } = { status: "NOT_AVAILABLE", reason: "INDEPENDENT_FAKEBROKER_ASSETS_NOT_CREATED" };
  if (independent) {
    const matches = independent.currency === "CNY"
      && parseAmount(independent.initial_cash) === initialCash
      && parseAmount(independent.current_cash) === cash
      && holdingQuantity(independent.positions) === quantity
      && sameReceivables(independent.unsettledReceivables, input.portfolio.unsettledReceivables);
    reconciliation = matches ? { status: "MATCH", reason: null } : { status: "DISCREPANCY", reason: "PORTFOLIO_AND_FAKEBROKER_ASSETS_DIFFER" };
  }
  return {
    grossExposure: formatAmount(grossExposure), cumulativeLoss: formatAmount(cumulativeLoss), netValue: formatAmount(netValue), holdingQuantity: quantity,
    dailyTurnover: { status: "NOT_AVAILABLE", reason: "FILL_FACTS_REQUIRED" }, reconciliation, eligibleForRiskUpdate: false,
  };
}
