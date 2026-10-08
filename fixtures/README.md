# Fixture 与确定性输入规范

状态：BASELINE_DEFINED / 业务验证 NOT_RUN。Fixture 只用于开发、回测和模拟验收，不代表真实行情、收益有效性或生产可用性。

## 目录与命名

```text
fixtures/manifests/              Manifest Schema
fixtures/v1/v1.1/                V1.1 账户初始化输入及 Manifest
fixtures/<version>/<stage>/      后续阶段固定输入
```

每个集合必须有唯一 `fixtureId` 和不可变 `fixtureVersion`。内容变化创建新版本，不原位修改已用于证据的版本。文件路径相对仓库根目录，Manifest 保存每个文件的 SHA-256。

## 数据分类

| dataMode | 含义 | 证据标签 |
|---|---|---|
| FIXTURE | 项目创建的确定性或合成输入 | SIMULATION_ONLY |
| RECORDED | 经许可保存的外部响应 | 标来源、采集时间、许可和适用用途 |
| REAL | 用户提供或 Provider 获取的真实数据 | 标市场、覆盖、修订、质量和许可 |

不得把 FIXTURE/RECORDED 宣称成真实在线组件。真实数据也不自动获得 `PRODUCTION_ELIGIBLE`；本轮不允许真实券商交易。

## 行情文件要求

后续日线/分钟文件必须明确：SecurityId 与历史 ticker 映射、market/venue、时区、币种、频率、RAW/复权口径、OHLCV 单位、barStart/barEnd/availableAt、停牌/缺失、公司行动、日历版本和数据来源。`SNAPSHOT`、`DAILY_BAR`、`MINUTE_BAR` 分开存储，禁止用稀疏快照伪造分钟 Bar。

用于模型的数据必须覆盖因子预热、训练/验证/测试及标签窗口。历史股票池保留当时成分和退市样本，不能用今日在线监控池替代。

## 场景可复现性

每个场景固定输入、规则版本、Clock、seed、故障计划和预期断言。并发故障还要保存实际注入顺序；seed 不能替代事件序列。重新运行创建新 testRunId/namespace，但引用相同 Fixture 版本和 Hash。

预期结果至少覆盖金额、币种、数量、账本条目数、订单/成交状态、拒绝原因和无副作用断言。研究浮点容差必须在运行前冻结；资金和数量使用精确十进制比较。

## 来源、许可与隐私

Manifest 必须记录来源种类、说明、许可/授权和采集时间。`RECORDED`/`REAL` 数据必须附 `source.authorizationRef`（仓库内许可/授权记录路径）、对应的 `source.authorizationSha256`、`source.authorizedUse`（仅 `RESEARCH` 和/或 `SIMULATION`）及非空 `source.retrievedAt`；`pnpm fixtures:check`会检查授权记录存在且哈希匹配。Fixture 必须标 `SYNTHETIC`。`PRODUCTION_ELIGIBLE` 只能用于带授权引用的 `REAL` 数据，仍不代表允许真实券商交易。用户文件标 `USER_PROVIDED`，不推断转授权。新闻正文和供应商原始数据只按许可留存；凭据、真实账户标识和个人信息不得进入 Fixture。

## V1.1 基线

[账户初始化输入](./v1/v1.1/accounts.json)固定两个独立的空仓 Paper 账户模板：CN 10000.00 CNY、US 10000.00 USD，均只连接 FakeBroker。每次运行由服务生成新的 accountId；`fixtureAccountRef` 不是业务账户 ID。

期望每个账户只有一笔期初流水，重复相同幂等请求十次后金额和流水数不变；同键异载荷必须拒绝且无副作用。完整场景仍需后端、真实 PostgreSQL、Web 和 CLI 实现后才能冻结为可执行验收。

## V1.3 双市场交易链

[`v1/v1.3/manifest.json`](./v1/v1.3/manifest.json) 冻结 [`v1.3-trading-loop` 1.0.0 场景输入](./v1/v1.3/trading-loop-scenarios.json)，包含 CN_A/CNY 与 US_EQUITY/USD 的合成订单输入、精确现金/持仓预期、CN Fixture Session 推进、UNKNOWN 查询恢复与成交序号故障顺序。输入文件 SHA-256 为 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`。V1.3 Web从该文件读取seed、市场证券、订单数量/币种及AUTO Mandate预算；E2E以Manifest Hash核对并从同一 Fixture 读取预期断言。此Fixture为纯模拟输入，不代表真实行情、市场日历完整性、真实费用或券商行为；更改输入必须升新版本并更新Manifest。

## V1.5 双市场 NO_TRADE 日历

`v1/v1.5/no-trade-calendar-manifest.json` 冻结 `v1.5-no-trade-calendar-1`：CN_A 与 US_EQUITY 各60个按市场本地时区排序的日期型虚拟交易日；日程排除冻结的2026交易所假日规则，不含开收市时刻、Security、OHLCV、成交或真实行情。V1.5 Temporal E2E 对每个日期分别读取持久 Portfolio 账户与独立 FakeBroker 对账事实；NO_TRADE 执行完成后继续断言零订单/Fill、资金/持仓不变。该小样本仅满足本轮虚拟HOLD场景，不代表交易所完整日历、真实观察窗口、行情覆盖或生产调度。更新日历必须创建新 Fixture 版本。

## V3.2 研究侧验证 sidecar

`packages/contracts/fixtures/v3.2-data-manifest-fixture-v1.json` 与 `packages/contracts/fixtures/v3.2-validation-plan-fixture-v1.json` 是契约形状样例，不是行情数据或已完成的验证证据。验证计划用数据 Manifest 原始 UTF-8 字节的 SHA-256 建立绑定；任何内容变更都必须生成新版本及新 Hash。Runner输入包中的 `dataContentSha256` 定义为：排除两个sidecar后，对其余`data/`文件按ASCII相对路径字节序排列，生成`[{path,sha256}]` JSON UTF-8字节，再取SHA-256。每个文件Hash直接从原始字节计算。验证计划还声明`candidateOutputPath`、`generatedCodeOutputPath`和`metricsOutputPath`；PromotionRequest构造器以Runner Job ID、fencing sourceRef及路径派生artifactId核实角色对应的实际OUTPUT产物。这个输入包校验不能替代对数据来源、授权、市场覆盖或时间可用性的独立验证；来源、许可、时间范围和数据版本须与候选及TestRun同时固定。

## 校验与发布

基础 JSON 语法检查由 `pnpm contracts:check` 执行，Manifest 文件存在性与 SHA-256 重算由 `pnpm fixtures:check` 执行。V1.1 仍需实现 JSON Schema 实例校验、引用解析、TS/Python 往返和兼容性检查；缺少任何一项不得将阶段契约任务标为完成。

V3.2另有可复算开发输入 [`v3.2-independent-validation-v1`](./v3/v3.2-independent-validation-v1/manifest.json)：两只合成A股、每只180个weekday sessions的日线，以及固定SMA交叉候选和PIT/OOS/成本/容量验证设计。市场日历、公司行动、退市证券和收益能力均未建模；数据仅`RESEARCH_ONLY`。它是独立复算实现的冻结测试输入，不是实测报告或真实市场证据。`pnpm fixtures:check`同时核对Manifest文件Hash与确定性生成器输出；内容变化应另建新版本，不覆盖此版本。

The fixed-fixture reference calculator is `pnpm --filter @stockquant/quant-research-service v32:fixture-recompute`; the V3.2 code suite runs it automatically. It produces an in-memory `FIXTURE` report from a separately implemented allowlisted SMA reference and does not execute candidate source or persist a business TestRun. `ELIGIBLE_FOR_REVIEW` in that output is a deterministic fixture assertion only; it is not a real-candidate V3.2 acceptance.

## V3.3 研究编排场景输入

[`v3.3-research-orchestration-1`](./v3/v3.3-research-orchestration-v1/manifest.json) freezes deterministic `normal`, `rejection`, and `recovery` inputs, integer-cent budgets, expected ledger/job/artifact outcomes, and the ordered recovery fault sequence. Its scenario-plan instance is checked with [`v3.3-research-orchestration-scenarios.schema.json`](./manifests/v3.3-research-orchestration-scenarios.schema.json); this Fixture-only schema does not generate service DTOs. The data is synthetic orchestration metadata only: it contains no market data, recorded model response, credentials, or provider permission. On 2026-10-06 the isolated V3.3 code suite and cross-service Platform/Research Automation/Runner workflow verified normal settlement, rejection with zero side effects, and checkpoint recovery; see [`V3.3 full code suite audit`](../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.md). Those Fixture results are runtime evidence only for the isolated workflow. They do not establish real RD-Agent/provider behavior, Paper continuity, Ubuntu acceptance, external data authorization, or human acceptance. Changes require a new fixture version and updated SHA-256 manifest.

## V1.4 合成停牌与限制价用例

`v1/v1.4/market-restrictions-manifest.json` 冻结了一组独立的 `SIMULATION_ONLY` 合成输入，包含显式 `trading_status` 与 Fixture 定义的上下限价四个确定性用例。当前只用于验证 Quant 域规则辅助函数：停牌拒绝、整根 OHLC 锁在上限时拒绝 BUY、整根 OHLC 锁在下限时拒绝 SELL。原有日线收盘价/成交量 Fixture 保持不变。该输入不是交易所行情，不按证券类别/生效日期推导涨跌幅，也不能证明盘中排队位置或真实成交；并已连接Quant Fixture API、正式Web选择器及同一TestRun的CLI `--check-only`路径；隔离HTTP/PG/Web端到端验收尚待通过，这也不构成真实交易所规则验收。

## V1.4 合成公司行动用例

`v1/v1.4/corporate-actions-manifest.json` 冻结`v1.4-corporate-actions-1`，包含五个`600000.SH` RAW close及拆股/现金分红事件文件。账务用例先以200000分买100股×1000分；2024-01-04按2:1拆股变为200股且不产生现金；2024-01-05每股10分分红按200股确认2000分应收，RAW价格从500分到490分；2024-01-08支付后应收转现金。每个交易日NAV应为200000分。分红事件重复投递同一actionId，必须只记一次。价格文件绝不回填复权价，本Fixture为合成会计断言，不代表真实公司行动、除权规则或税务处理。

## V2.3 锁版 Qlib 拟合输入

`v2/v2.3/qlib-fit/manifest.json` 冻结了 `qlib-fit-input.json`（120行、5个合成特征、合成标签与逐行时间可用性，训练/验证/测试切分为 `[0,72)`/`[72,96)`/`[96,120)`）。Platform TestRun 直接读取该文件并在使用前重算 Manifest SHA-256。该 Fixture 只用于验证锁版 Qlib 训练、预测及时间切分拒绝路径；不是行情/收益数据、真实市场 PIT 证据或独立模型验证。
