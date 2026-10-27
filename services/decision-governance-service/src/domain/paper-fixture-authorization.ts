export type PaperFixtureGrant = {
  scenarioId: string;
  scenarioVersion: string;
  testRunId: string;
  ownerId: string;
  namespace: string;
  accountId: string;
  clockNow: string;
  dataMode: string;
  environmentMode: string;
  brokerMode: string;
  liveTradingEnabled: boolean;
  market: string;
  currency: string;
  policy: {
    policyId: string; policyVersion: string; riskPolicyVersion: string; feePolicyVersion: string;
    maxDeviationBps: number; freshnessLimitSeconds: number; executionWindowStart: string; executionWindowEnd: string;
  };
  mandate: {
    mandateId: string; mandateVersion: string; strategyVersion: string; securityScope: string[];
    maxOrderNotional: string; maxGrossExposure: string; maxDailyTurnover: string; approvalEvidenceRef: string;
  };
  signal: { signalId: string; asOf: string; action: string; quantity: number; referencePrice: string };
  order: { clientOrderId: string; security: string; acceptedAt: string; requestedQuantity: number };
  snapshot: { snapshotId: string; security: string; market: string; sourceMode: string; status: string; observedAt: string; ingestedAt: string; price: string };
  fee: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MONEY = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u;
const timestamp = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : Number.NaN;
const ticks = (value: string) => {
  if (!MONEY.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(4, "0")}`);
};
const exactKeys = (value: object, keys: string[]) => Object.keys(value).sort().join("|") === [...keys].sort().join("|");

/** Only grants the frozen V2.4 test fixture; this route cannot activate a reusable Paper strategy. */
export function validatePaperFixtureGrant(value: unknown): value is PaperFixtureGrant {
  if (typeof value !== "object" || value === null) return false;
  const grant = value as PaperFixtureGrant;
  if (!exactKeys(grant, ["scenarioId", "scenarioVersion", "testRunId", "ownerId", "namespace", "accountId", "clockNow", "dataMode", "environmentMode", "brokerMode", "liveTradingEnabled", "market", "currency", "policy", "mandate", "signal", "order", "snapshot", "fee"])) return false;
  if (grant.scenarioId !== "v24-isolated-snapshot-paper-normal" || grant.scenarioVersion !== "2.0.0" ||
      !UUID.test(grant.testRunId) || !UUID.test(grant.accountId) || typeof grant.ownerId !== "string" || !grant.ownerId ||
      grant.namespace !== `v24-paper-v2-${grant.testRunId}` || grant.dataMode !== "FIXTURE" || grant.environmentMode !== "PAPER" ||
      grant.brokerMode !== "FAKE" || grant.liveTradingEnabled !== false || grant.market !== "CN_A" || grant.currency !== "CNY") return false;

  const { policy, mandate, signal, order, snapshot } = grant;
  if (!exactKeys(policy, ["policyId", "policyVersion", "riskPolicyVersion", "feePolicyVersion", "maxDeviationBps", "freshnessLimitSeconds", "executionWindowStart", "executionWindowEnd"]) ||
      !exactKeys(mandate, ["mandateId", "mandateVersion", "strategyVersion", "securityScope", "maxOrderNotional", "maxGrossExposure", "maxDailyTurnover", "approvalEvidenceRef"]) ||
      !exactKeys(signal, ["signalId", "asOf", "action", "quantity", "referencePrice"]) ||
      !exactKeys(order, ["clientOrderId", "security", "acceptedAt", "requestedQuantity"]) ||
      !exactKeys(snapshot, ["snapshotId", "security", "market", "sourceMode", "status", "observedAt", "ingestedAt", "price"])) return false;
  if (policy?.policyId !== "v24-isolated-fixture-paper-policy" || policy.policyVersion !== "2.0.0" ||
      policy.riskPolicyVersion !== "fixture-risk-v1" || policy.feePolicyVersion !== "fixture-fee-v1" ||
      !Number.isFinite(policy.maxDeviationBps) || policy.maxDeviationBps < 0 || policy.maxDeviationBps > 1000 ||
      !Number.isSafeInteger(policy.freshnessLimitSeconds) || policy.freshnessLimitSeconds < 0 || policy.freshnessLimitSeconds > 1800) return false;
  if (mandate?.mandateId !== "v24-isolated-fixture-paper-mandate" || mandate.mandateVersion !== "2.0.0" ||
      !/^[a-f0-9]{64}$/u.test(mandate.strategyVersion) || mandate.approvalEvidenceRef !== "fixture-approval:v24-isolated-paper-v2" ||
      !Array.isArray(mandate.securityScope) || mandate.securityScope.length !== 1 || !mandate.securityScope.includes("600000.SH")) return false;

  const price = ticks(snapshot?.price ?? "");
  const reference = ticks(signal?.referencePrice ?? "");
  if (price === null || reference === null) return false;
  const orderNotional = price === null || !Number.isSafeInteger(order?.requestedQuantity) || order.requestedQuantity < 1
    ? null : price * BigInt(order.requestedQuantity);
  const maxOrderNotional = ticks(mandate.maxOrderNotional);
  const maxGrossExposure = ticks(mandate.maxGrossExposure);
  const maxDailyTurnover = ticks(mandate.maxDailyTurnover);
  if (order?.security !== "600000.SH" || order.requestedQuantity !== signal?.quantity || !["BUY", "SELL"].includes(signal.action) ||
      !order.clientOrderId.startsWith("v24-fixture-v2-") || !mandate.securityScope.includes(order.security) ||
      orderNotional === null || maxOrderNotional === null || maxGrossExposure === null || maxDailyTurnover === null ||
      orderNotional > maxOrderNotional || orderNotional > maxGrossExposure || orderNotional > maxDailyTurnover || price === 0n || reference === null) return false;

  const acceptedAt = timestamp(order.acceptedAt);
  const observedAt = timestamp(snapshot.observedAt);
  const ingestedAt = timestamp(snapshot.ingestedAt);
  const windowStart = timestamp(policy.executionWindowStart);
  const windowEnd = timestamp(policy.executionWindowEnd);
  if (![acceptedAt, observedAt, ingestedAt, windowStart, windowEnd, timestamp(signal.asOf)].every(Number.isFinite) ||
      acceptedAt < windowStart || acceptedAt >= windowEnd || observedAt <= acceptedAt || observedAt >= windowEnd ||
      ingestedAt < observedAt || !snapshot.snapshotId || snapshot.security !== order.security || snapshot.market !== "CN_A" ||
      snapshot.sourceMode !== "FIXTURE" || snapshot.status !== "READY" || !MONEY.test(grant.fee)) return false;
  if (!Number.isFinite(timestamp(grant.clockNow)) || timestamp(grant.clockNow) < ingestedAt || timestamp(grant.clockNow) - observedAt > policy.freshnessLimitSeconds * 1000) return false;
  const deviation = price >= reference ? price - reference : reference - price;
  return deviation * 10000n <= reference * BigInt(Math.round(policy.maxDeviationBps));
}
