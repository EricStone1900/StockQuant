import { createHash } from "node:crypto";
import type { AutoMandateRepository } from "../ports/auto-mandate-repository.js";
import { readV24LocalPriceEvidence } from "../adapters/v24-local-price-facts-client.js";

const STRATEGY_SHA256 = "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function stableUuid(hex: string): string {
  const value = `${hex.slice(0, 12)}5${hex.slice(13, 16)}8${hex.slice(17, 20)}${hex.slice(20, 32)}`;
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

/** Builds an order authorization only from persisted local facts, then atomically reserves the exact derived budget. */
export async function authorizeV24LocalPriceOrder(input: {
  platformUrl: string; governanceToken: string; mandates: AutoMandateRepository;
  mandateId: string; mandateVersion: number; ownerId: string; accountId: string; namespace: string; testRunId: string;
  targetId: string; clientOrderId: string; evaluatedAt: string; request?: typeof fetch;
}) {
  if (!input.mandateId || !Number.isSafeInteger(input.mandateVersion) || input.mandateVersion < 1) throw new Error("C5_LOCAL_MANDATE_REQUIRED");
  const evidence = await readV24LocalPriceEvidence({ platformUrl: input.platformUrl, governanceToken: input.governanceToken,
    scope: { ownerId: input.ownerId, accountId: input.accountId, namespace: input.namespace, testRunId: input.testRunId },
    targetId: input.targetId, clientOrderId: input.clientOrderId, evaluatedAt: input.evaluatedAt, request: input.request });
  const mandate = await input.mandates.find(input.mandateId, input.ownerId, input.testRunId);
  if (!mandate || mandate.mandateVersion !== input.mandateVersion || mandate.status !== "ACTIVE" || mandate.accountId !== input.accountId || mandate.strategyVersion !== STRATEGY_SHA256 || mandate.market !== "CN_A" || mandate.currency !== "CNY") throw new Error("C5_LOCAL_MANDATE_SCOPE_INVALID");
  const facts = { mandateId: input.mandateId, mandateVersion: input.mandateVersion, ownerId: input.ownerId, testRunId: input.testRunId,
    accountId: input.accountId, targetId: evidence.targetId, clientOrderId: evidence.clientOrderId, snapshotId: evidence.snapshotId,
    strategyVersion: STRATEGY_SHA256, side: evidence.side, quantity: evidence.quantity, limitPrice: evidence.price, estimatedFee: evidence.fee };
  const proposalId = stableUuid(digest(["C5_LOCAL_PROPOSAL", facts]));
  const proposal = { proposalId, proposalVersion: 1, contentHash: digest(facts), ownerId: input.ownerId, testRunId: input.testRunId,
    accountId: input.accountId, strategyVersion: STRATEGY_SHA256, operation: "REBALANCE" as const, market: "CN_A" as const,
    currency: "CNY" as const, legs: [{ securityId: "600000.SH", side: evidence.side, quantity: evidence.quantity, limitPrice: evidence.price, estimatedFee: evidence.fee }] };
  const commandHash = digest([facts, input.evaluatedAt]);
  const result = await input.mandates.authorizeOrder({ mandateId: input.mandateId, mandateVersion: input.mandateVersion, ownerId: input.ownerId,
    clientOrderId: input.clientOrderId, commandHash, proposal, now: input.evaluatedAt });
  return { ...result, proposal, priceEvidence: evidence, commandHash, evaluatedAt: input.evaluatedAt };
}
