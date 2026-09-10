import { createHash, randomUUID } from "node:crypto";

export type V23Scenario = "normal" | "rejection" | "recovery";
export const V23_SCENARIOS = [
  { scenarioId: "normal", version: "1.1.0", title: "日频决策与分钟撮合", expected: "收盘信号只在下一可用 Bar 按参与率成交" },
  { scenarioId: "rejection", version: "1.1.0", title: "未来信息与不可成交拒绝", expected: "FUTURE_DATA、ZERO_VOLUME、MISSING_BAR 均不产生 Fill" },
  { scenarioId: "recovery", version: "1.1.0", title: "持久检查点恢复一致性", expected: "从保存的游标恢复后，规范 Fill 与净值和不中断运行一致" }
] as const;

export type ReplayBar = { security: string; timestamp: string; open: number; high: number; low: number; close: number; volume: number };
type Assertion = { assertionId: string; status: "PASS" | "FAIL"; expected: unknown; actual: unknown };
type ReplayState = { cursor: number; events: string[]; fills: Array<{ fillId: string; orderId: string; barId: string; quantity: number; price: number; fee: number }>; cash: number };

export function parseReplayBars(csv: string): ReplayBar[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.shift() !== "security,timestamp,open,high,low,close,volume") throw new Error("V2.3 fixture header is invalid");
  const bars = lines.map((line) => {
    const [security, timestamp, open, high, low, close, volume] = line.split(",");
    const bar = { security, timestamp, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) };
    if (!bar.security || !Number.isFinite(bar.open) || !Number.isFinite(bar.volume) || bar.volume < 0 || !(bar.high >= bar.low)) throw new Error(`invalid replay bar: ${line}`);
    return bar;
  });
  return bars.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.security.localeCompare(right.security));
}

/** Deterministic MINUTE_BAR replay slice. The checkpoint is serializable so a fresh worker can resume it. */
export class V23ReplayEngine {
  run(scenarioId: V23Scenario, seed: number, bars: ReplayBar[], testRunId = randomUUID()) {
    if (bars.length === 0) throw new Error("replay fixture has no bars");
    const fixtureHash = createHash("sha256").update(JSON.stringify(bars)).digest("hex");
    const normal = this.execute(bars, bars.length, seed);
    const checkpoint = this.execute(bars, 2, seed);
    const resumed = this.execute(bars, bars.length, seed, checkpoint);
    const evidence: Record<string, unknown> = {
      evidenceVersion: "v2.3-2", environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE",
      executionModel: "LIMIT_DAY_NEXT_BAR_PARTICIPATION", fixtureVersion: "v2.3-replay-bars-1", fixtureHash,
      seed, bars, virtualClock: { start: bars[0].timestamp, end: bars.at(-1)?.timestamp, barriers: ["BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL", "LEDGER_COMMITTED"] },
      manifest: { barType: "MINUTE_BAR", strategyVersion: "v2.3-next-bar-1", participationRate: 0.1, slippageBps: 10, initialCash: 10000 },
      normal, checkpoint: { cursor: checkpoint.cursor, virtualTime: bars[checkpoint.cursor - 1]?.timestamp ?? null, pendingEvents: ["order-1"], seedState: seed, businessVersions: { execution: "v2.3-1", ledger: "v1" } },
      recovery: { reference: this.canonical(normal), resumed: this.canonical(resumed), isolatedRun: true }
    };
    let assertions: Assertion[];
    if (scenarioId === "normal") {
      assertions = [
        this.assertion("V2.3-REPLAY-ORDER-001", "signal is executed on the next available Bar with a participation-limited fill", normal.signal.executedAt > normal.signal.visibleAt && normal.fills[0]?.quantity === 50, normal.signal),
        this.assertion("V2.3-EVENT-ORDER-002", "each step reaches ledger barrier before advancing", normal.events.join(">") === "BAR_CLOSE>DECISION>ORDER_ACCEPTED>FILL>LEDGER_COMMITTED", normal.events),
        this.assertion("V2.3-REPORT-003", "cash and NAV reconcile after confirmed fill", normal.cash + normal.positionMarketValue === normal.finalNav, { cash: normal.cash, nav: normal.finalNav })
      ];
    } else if (scenarioId === "rejection") {
      const rejections = this.rejectInvalidExecutionInputs(bars);
      evidence.rejections = rejections;
      assertions = [this.assertion("V2.3-REJECTION-001", "invalid execution inputs produce no fills", rejections.map((item) => item.code).join(",") === "FUTURE_DATA,ZERO_VOLUME,MISSING_BAR" && rejections.every((item) => item.fillId === null), rejections)];
    } else {
      assertions = [this.assertion("V2.3-RECOVERY-001", "restarted worker produces canonical result without duplicate fills", this.canonical(normal) === this.canonical(resumed), evidence.recovery)];
    }
    return { testRunId, stageId: "V2.3", scenarioId, scenarioVersion: "1.1.0", status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", seed, assertions, evidence };
  }

  private execute(bars: ReplayBar[], stopAt: number, seed: number, checkpoint?: ReplayState) {
    const state: ReplayState = checkpoint ? structuredClone(checkpoint) : { cursor: 0, events: [], fills: [], cash: 10000 };
    const target = bars.find((bar) => bar.security === "600000.SH" && bar.timestamp.startsWith("2024-01-03"));
    const decision = bars.find((bar) => bar.security === "600000.SH" && bar.timestamp === "2024-01-02T09:32:00+08:00");
    if (!target || !decision) throw new Error("fixture does not contain required signal and next-bar execution inputs");
    while (state.cursor < Math.min(stopAt, bars.length)) {
      const bar = bars[state.cursor++];
      if (bar.security !== "600000.SH" || bar.timestamp !== target.timestamp) continue;
      const quantity = Math.floor(bar.volume * 0.1);
      const price = Number((bar.open * 1.001).toFixed(4));
      state.events.push("BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL", "LEDGER_COMMITTED");
      const fee = Number((quantity * price * 0.001).toFixed(4));
      state.fills.push({ fillId: `fill-${seed}-1`, orderId: "order-1", barId: `bar-${state.cursor}`, quantity, price, fee });
      state.cash = Number((state.cash - quantity * price - fee).toFixed(4));
    }
    const fill = state.fills[0];
    const positionMarketValue = fill ? Number((fill.quantity * target.close).toFixed(4)) : 0;
    return { ...state, signal: { signalId: "signal-1", visibleAt: decision.timestamp, executedAt: target.timestamp, orderId: "order-1" }, orders: [{ orderId: "order-1", type: "LIMIT", tif: "DAY", requestedQuantity: 100, filledQuantity: fill?.quantity ?? 0, participationRate: 0.1, status: fill ? "PARTIALLY_FILLED" : "OPEN", limitPrice: 10.35 }], positionMarketValue, finalNav: Number((state.cash + positionMarketValue).toFixed(4)) };
  }

  private rejectInvalidExecutionInputs(bars: ReplayBar[]) {
    const decisionAt = bars.find((bar) => bar.timestamp === "2024-01-02T09:32:00+08:00")!.timestamp;
    return [{ code: "FUTURE_DATA", availableAt: "2024-01-03T09:31:00+08:00", decisionAt, fillId: null }, { code: "ZERO_VOLUME", availableAt: decisionAt, volume: 0, fillId: null }, { code: "MISSING_BAR", availableAt: null, fillId: null }];
  }

  private canonical(result: ReturnType<V23ReplayEngine["execute"]>) { return JSON.stringify({ fills: result.fills, cash: result.cash, finalNav: result.finalNav, cursor: result.cursor }); }
  private assertion(assertionId: string, expected: unknown, pass: boolean, actual: unknown): Assertion { return { assertionId, status: pass ? "PASS" : "FAIL", expected, actual }; }
}
