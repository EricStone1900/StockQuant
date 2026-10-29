import { GeneratedV24LocalPriceFactsClient } from "../contracts/generated-v24-local-price-facts-client.js";
import { resolveV24LocalPriceEvidence, type LocalScope } from "../application/v24-local-price-evidence.js";

/** Read-only evidence bridge; this does not activate a Mandate, reserve budget or submit an order. */
export async function readV24LocalPriceEvidence(input: { platformUrl: string; governanceToken: string; scope: LocalScope; targetId: string; clientOrderId: string; evaluatedAt: string; request?: typeof fetch }) {
  const client = new GeneratedV24LocalPriceFactsClient(input.platformUrl, input.governanceToken, input.request);
  const facts = await client.read({ ...input.scope, targetId: input.targetId, clientOrderId: input.clientOrderId, evaluatedAt: input.evaluatedAt });
  if (!facts || facts.selection?.status !== "SELECTED" || !facts.selection.planId || !facts.selection.taskId || !facts.selection.observation || !facts.selection.observation.observedAt || !facts.selection.observation.ingestedAt) throw new Error("C5_PRICE_FACTS_UNAVAILABLE");
  const observation = facts.selection.observation;
  return resolveV24LocalPriceEvidence({
    readTarget: async () => facts.target,
    readOriginalIntent: async () => facts.intent,
    readFirstEligibleSnapshot: async () => ({ ...input.scope, clientOrderId: input.clientOrderId, snapshotId: observation.snapshotId, security: observation.securityId, market: "CN_A", dataMode: observation.dataMode, status: observation.status, price: observation.price, observedAt: observation.observedAt!, ingestedAt: observation.ingestedAt! }),
  }, { scope: input.scope, targetId: input.targetId, clientOrderId: input.clientOrderId, evaluatedAt: input.evaluatedAt });
}
