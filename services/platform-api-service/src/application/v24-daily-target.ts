import { createHash } from "node:crypto";
import { evaluateV24DailyDirection, V24_DAILY_DIRECTION_VERSION, type DailyDirectionInput } from "./v24-daily-direction.js";
import type { V24DailyTarget, V24DailyTargetRepository, V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";

/** Frozen approved candidate identity; changing the source requires a new candidate decision. */
export const V24_DAILY_DIRECTION_SHA256 = "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8";
export async function prepareV24FixtureDailyTarget(repository: V24DailyTargetRepository, scope: V24DailyTargetScope, input: DailyDirectionInput, fixtureSha256: string, dailyBarProvenance?: V24DailyTarget["dailyBarProvenance"], orderIdentity: "LEGACY_RUN" | "LOCAL_SESSION" = "LEGACY_RUN"): Promise<{ target: V24DailyTarget; created: boolean }> {
  if (!scope.ownerId.trim() || !scope.accountId.trim() || scope.namespace !== `v24-paper-v2-${scope.testRunId}` || !/^[a-f0-9]{64}$/u.test(fixtureSha256)) throw new Error("C5_DAILY_TARGET_SCOPE_INVALID");
  const decision = evaluateV24DailyDirection(input);
  const evaluationAt = input.clock.now().toISOString();
  const { clock: _clock, ...savedInput } = input;
  const targetId = `c5-target-${createHash("sha256").update(JSON.stringify([scope.ownerId, scope.accountId, scope.namespace, scope.testRunId, input.sessionDate, V24_DAILY_DIRECTION_SHA256])).digest("hex")}`;
  const target: V24DailyTarget = {
    ...scope, targetId, dataMode: "FIXTURE", strategyVersion: V24_DAILY_DIRECTION_VERSION, strategySha256: V24_DAILY_DIRECTION_SHA256,
    fixtureSha256, ...(dailyBarProvenance ? { dailyBarProvenance } : {}), sessionDate: input.sessionDate, evaluationAt, input: savedInput, decision,
    targetQuantity: decision.action === "BUY" ? 100 : decision.action === "SELL" ? 0 : decision.action === "HOLD" ? input.account.heldQuantity : null,
    clientOrderId: ["BUY", "SELL"].includes(decision.action) ? `v24-fixture-v2-${scope.testRunId}${orderIdentity === "LOCAL_SESSION" ? `-${input.sessionDate.replaceAll("-", "")}` : ""}` : null,
  };
  return repository.save(target);
}
