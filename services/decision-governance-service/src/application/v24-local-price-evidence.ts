/** Local fixture price evidence is a read-only prerequisite, never an authorization. */
export type LocalScope = { ownerId: string; accountId: string; namespace: string; testRunId: string };
type Direction = "BUY" | "SELL";
export type LocalTargetFact = LocalScope & { targetId: string; clientOrderId: string | null; dataMode: string; fixtureSha256: string; strategySha256: string; sessionDate: string; evaluationAt: string; input: { referencePrice: string }; decision: { action: string; quantity: number }; dailyBarProvenance?: { completionIds: string[] } };
export type LocalIntentFact = LocalScope & { clientOrderId: string; targetId: string; security: string; side: string; quantity: number; acceptedAt: string; status: string };
export type LocalSnapshotFact = LocalScope & { clientOrderId: string; snapshotId: string; security: string; market: string; dataMode: string; status: string; price: string; observedAt: string; ingestedAt: string };
export interface V24LocalPriceEvidencePorts {
  readTarget(scope: LocalScope, targetId: string): Promise<LocalTargetFact | null>;
  readOriginalIntent(scope: LocalScope, clientOrderId: string): Promise<LocalIntentFact | null>;
  /** Must return the persisted first qualifying observation for the original intent; unavailable selection returns null. */
  readFirstEligibleSnapshot(scope: LocalScope, clientOrderId: string): Promise<LocalSnapshotFact | null>;
}
const scopeMatches = (scope: LocalScope, fact: LocalScope) => fact.ownerId === scope.ownerId && fact.accountId === scope.accountId && fact.namespace === scope.namespace && fact.testRunId === scope.testRunId;
const time = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : NaN;
const units = (value: string): bigint | null => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
};
const localDate = (date: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const localTime = (date: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date);

/** Reads only authoritative ports. The returned amount must still be atomically checked against the actual mandate budget. */
export async function resolveV24LocalPriceEvidence(ports: V24LocalPriceEvidencePorts, input: { scope: LocalScope; targetId: string; clientOrderId: string; evaluatedAt: string }): Promise<{ targetId: string; clientOrderId: string; snapshotId: string; side: Direction; quantity: number; price: string; fee: "5.00"; budgetAmount: string; quoteAgeSeconds: number; deviationBps: number; observedAt: string }> {
  const { scope, targetId, clientOrderId } = input;
  if (!scope.ownerId || !scope.accountId || !scope.testRunId || scope.namespace !== `v24-paper-v2-${scope.testRunId}` || !targetId || !clientOrderId || !Number.isFinite(time(input.evaluatedAt))) throw new Error("C5_PRICE_INPUT_INVALID");
  const [target, order, snapshot] = await Promise.all([ports.readTarget(scope, targetId), ports.readOriginalIntent(scope, clientOrderId), ports.readFirstEligibleSnapshot(scope, clientOrderId)]);
  if (!target || !order || !snapshot) throw new Error("C5_PRICE_FACTS_UNAVAILABLE");
  if (![target, order, snapshot].every((fact) => scopeMatches(scope, fact)) || target.targetId !== targetId || target.clientOrderId !== clientOrderId || order.clientOrderId !== clientOrderId || order.targetId !== targetId || snapshot.clientOrderId !== clientOrderId) throw new Error("C5_PRICE_SCOPE_MISMATCH");
  if (target.dataMode !== "FIXTURE" || target.fixtureSha256 !== "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea" || target.strategySha256 !== "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(target.sessionDate) || clientOrderId !== `v24-fixture-v2-${scope.testRunId}-${target.sessionDate.replaceAll("-", "")}` || !target.dailyBarProvenance || target.dailyBarProvenance.completionIds.length !== 2 || !target.dailyBarProvenance.completionIds[0] || !target.dailyBarProvenance.completionIds[1] || target.dailyBarProvenance.completionIds[0] === target.dailyBarProvenance.completionIds[1]) throw new Error("C5_PRICE_TARGET_INVALID");
  if (!["BUY", "SELL"].includes(target.decision.action) || target.decision.quantity !== 100 || order.side !== target.decision.action || order.quantity !== target.decision.quantity || order.security !== "600000.SH" || order.status !== "ACCEPTED_INTENT") throw new Error("C5_PRICE_ORDER_MISMATCH");
  const accepted = time(order.acceptedAt); const evaluated = time(input.evaluatedAt); const observed = time(snapshot.observedAt); const ingested = time(snapshot.ingestedAt); const targetTime = time(target.evaluationAt);
  if (![accepted, evaluated, observed, ingested, targetTime].every(Number.isFinite) || localDate(accepted) !== target.sessionDate || localDate(evaluated) !== target.sessionDate || localDate(targetTime) !== target.sessionDate || targetTime > accepted || accepted > evaluated || localTime(accepted) < "09:31:00" || localTime(accepted) >= "09:35:00" || localTime(evaluated) >= "09:35:00") throw new Error("C5_PRICE_WINDOW_INVALID");
  if (!snapshot.snapshotId || snapshot.security !== order.security || snapshot.market !== "CN_A" || snapshot.dataMode !== "FIXTURE" || snapshot.status !== "READY" || observed <= accepted || ingested < observed || ingested > evaluated || evaluated - observed > 60000) throw new Error("C5_PRICE_SNAPSHOT_INVALID");
  const price = units(snapshot.price); const reference = units(target.input.referencePrice);
  if (price === null || reference === null || price <= 0n || reference <= 0n || price % 100n !== 0n) throw new Error("C5_PRICE_PRECISION_INVALID");
  const difference = price >= reference ? price - reference : reference - price;
  if (difference * 10000n > reference * 100n) throw new Error("C5_PRICE_DEVIATION_EXCEEDED");
  const cents = price / 100n; const budget = cents * BigInt(order.quantity) + 500n;
  const decimal = (amount: bigint) => `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
  return { targetId, clientOrderId, snapshotId: snapshot.snapshotId, side: order.side as Direction, quantity: order.quantity, price: decimal(cents), fee: "5.00", budgetAmount: decimal(budget), quoteAgeSeconds: Math.floor((evaluated-observed)/1000), deviationBps: Number(difference*10000n/reference), observedAt: snapshot.observedAt };
}
