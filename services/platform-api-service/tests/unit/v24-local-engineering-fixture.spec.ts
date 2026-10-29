import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateV24DailyDirection } from "../../src/application/v24-daily-direction.js";
import { admitV24CandidateExecution } from "../../src/application/v24-candidate-execution-gate.js";

const root = resolve(import.meta.dirname, "../../../..");
const directory = resolve(root, "fixtures/v2/v2.4/c5-local-engineering-v1");
const bytes = readFileSync(resolve(directory, "input.json"));
const fixture = JSON.parse(bytes.toString("utf8"));
const manifest = JSON.parse(readFileSync(resolve(directory, "manifest.json"), "utf8"));
const cents4 = (value: string): bigint => BigInt(value.replace(".", ""));
const decimal = (value: bigint): string => `${value / 10000n}.${(value % 10000n).toString().padStart(4, "0")}`;

describe("C5 local engineering frozen multi-session input", () => {
  it("binds immutable synthetic input to the approved strategy and has ordered two-day lookbacks", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.files[0].sha256);
    expect(createHash("sha256").update(readFileSync(resolve(root, "services/platform-api-service/src/application/v24-daily-direction.ts"))).digest("hex")).toBe(fixture.strategySha256);
    expect(fixture.sessions.map((session: any) => session.date)).toEqual(["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-08", "2024-01-09", "2024-01-10"]);
    expect(fixture.sessions.slice(0, 2).every((session: any) => session.role === "WARMUP" && session.expected === null)).toBe(true);
    for (let i = 2; i < fixture.sessions.length; i += 1) expect(fixture.sessions[i].expected.priorDates).toEqual(fixture.sessions.slice(i - 2, i).map((session: any) => session.date));
  });

  it("independently checks BUY, SELL, HOLD and exact settled and pending cash expectations", () => {
    let settled = cents4(fixture.initialCash); let pending = 0n; let held = 0; let settlementDate: string | null = null;
    const actions: string[] = [];
    for (let i = 2; i < fixture.sessions.length; i += 1) {
      const session = fixture.sessions[i]; const expected = session.expected;
      if (settlementDate === session.date) { settled += pending; pending = 0n; settlementDate = null; }
      const prior = fixture.sessions.slice(i - 2, i);
      const decision = evaluateV24DailyDirection({ clock: { now: () => new Date(`${session.date}T09:31:00+08:00`) }, sessionDate: session.date, expectedPriorSessions: expected.priorDates, bars: prior.map((bar: any) => ({ securityId: fixture.securityId, sessionDate: bar.date, availableAt: bar.availableAt, close: bar.close })), account: { heldQuantity: held, sellableQuantity: held, settledCash: decimal(settled) }, mandate: { validFrom: fixture.mandate.validFrom, expiresAt: fixture.mandate.expiresAt, paused: false }, referencePrice: expected.referencePrice });
      expect(decision).toMatchObject({ action: expected.action, quantity: expected.quantity }); actions.push(decision.action);
      if (expected.snapshot) {
        expect(admitV24CandidateExecution({ acceptedAt: expected.snapshot.acceptedAt, evaluatedAt: expected.snapshot.evaluatedAt, referencePrice: expected.referencePrice, snapshot: { security: fixture.securityId, market: fixture.market, status: "READY", observedAt: expected.snapshot.observedAt, ingestedAt: expected.snapshot.ingestedAt, price: expected.snapshot.price } }).status).toBe("ELIGIBLE");
        const amount = cents4(expected.snapshot.price) * BigInt(expected.quantity); const fee = cents4(fixture.feePerFill);
        if (decision.action === "BUY") { settled -= amount + fee; held += expected.quantity; }
        if (decision.action === "SELL") { pending += amount - fee; held -= expected.quantity; settlementDate = expected.settlementDate; }
      } else expect(decision.action).toBe("HOLD");
      expect({ settled: decimal(settled), pending: decimal(pending), held }).toEqual({ settled: expected.settledCashAfterClose, pending: expected.pendingReceivableAfterClose, held: expected.heldAfterClose });
    }
    expect(actions).toEqual(["BUY", "SELL", "HOLD", "HOLD", "HOLD"]);
  });
});
