# V1.4 交易回测责任映射 A01

日期：2026-10-10。V1.4第2节六项要求完成服务主责/协作边界人工核对。结构化记录见[JSON](./2026-10-10-v1-v14-responsibility-a01.json)，SHA-256 `a1a6f0db8859a455204c20ccb1e87f50a8e7be4760a22d2592299991a1699392`。依据V1.4 Quant ownership design、Quant/Platform/Trade/Portfolio服务架构和当前阶段要求。

| 要求 | 主责 | 协作方 | 未关闭边界 |
|---|---|---|---|
| `V1.4-S2-L13` | quant-research-service | market-data-service supplies versioned data; platform-api-service owns the user TestRun projection | Quant owns BacktestRun/Manifest and immutable result hashes; Platform owns session, Web/API invocation and TestRun projection. The current ownership design is explicitly documented in architecture/services/v14-quant-backtest-ownership.md. |
| `V1.4-S2-L14` | quant-research-service | platform-api-service coordinates requests; Market Data supplies frozen input | Quant owns run-scoped daily replay clock and simulation engine for the fixed Fixture. This does not grant live data or active scheduling. |
| `V1.4-S2-L15` | quant-research-service for backtest-rule computation | trade-execution-service and portfolio-risk-service own independent Paper execution/ledger facts; platform-api-service orchestrates comparison | Fees/slippage/volume/T+1 are proven only for named fixed fixtures. Paper settlement and SELL-to-BUY parity remain blocked on OD-014; do not claim full market-rule equivalence. |
| `V1.4-S2-L16` | quant-research-service for simulated position availability and fixture settlement | trade-execution-service owns FakeBroker orders/fills; portfolio-risk-service owns account ledgers/settlement | Quant’s fixed engine tracks T+1 sellable quantity and fixture-session settlement. The independent Paper ledger requires separate service evidence; cross-market settlement calendar semantics are not approved. |
| `V1.4-S2-L17` | quant-research-service computes backtest metrics and associates fills | platform-api-service owns Web/TestRun result projection and acceptance assertions | Metrics/coverage exist for bounded simulations. This does not prove complete rule coverage or independent result correctness across all markets. |
| `V1.4-S2-L18` | quant-research-service separates Qlib research and execution replay models | platform-api-service links model/run identity; trade-execution-service and portfolio-risk-service provide Paper comparison facts | Same-input comparison exists for selected fixtures; Qlib/quant calculation vs FakeBroker/Portfolio persistent facts remains incomplete for settlement, all costs/markets, and full recovery. |

## 结论

- Quant Research owns V1.4 BacktestRun, fixed daily replay clock/engine, rule-cost computation, position availability and backtest metrics. Market Data supplies frozen versioned input; Platform owns session, scenario invocation and the user-visible TestRun/result projection.
- Trade Execution continues to own FakeBroker order/fill facts, and Portfolio Risk owns account/settlement ledgers. They are independent comparison sources, not Quant-owned data.
- OD-014 remains open. The fixed Quant Fixture settlement model does not authorize or prove Paper SELL-to-BUY settlement semantics; P4 parity remains OPEN.
- This responsibility map reduces ownership ambiguity only; it does not mark any V1.4 requirement complete or accepted.
