# V1.4 责任映射 A02

日期：2026-10-10。A31中V1.4第2/7/8节20条当前要求已人工核对主责与协作方。结构化明细见[JSON](./2026-10-10-v1-v14-responsibility-a02.json)，SHA-256 `68224ad255233d5f1b71c2de5e17ee6353ecf4eec5ab67a0c7594e115b6efeca`。本映射只厘清责任，不改变交付或验收状态。

| 要求 | 主责 | 协作方 |
|---|---|---|
| `V1.4-S2-L13` | quant-research-service | market-data-service supplies versioned data; platform-api-service owns the user TestRun projection |
| `V1.4-S2-L14` | quant-research-service | platform-api-service coordinates requests; Market Data supplies frozen input |
| `V1.4-S2-L15` | quant-research-service for backtest-rule computation | trade-execution-service and portfolio-risk-service own independent Paper execution/ledger facts; platform-api-service orchestrates comparison |
| `V1.4-S2-L16` | quant-research-service for simulated position availability and fixture settlement | trade-execution-service owns FakeBroker orders/fills; portfolio-risk-service owns account ledgers/settlement |
| `V1.4-S2-L17` | quant-research-service computes backtest metrics and associates fills | platform-api-service owns Web/TestRun result projection and acceptance assertions |
| `V1.4-S2-L18` | quant-research-service separates Qlib research and execution replay models | platform-api-service links model/run identity; trade-execution-service and portfolio-risk-service provide Paper comparison facts |
| `V1.4-S7-L61` | packages/contracts + Platform scenario/TestRun owner | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L62` | domain service owners (Quant, Market Data, Trade, Portfolio) | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L63` | apps/web + platform-api-service | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L64` | Platform/runbook and evidence owner | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L65` | shared test harness and domain owners | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L66` | domain service owners + operations owner | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L67` | project owner / human acceptor | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S7-L68` | Platform/stage documentation owner | Quant Research, Market Data, Trade Execution, Portfolio, Platform and project operator as applicable |
| `V1.4-S8-L72` | Platform/runbook and evidence owner | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |
| `V1.4-S8-L92` | stack scripts/operator | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |
| `V1.4-S8-L107` | apps/web + platform-api-service | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |
| `V1.4-S8-L123` | verify-stage/evidence-export scripts and domain owners | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |
| `V1.4-S8-L160` | domain owners plus operations recovery operator | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |
| `V1.4-S8-L168` | Platform acceptance records | Quant owns BacktestRun/results; Platform owns TestRun/Web; Trade and Portfolio own Paper execution and ledger facts; project operator owns host actions as applicable |

## 边界

V1.4仍`PARTIALLY_IMPLEMENTED`。全市场规则、费用与结算一致性、完整恢复、实际Ubuntu与本轮人工验收仍开放。映射不替代Quant与Paper逐笔同输入核对，也不构成用户签署。
