# 双市场规则、核心模型与通信契约

版本2.0，2026-09-06。供新项目S0直接冻结Schema使用，配套[PRD](./00-product-requirements.md)和[架构](./02-system-architecture.md)。以下模型是目标协议，不依赖已存在代码。

## 1. 双市场规则矩阵

本轮补充契约以[三版共同规则](./05-three-version-delivery.md)第3～7节为准，阶段落地前生成Schema：TestScenario/TestRun/TestAssertion/AcceptanceRecord、按运行隔离Clock、MinuteBar/ReplayManifest/检查点、SimulationExecutionPolicy及故障计划。新增对象不改变本文件订单/账本/授权事实所有权。

环境模式仍为BACKTEST/PAPER/SHADOW/LIVE；FIXTURE属于数据来源，FAKE属于brokerMode，MANUAL_APPROVAL属于授权模式，不混入environmentMode。旧文字LOCAL_SIM作为本地模拟环境描述，MANUAL不作为新的环境枚举。三版配置只启用BACKTEST/PAPER及有明确定义的SHADOW模拟比较，LIVE和真实券商调用均拒绝。

执行模型分别记录DAILY_BAR/MINUTE_BAR/SNAPSHOT。免费快照模拟使用独立SimulationExecutionPolicy，不放宽将来LIVE的ExecutionPolicy；不把20～30分钟快照拼成分钟Bar，不从完整Bar提前获得成交量或VWAP。订单及Fill额外关联run/namespace，幂等与权限范围跨服务一致。

| 维度 | A股 | 美股 | 系统实现 |
|---|---|---|---|
| 市场标识 | CN_A，沪深venue | US_EQUITY，NYSE/Nasdaq等venue | market与venue分别字段，不用币种推断市场 |
| 时区 | Asia/Shanghai | America/New_York | UTC持久化，IANA时区生成会话 |
| 日历 | 中国交易日、午休、板块/时段规则 | 美国交易日、节假日、提前收盘、夏令时 | 交易日历和结算日历可分别版本化 |
| 默认范围 | 普通股票、账户允许板块 | 普通股票、整股 | 未配置证券类型拒绝，不自动含ETF/ADR/OTC |
| 卖出资格 | 按证券/批次可卖与交易限制判断 | 按账户、已付款/持仓及券商规则判断 | 不共用一个固定T+1可卖公式 |
| 资金 | CNY可用/冻结/清算口径 | USD已结算/未结算/购买力口径 | 内部与券商双校验，默认已结算资金买入 |
| 价格/数量 | 板块、类型、上市阶段决定限制 | 券商/证券/会话决定价格与数量能力 | MarketRuleSet+BrokerCapability交集 |
| 市场中断 | 停复牌/价格限制/临时停市 | Trading halt/LULD等适用限制 | 状态未知禁止新委托；无行情不等于未涨跌停 |
| 委托时段 | 默认常规交易，其他另准入 | 默认常规时段，盘前盘后隔夜关闭 | 会话类型是授权的一部分 |
| 费用与税 | 佣金、税费和其他适用费用 | 佣金、监管/交易费用、预扣税等 | 方向、市场、生效日期、币种版本化，不写死费率 |

美国大多数券商证券交易的标准结算周期自2024年5月28日起为T+1，但结算周期不是统一的持仓卖出等待规则，现金账户仍需符合付款约束。[SEC结算规则FAQ](https://www.sec.gov/exams/educationhelpguidesfaqs/t1-faq)、[Investor.gov现金账户说明](https://www.investor.gov/introduction-investing/investing-basics/glossary/cash-account)

NYSE常规核心交易时段为美国东部时间9:30～16:00，另有节假日和提前收盘安排。系统使用IANA时区和日历，不将时间换算为固定北京时间。[NYSE交易日历](https://www.nyse.com/trade/hours-calendars)

A股规则需覆盖交易方式、申报量、板块差异及生效时间；自动交易接入还需核实券商权限及适用程序化交易管理/报告要求，低频不能作为自动豁免假设。[上交所2026年交易规则](https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/exchange/c/c_20260424_10816482.shtml)、[上交所程序化交易管理说明](https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20250403_10776805.shtml)

上述官方链接是核验入口，不是完整规则数据集。每个启用market/venue/板块都必须保存当时有效规则与券商确认；未核实部分在配置中标UNVERIFIED并阻断执行，不能以文档日期代替上线日期检查。

## 2. 基础值对象

| 类型 | 必需字段/约束 |
|---|---|
| Security | securityId UUID、market、listingVenue、instrumentType、quoteCurrency、历史ticker及生效区间；券商映射单独存 |
| Money | amount Decimal字符串、currency ISO代码；同币种才能直接相加 |
| Quantity | Decimal字符串；按Capability验证整数/碎股/最小量/递增单位；默认整股 |
| Price | Decimal字符串、currency、priceType（RAW/ADJUSTED/BID/ASK/LAST等）、source、availableAt |
| Time | UTC ISO-8601，必须带时区；businessDate配market和calendarVersion |
| ArtifactRef | artifactId、uri、sha256、schemaVersion、mediaType、byteSize、accessScope |
| DataQuality | quality PASS/WARN/FAIL、usageEligibility SIMULATION_ONLY/RESEARCH_ONLY/PRODUCTION_ELIGIBLE、缺失覆盖和原因 |
| Freshness | observedAt、availableAt、validUntil、source、sourceStatus、maxAgePolicyVersion |

计算禁止二进制浮点处理资金，金额舍入按币种/费用项规则；数量舍入只能在策略到执行计划转换时进行并重算风险。研究因子可使用数值数组，但规范化精度和排序后生成canonicalContentHash，文件SHA-256独立验证完整性。

## 3. 时间与双市场PIT

所有数据包含occurredAt（发生）、publishedAt（公开）、ingestedAt（入库）、availableAt（允许可见）中适用字段。财务数据另含periodEnd、revision、supersedes。策略查询必须availableAt≤decisionAsOf且依赖当时有效的证券/行业成分、规则和策略版本。

跨市场EvidenceManifest按统一UTC decisionAsOf过滤，每个输入附market和其本地业务日期。A股开盘时不能读取尚未发布的美股当日收盘，反向同理。跨市场汇总显示“最新已知”时必须标明各自asOf，不伪装同步收盘。

日期级公告无精确时刻时采用来源市场下一可交易时点的保守策略并版本化。历史研究中“公开可得”的回填数据与真实系统当时已采集数据分开命名，回测不能作为实际历史决策的伪证据。

SettlementDate由对应结算日历计算，不简单加24小时。美股夏令时切换以Calendar计算UTC时段，不能让任务重复。错过交易窗口的任务记录MISSED_WINDOW并重评或等待下一窗口，禁止原单直接补发。

## 4. 核心实体与关系

| 实体 | 必需字段与约束 |
|---|---|
| Account | accountId、brokerId、externalAccountRef、marketCapabilities、accountType、baseCurrency、mode、ownerId、status；敏感外部标识脱敏 |
| Portfolio | portfolioId、accountId、market、strategyDeploymentIds、allocationPolicyVersion；初版单市场 |
| StrategyDeployment | deploymentId、strategyId/version、parameterHash、market、universeVersion、decisionMode、requiredEvidencePolicy、effectiveFrom/To |
| MarketRuleSet | ruleSetId/version、market/venue/board/type、有效区间、交易/结算规则、sourceRef、verificationStatus |
| BrokerCapability | accountId、version、支持市场/会话/订单、数量精度、clientOrderId能力、query/cancel/fills、购买力/费用口径、验证时间 |
| DataVersion | versionId、market、calendarVersion、coverage、sourceVersions、Artifact列表、质量用途、publishedAt |
| PortfolioSnapshot | snapshotId、account/portfolio/market、asOf、ledgerVersion、cashByCurrency、positions、settlementRefs、valuationDataRefs |
| TradeProposal | proposalId、proposalVersion、parentVersion、portfolio/account/market/mode、HOLD或REBALANCE、reason、legs、策略与证据引用、有效期、contentHash |
| RebalanceLeg | legId、securityId、side、quantity或目标权重、priceConstraint、currency；执行前必须形成确定数量与价格约束 |
| RiskEvaluation | evaluationId、proposalVersion、contentHash、ledgerVersion、riskPolicyVersion、MarketRuleSet/Capability版本、before/projectedAfter、中间路径、PASS/REJECT、validUntil |
| BudgetReservation | reservationId、portfolio/account/market/tradingDate、limitPolicyVersion、proposalVersion、batchNumber、状态 |
| ResourceReservation | id、accountId、currency/security占用、ledgerVersion、proposalVersion、contentHash、费用缓冲、状态 |
| RebalanceBatch | batchId、proposalVersion、account/market/mode、authorizationId、budget/resource引用、全Leg Hash、状态 |
| Order | orderId、intentId、batchId、clientOrderId、brokerOrderId、market/venue、session、side、quantity、limitPrice、timeInForce、状态 |
| Fill | fillId、externalFillId、原始回报Hash、account/batch/order/intent、增量数量、price、currency、fees、occurredAt、availableAt、来源 |
| LedgerEntry | entryId、account/portfolio、currency/security、type、增减量/金额、effectiveAt、availableAt、sourceRef、reversesEntryId、ledgerVersion |
| ReconciliationCase | caseId、账户/市场、差异类型、券商证据、内部版本、金额/数量差、处理人与理由、状态 |

订单接受与Fill不能以空响应或超时推断。fillId全局稳定，外部成交号还需broker/account命名空间；累计转增量要持久保存累计高水位和原始报告，券商修订累计值下降必须走纠错而不是记负Fill。

## 5. AutomationMandate与执行授权

AutomationMandate至少包含：

```text
mandateId, version, ownerId, approvalRecordId
accountId, portfolioId, market, environmentMode
strategyDeploymentId, strategyVersion, parameterHash
securityScopeRef, securityScopeHash
allowedReasons, allowedSessions, allowedOrderTypes
maxOrderNotional, maxBatchNotional, maxDailyTurnover
maxDailyBatches, minimumCash, maxExposure, drawdownStop
executionPolicyVersion, riskPolicyVersion, exceptionAction
effectiveFrom, expiresAt, status, contentHash
```

所有限额带币种或明确比例单位。证券范围可以引用已批准股票池规则版本；不能批准浮动无界“全部最新股票”。当前成员变化须满足批准规则及风险要求，规则本身变化需新Mandate。策略参数、账户、市场、规则引用发生不兼容变更，旧Mandate不能授权新内容。

ExecutionAuthorization是每个批次的短期授权，至少含authorizationId、来源MANUAL/AUTO_POLICY、approvalRecordId或mandateId/version、完整Proposal/Leg Hash、account/market/mode、riskEvaluationId、riskPolicyVersion、ledgerVersion、budgetReservationId、resourceReservationId、executionPolicyVersion、validFrom/Until、revocationEpoch。

执行服务向权威治理服务校验授权与撤销状态；不能信任调用者自己签的Hash或自填批准布尔值。治理还须从组合服务确认占用和风险状态。token缓存只有在固定有效期与撤销策略允许时可用；过期或无法验证拒绝新发送。

ExecutionPolicy包括：报价类型与许可、maxQuoteAgeSeconds、maxAccountAgeSeconds、最大价差/偏离、费用缓冲、限价形成方法、最大参与率、最大等待/撤改次数、仅允许会话、过时作业规则、未知结果处理和暂停语义。真实值必须按市场/券商验证，不使用研究10分钟轮询阈值。

## 6. 状态机与并发语义

### 6.1 策略和自动运行

策略版本：DRAFT→VALIDATING→VALIDATED→APPROVED→ACTIVE，分支REJECTED/SUSPENDED/RETIRED。验证报告不可仅靠状态字段伪造。

Mandate：DRAFT→APPROVED→ACTIVE→PAUSED/EXPIRED/REVOKED。PAUSED恢复须本人授权或预先批准且确定性可核验的恢复条件；因资金/权限/对账错误暂停默认人工确认，不能自恢复。失效/撤销是终止原版本资格，需要新版本才能重新授权。

自动运行资格还需策略ACTIVE、通道健康、账户/报价新鲜、未暂停、无阻塞对账差异。界面“ACTIVE”只表示Mandate有效，不等于每次订单都会被风控放行。

### 6.2 建议

```text
DRAFT → EVIDENCE_VALIDATED
  → [仅当策略要求：REVIEW_PENDING → REVIEW_PASSED]
  → HARD_RISK_PASSED
  → MANUAL_APPROVAL_PENDING → APPROVED_MANUAL
  或 AUTO_POLICY_EVALUATING → APPROVED_AUTO
  → AUTHORIZED → DISPATCHING → ACCEPTED
```

HOLD转RECORDED_HOLD，legs必须为空。拒绝、证据不足、过期、替代有独立终止/阻塞状态。人工或Agent修改生成新proposalVersion，复核（若必需）、硬风控、授权全部重跑。批准不等于最终可发送，发送前按授权再次校验。

### 6.3 次数、资源与批次

次数预算：RESERVED→DISPATCHING→CONSUMED，权威执行确认未接受可RELEASED。执行接受即业务上计次数，治理若暂未收到接受事件，DISPATCHING也占额度，避免并发超限。

资源：RESERVED→DISPATCHING→IN_FLIGHT→SETTLED；明确未接受或终态剩余风险为零时RELEASED/部分释放。部分成交按增量结算已用资源，余量继续占用；UNKNOWN不按TTL直接释放。

执行批次：ACCEPTED→IN_PROGRESS/PARTIALLY_FILLED→COMPLETED/CANCELLED/EXPIRED/FAILED；结果不确定UNKNOWN。单订单另有SUBMITTED、ACCEPTED、PARTIALLY_FILLED、FILLED、CANCEL_PENDING、CANCELLED、REJECTED、UNKNOWN。父状态从子订单和事实聚合，不允许任意PATCH状态。

日切键采用portfolioId+market+tradingDate，账户级资源和总限额不随日切清空。共享账户下不同子组合也要检查账户总限额；创建新子组合不能规避约束。

接受批次时绑定初始ledgerVersion。随后本批次已确认Fill导致的预期账本版本推进应记录到ExecutionProgress，剩余Leg使用最新账本与剩余占用重新检查，不机械复用过期风险结果，也不把本批次正常入账当外部冲突。外部成交/出入金、公司行动或非预期版本变更则暂停剩余发送并重评；重评若改变指令内容，生成新建议与授权，不能扩大原批次获批数量。

### 6.4 多实例与最后发送

每账户发送者持有带递增fencingToken的持久租约，所有place经过受控Gateway；Gateway验证当前token、单次DispatchPermit和pauseEpoch。不能仅用Redis锁防双发，也不能假设券商理解内部fencingToken。

发送日志包含PREPARED→DISPATCHING→ACCEPTED/REJECTED/UNKNOWN，clientOrderId创建时稳定。Gateway重启发现DISPATCHING不得自动再place，应先query。网络结果不明且券商不提供足够查询能力，保持UNKNOWN并人工核对。

## 7. 同步API最小清单

以下为新项目待生成OpenAPI的基线路由；JSON字段/状态严格以本文件语义冻结，分页、鉴权和错误Schema需一并生成。

| 所有者 | API | 输入/输出 |
|---|---|---|
| 数据 | GET /api/v1/securities；GET /api/v1/calendars/{market}/sessions | asOf/日期区间→证券映射/会话及版本 |
| 数据 | POST /internal/v1/data-imports；GET /api/v1/data-versions/{id} | 来源/范围/幂等键→202/runId；固定版本与质量 |
| 数据 | GET /internal/v1/quotes；GET /api/v1/fx-snapshots/{id} | 证券/asOf/用途→许可、价格、时间、质量 |
| 量化 | POST /internal/v1/strategy-runs；GET /api/v1/runs/{id} | 固定版本/市场/组合→202/runId与结果引用 |
| 量化 | POST /api/v1/strategies/{id}/versions/{v}/validate、/approve、/activate、/suspend | 版本/理由/权限→Registry结果 |
| 组合 | GET /api/v1/accounts/{id}/snapshot；GET /api/v1/portfolios/{id}/ledger | asOf/分页→原币现金、结算、持仓与账本 |
| 组合 | POST /internal/v1/risk-evaluations；POST /internal/v1/resource-reservations | 完整Proposal/版本→风险和占用；无资源拒绝 |
| 治理 | POST /api/v1/automation-mandates；POST /api/v1/automation-mandates/{id}/activate、/pause、/revoke | 精确范围/版本/本人身份→Mandate状态 |
| 治理 | POST /internal/v1/proposals；POST /api/v1/proposals/{id}/approve、/reject、/revise | 固定证据/操作→建议或新版本 |
| 治理 | POST /internal/v1/authorizations；POST /internal/v1/authorizations/{id}/validate | 风控/批准来源/占用/Hash→短期授权或拒绝 |
| 执行 | POST /internal/v1/rebalance-batches | 授权/全部Leg/稳定键→接受结果或明确拒绝/UNKNOWN |
| 执行 | GET /internal/v1/orders/by-client-id/{id}；POST /api/v1/orders/{id}/cancel | 权威查询/撤单请求；不直接改为CANCELLED |
| 执行 | POST /internal/v1/broker-reports；POST /api/v1/reconciliation-cases/{id}/resolve | 原始证据/幂等键→归一化/差异；解决必须有依据 |
| 平台 | GET /api/v1/dashboard；GET /api/v1/alerts；POST /api/v1/control/pause | 分市场状态/权限过滤/暂停范围与原因 |

接口补齐包括订单列表/详情、成交列表、账户同步、公司行动、资金流、冲正、预算/资源生命周期、能力查询和任务取消，责任方依核心实体表。任何会改变领域事实的命令都需要服务/用户授权，查询也校验账户范围。

统一写命令头：Idempotency-Key、Correlation-Id，expectedVersion放命令体；actor从可信认证上下文获得。主体需market/account/mode时不能省略；创建对象expectedVersion=0。相同键同载荷返回原结果，相同键异载荷409。写命令要求reason或sourceRef。

错误Schema：code、message、category、retryable、correlationId、details（可安全展示）。401身份无效、403权限不足、404对象不存在、409版本/幂等冲突、422输入/业务规则、429限流、503依赖不可用。订单发送结果未知必须额外`acceptanceStatus=UNKNOWN`，不能由通用retryable=true自动重发。

## 8. 事件契约

Envelope v1必需eventId(UUID)、subject、schemaVersion、producer、occurredAt、availableAt、correlationId、aggregateId、aggregateVersion、payload；causationId可选。payload涉及账户必须带accountId/market/environmentMode。subject形如stock.context.aggregate.event.v1。

| Subject | 发布者 | 消费者及作用 |
|---|---|---|
| stock.market-data.data-version.published.v1 | market-data | 量化/状态调度读取固定版本 |
| stock.market-data.corporate-action.published.v1 | market-data | 组合/执行核对生效与在途订单 |
| stock.quant.strategy-snapshot.published.v1 | quant | 治理去重生成建议 |
| stock.governance.mandate.changed.v1 | governance | Gateway/调度更新资格；实时校验不能只依赖事件 |
| stock.governance.proposal.authorized.v1 | governance | Workflow继续，事件本身不是授权证明 |
| stock.execution.batch.accepted.v1 | execution | 预算消费与资源状态收敛 |
| stock.execution.fill.recorded.v1 | execution | 组合幂等入账，触发复盘 |
| stock.execution.reconciliation.blocked.v1 | execution | 暂停相应账户与告警 |
| stock.portfolio.snapshot.changed.v1 | portfolio | 旧风险/建议失效，UI投影 |
| stock.quant.outcome.evaluated.v1 | quant | 可选Memory与复盘投影 |
| stock.monitor.anomaly.detected.v1 | monitor | 严重度门控与风险重评 |
| stock.regime.snapshot.changed.v1 | regime | 适用策略重评 |

新闻、Agent、研究和Memory的增强事件按同一Envelope在各自S0定义；未启用不发布空成功事件。大对象只放ArtifactRef，不在NATS或Temporal历史中嵌入完整行情、新闻、源码和模型上下文。

## 9. 绩效与公司行动

原币净值使用真实持仓与可核对价格；统一报告币种=各原币权益按同一valuationAsOf可见FX折算，标出各资产行情asOf差异。缺汇率可显示原币，不能用默认1:1生成汇总。

TWR用于策略比较，资金流与投资收益分开；后续MWR单独命名。收益归因至少区分证券价格、股息/其他收入、费用/税和汇率影响，计算方法与舍入版本化。应计股息与到账结算相互引用，禁止把应计和到账各记一次收入。

持仓Lot保存tradeDate、settlementDate、可卖数量、成本规则和来源。拆股/并股可能改变持仓数量、成本及在途订单；未知公司行动暂停该证券并对账。券商官方费用/税更正通过调整流水，不改写原交易价。

## 10. 回测、Shadow与策略准入协议

研究运行清单固定数据、市场日历、历史股票池、因子/变换、模型、策略、参数、代码、依赖锁、随机种子、费用/税/滑点/撮合模型、基准以及训练/验证/测试区间。真实时间Shadow沿用同一策略与规则版本，仅将执行适配器替换为不写券商的模拟器。

按市场分别比较五种场景：纯日频固定窗口、日频加盘中延迟、日频加一次已授权风险减仓、配置最多两批的完整策略、NO_REBALANCE。相同区间、初始账户和成本口径，报告成交率、换手、成本后收益、回撤、数据覆盖、拒绝/未知/未成交数量；不能把真实、Paper、Shadow和反事实收益混合。

生产准入检查PIT/未来泄漏、历史退市与行业成分、样本外/Walk-forward、参数敏感度、不同市场状态、容量和成本、规则可成交性及许可证。试验次数和失败候选保留，避免只展示最优结果。未证明盘中调整成本后有效，不默认开放额外Alpha交易。

## 11. 公司行动、外部操作与对账阻塞

对账至少比较订单状态、累计成交、持仓数量/可卖量、分币种现金/结算、费用/税、公司行动。价格差异与资金/数量差异分级，后者默认阻断对应账户新交易，不能通过“忽略”清除风险。

券商外部手工订单先导入为EXTERNAL来源。未识别占用按保守规则冻结相关资源，确认归属后关联或建立独立外部交易记录。系统不把外部成交伪装为自动策略绩效，也不能漏记其账户风险。

未知公司行动、成交撤销/更正或券商历史回报修订必须保存原证据并创建调整/冲正关系。对账解决命令携带事实依据、操作者、expectedVersion和幂等键；仅关闭页面告警不等于解决差异。
