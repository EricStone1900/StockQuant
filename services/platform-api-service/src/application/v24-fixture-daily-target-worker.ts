import { prepareV24FixtureDailyTarget } from "./v24-daily-target.js";
import type { V24DailyTarget, V24DailyTargetRepository, V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";
import type { DailyDirectionInput } from "./v24-daily-direction.js";

type Account = { cash?: { amount?: string }; positions?: Array<{ security?: string; quantity?: number }> };

/**
 * The C5 target materializer is deliberately TestRun-scoped.  It can be moved
 * behind a worker later, but it never discovers accounts globally or makes an
 * execution decision.  A non-active Mandate is persisted as a PAUSED target.
 */
export class V24FixtureDailyTargetWorker {
  constructor(
    private readonly targets: V24DailyTargetRepository,
    private readonly readAccount: (accountId: string, ownerId: string) => Promise<Account>,
    private readonly loadFixture: () => Promise<{ input: Omit<DailyDirectionInput, "clock">; sha256: string }>,
  ) {}

  async materialize(input: { scope: V24DailyTargetScope; evaluatedAt: string; mandateStatus: "PENDING" | "ACTIVE" | "PAUSED" }): Promise<{ target: V24DailyTarget; created: boolean }> {
    if (!Number.isFinite(Date.parse(input.evaluatedAt))) throw new Error("C5_DAILY_TARGET_CLOCK_INVALID");
    const fixture = await this.loadFixture();
    const account = await this.readAccount(input.scope.accountId, input.scope.ownerId);
    const settledCash = account.cash?.amount;
    const position = account.positions?.find((item) => item.security === "600000.SH");
    const heldQuantity = position?.quantity ?? 0;
    const targetInput = {
      ...fixture.input,
      clock: { now: () => new Date(input.evaluatedAt) },
      account: { heldQuantity, sellableQuantity: heldQuantity, settledCash: settledCash ?? "" },
      mandate: { ...fixture.input.mandate, paused: input.mandateStatus !== "ACTIVE" },
    };
    const result = await prepareV24FixtureDailyTarget(this.targets, input.scope, targetInput, fixture.sha256);
    return { target: result.target, created: result.created };
  }
}
