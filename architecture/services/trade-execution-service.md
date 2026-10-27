# 交易执行、Gateway与对账服务

服务：`trade-execution-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS API + Gateway/报告Worker + PostgreSQL。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.3模拟协议/状态机；V1.5恢复；V2.3历史Adapter；V2.4快照模拟；真实Broker延后。

唯一拥有：BrokerAccountMapping、CapabilitySnapshot、Batch/Intent/Order/Fill、原始回报、累计高水位、ReconciliationCase、发送日志/DispatchPermit/租约。

边界：不写组合账本，不批准策略或Mandate；本轮唯一外部交易端是自有FakeBroker，不接真实券商模拟API。

## 2. 内部分层

domain：批次/订单/回报归一化、对账/发送状态；application：接受批次、发送/查询/撤单、Fill/对账；ports：Authorization/AccountFacts/ExecutionVenue/Clock；adapters：FakeBroker、历史日线/分钟与快照模型、DB；bootstrap：API/Gateway/Worker。

目标目录：`services/trade-execution-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：batches/intents/orders、raw_reports/fills、cumulative_high_watermarks、dispatch_logs/permits、sender_leases、reconciliation_cases、capability_snapshots、inbox/outbox。

事务/幂等：批次/全部Intent/幂等记录/Outbox原子事务；clientOrderId稳定；externalFillId按broker/account命名空间唯一；fencingToken防旧发送者，网络写入不承诺exactly-once。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/rebalance-batches | 权威校验授权后原子接受；不确定返回acceptanceStatus=UNKNOWN。 |
| GET /internal/v1/orders/by-client-id/{id}；POST /api/v1/orders/{id}/cancel | 查权威状态；cancel为请求，不直接设置CANCELLED。 |
| POST /internal/v1/broker-reports；POST /api/v1/reconciliation-cases/{id}/resolve | 原始回报持久归一化；处理差异要求事实/版本/理由，不能仅关闭提示。 |

同步验证治理授权/撤销与组合资源/风险；数据提供RAW报价/规则；FakeBroker提供独立报告/资产；向组合发布确认Fill。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.execution.batch.accepted.v1、stock.execution.fill.recorded.v1、stock.execution.reconciliation.blocked.v1；消费必要暂停/账户变化，但最后发送查权威事实。

1. 原子接受批次；Gateway确认当前sender租约、pauseEpoch、风险/报价/授权和单次Permit。
2. 记发送日志再调用Venue，接受/拒绝落库；响应丢失记UNKNOWN并保留资源。
3. 通过原clientOrderId查询，累计转增量，重复/迟到/非法回报分别处理，Outbox发布Fill。
4. 对照FakeBroker与组合事实生成差异，冲正通过所属域命令；重启DISPATCHING只查询不重发。

## 6. 故障、权限与恢复

部分成交后暂停仍处理Fill；无法查询保持UNKNOWN；累计下降走更正，不记随意负Fill；进程租约失效禁止新place。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS API + Gateway/报告Worker + PostgreSQL组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

订单/成交、原始回报来源、UNKNOWN查询/撤单、占用/预算关联、对账和发送时间线；VT03/04/06。

测试映射：T25～31、T48～54模拟子项；原子接受、双Worker、暂停竞态、回报重复乱序及备份恢复。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

实现复核补充（2026-09-25）：V2.4 增加了纯 domain `selectFirstQualifyingSnapshot` eligibility gate，供后续 Paper execution adapter 复用。当前仅验证 SNAPSHOT 的时间因果、市场/证券匹配、执行窗口和现有 1800 秒新鲜度阈值；它不创建订单/Fill，尚不构成完整 SimulationExecutionPolicy，也未接入授权、风险预留或 FakeBroker 写路径。相关单测位于 `tests/unit/snapshot-execution.spec.ts`。

V1版本化迁移增量（2026-10-09）：`migrateTradeExecutionSchema`将FakeBroker订单/成交/事件/Outbox和模拟策略两个现有schema初始化合并为事务化V1 baseline，写入`trade_execution_schema_migrations`服务专属账本并由advisory lock串行化并发启动；DDL或记录失败时整体回滚，较新未知版本拒绝启动。独立`trade_execution_test`验证baseline登记一次、重复迁移不增加版本行，并继续运行订单指纹、乱序Fill、撤单竞态、Outbox及费用更正持久化故障场景。改动后的完整V1.3 code suite exit 0：[日志](../../evidence/audits/2026-10-09-v13-migration-ledgers-code-suite-a03.log)、[SHA-256](../../evidence/audits/2026-10-09-v13-migration-ledgers-code-suite-a03.log.sha256)。当前无降级脚本或部署前独立迁移CLI；数据库仅为一次性隔离实例，未触碰活动库。

OD-014 strict-settled-cash additive migration (2026-10-11): Trade schema v2 adds FakeBroker SELL receivables keyed by account/namespace/fill, persists the versioned settlement mapping in the SELL Outbox payload, and changes Paper SELL cash postings to wait until settlement. Portfolio schema v2 adds its separate receivable ledger and a Run-Clock-driven settlement endpoint. Both adapters keep unsettled proceeds out of settled cash and release them idempotently at the mapped market session; fee corrections update either the pending receivable or settled cash according to current status. The services continue to own independent facts and reconciliation compares both snapshots. A later versioned fixture explicitly covers the fixed V1.3 2026 Paper dates; unknown calendar dates fail closed. Isolated PostgreSQL Trade/Portfolio checks and the complete 27-case V1.3 Web/API/CLI container suite passed, including CN_A same-session rejection and next-session SELL. Evidence and remaining boundaries are recorded in [V1.4 §8.86](../../docs/prd/v1-local-simulation/04-daily-backtest.md#886-od014-trade-outbox双账本结算及v13-paper验证2026-10-11). This does not claim the US SELL same-Run flow or complete stage acceptance.

OD-014 unknown-calendar Fill handling (2026-10-12): Trade schema v3 accepts a SELL receivable with null settlement date only when tagged `SETTLEMENT_CALENDAR_UNAVAILABLE`; the durable Fill/Outbox proceeds instead of being rejected. Portfolio schema v3 stores the matching pending state, preserves settled cash, excludes it from due settlement and BUY resources, and enforces the allowed state with a database constraint. The complete V1.4 isolated code suite passed; see [§8.105](../../docs/prd/v1-local-simulation/04-daily-backtest.md#8105-od-014未映射结算日sell成交保留为待结算应收2026-10-12). The receivable stays pending until an explicit settlement mapping is available; no release date is inferred.

实现复核补充（2026-09-25）：FakeBroker 历史执行现在为 `(namespace, clientOrderId)` 保存完整语义请求的 SHA-256 指纹；同键并发请求由事务级 advisory lock 串行化，异载荷或无法核验的旧行重放返回 409，避免错误复用先前订单/Fill。专用 `trade_execution_test` 集成测试覆盖并发同载荷重放、数量/价格冲突零副作用、重连后结果一致。当前工作区单测/类型检查/构建通过；由于沙箱禁止访问 Docker socket 和本机 PostgreSQL 端口，本轮数据库集成验证未运行，不能标记为数据库验收完成。现存升级前订单无请求指纹，重放会失败关闭，需由上层查询原订单事实，不得盲目用新载荷重试。

实现复核补充（2026-09-25）：`calculateSnapshotFixtureExecution` 只把符合既有 eligibility 结果的冻结 Fixture 生成 `PROJECTED_ONLY` 值，固定费用必须来自 Fixture，假设全量成交并显式标出参与率未验证；它不持久化或产生实际FakeBroker/Portfolio事实。真实 Paper 路径还缺 Mandate/治理授权、风控评估与账户资源预留、费用/成交规则审批、SNAPSHOT FakeBroker持久接受、组合账本和对账闭环。

实现复核补充（2026-09-25）：按项目所有者确认的每服务独立Bearer身份，内部路由现要求 `service-id` 与对应的独立平台/历史回放Bearer同时匹配，并按调用方限制历史执行、订单读取、撤单和补偿范围；回放工作进程用自身身份调用受治理历史执行，V2.4日终对账使用平台身份。缺少、过短或重复token时服务启动失败。单元测试覆盖伪造/缺失身份、调用方错配及路由越权；专用`trade_execution_test`中的临时HTTP进程实测了403/200/404路由行为和向治理服务传递执行服务Bearer，并精确清理拒绝单。该代码尚未部署到活动容器。

调用链收口（2026-09-25）：交易执行消费治理授权时使用 `trade-execution-service` 自身身份；授权只由 `historical-replay-worker` 申请，只有该服务可发起历史 FakeBroker 执行。历史回放服务的入站运行/控制端点要求平台Bearer。

治理拒绝集成补充（2026-09-27）：在隔离`trade_execution_test`中对历史FakeBroker HTTP路径验证调用方scope拒绝先于Governance；有效Replay调用方但Governance拒绝时，订单、Fill、事件、Outbox零写入。Governance通过后仅固定零成交量拒绝样例进入可审计FakeBroker拒绝结果。详见[P5治理拒绝审计](../../evidence/audits/2026-09-27-p5-governance-denial-no-side-effects.md)。该路径仍是BACKTEST历史执行，不代表V2.4 Paper Mandate或SNAPSHOT接线已实现。

V2.4准备态只读端点补充（2026-09-27）：`GET /internal/v1/v24/paper-readiness?market=CN_A|US_EQUITY`仅接受带Platform API专属Bearer的内部请求；读取版本化策略/Mandate准备Fixture，汇总既有领域门禁。CN_A保持BLOCKED、US_EQUITY保持REJECTED，响应明确风险评估与资源预留为NOT_RUN、`orderSubmissionEnabled=false`。该端点不查询或写入FakeBroker，不能表示执行已授权。schema/OpenAPI纳入contracts检查和V2.4 code suite。详见[P5.5 readiness审计](../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。

V2.4生产镜像验证补充（2026-09-27）：隔离internal-only容器烟测已用Linux/ARM64原生及Linux/AMD64仿真运行本服务的实际Dockerfile，启动临时PostgreSQL并通过容器HTTP探针读取readiness；确认runtime fixture copy正确、服务进程为node用户、rootfs只读，鉴权拒绝及FakeBroker零账本副作用。一次性镜像与容器已清理。AMD64仿真不表示已通过Ubuntu部署验收，详情见同一[P5.5 readiness审计](../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。

2026-10-09 V1增量：Trade FakeBroker DAY订单明确到期后，状态与订单事件在同一事务提交；若有绑定预留则新增 `EXPIRED` Reservation Resolution Outbox，Portfolio仍拥有预留状态。所有未投递Fill先完成再释放余量；`UNKNOWN`禁止走到期释放。隔离PostgreSQL和应用单测证据见[到期预留释放审计](../../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)。该增量未验证错过执行窗口的策略重评估、多日调度、完整市场结算或活动部署。


2026-10-01应用边界维护增量（不构成S0关闭）：HTTP组合入口已迁入`src/bootstrap/main.ts`，包入口保留稳定转发；Fill Outbox投递成为应用服务，依赖FakeBroker outbox与Portfolio fill端口。typecheck、58项单测、分层门禁及完整V2.4 code suite通过。Paper与Historical HTTP处理仍部分驻留bootstrap，V2.4人工验收/来源授权/Ubuntu/O2均保持未完成。证据：[Outbox层次审计](../../evidence/audits/2026-10-01-w1-trade-execution-outbox-layer-increment.md)。

2026-10-02 FakeBroker撤单结果及预留解决链：平台独立Bearer仅可向`POST /internal/v1/orders/{id}/cancel-result`提交严格的模拟ACCEPTED/REJECTED结果。Trade在订单行锁事务内写状态/事件；接受撤单关闭未成交余量。若已有Fill Outbox未投账，Trade不释放Reservation；Fill成功确认时同事务写入`RESERVATION_RESOLVE` Outbox。若Fill已投账，接受撤单事务直接写该释放Outbox。后台投递器以独立claim/lease调用Portfolio的owner/run/account scoped解决API，失败有限重试并保留compensation记录；补偿路由按事件类型重放。拒绝撤单恢复原工作态，迟到结果不覆盖状态，重复请求/重放幂等。故障时序仍缺真实Fill/撤单竞态矩阵、费用更正与独立模拟外部单，见[W2审计](../../evidence/audits/2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)。该链只用FakeBroker和隔离测试，不连接真实券商。

2026-10-02 ADR-0008 FakeBroker event ordering is implemented for simulated cumulative Fill reports and cancellation outcomes. Both API paths share a durable per-order cursor and inbox; later events are buffered and acknowledged as pending, exact replays are idempotent, changed same-sequence facts conflict, and contiguous events reduce transactionally. An isolated PostgreSQL test and the P5.7 HTTP recovery smoke prove cancel sequence 2 survives a Trade restart while Fill sequence 1 is missing, then drains in order without releasing the reservation ahead of the Fill. Full V2.4 code-suite evidence is in [the event-ordering implementation audit](../../evidence/audits/2026-10-02-w2-fakebroker-event-ordering-implementation.md). This resolves the modeled FakeBroker causal race only; it does not specify or prove real-broker protocol behavior, timeout recovery for a permanently missing sequence, real observation, or human acceptance.

2026-10-09 V1.3/V1.4 request-boundary increments: manual cancellation/expiry/UNKNOWN routes reject all request bodies, and the historical BACKTEST FakeBroker route now enforces the canonical `additionalProperties: false` contract at the HTTP boundary, including nested bar/reservation objects and an 8 KiB limit. Isolated PostgreSQL tests prove three LIVE/REAL mode combinations are rejected before Governance lookup or order persistence while a valid BACKTEST command still follows the normal path. V1.3 and V1.4 full code suites and V1.4 Web/API/CLI E2E pass. See [V1.3 §8.41](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#841-trade订单取消到期unknown路由拒绝模式载荷2026-10-09) and [V1.4 §8.12](../../docs/prd/v1-local-simulation/04-daily-backtest.md#812-historical-fakebroker-http命令严格附加字段边界2026-10-09). Full L17 route matrix and remaining V1 requirements remain open.

2026-10-17 V2.1 watchlist read increment: Platform-only `GET /internal/v1/accounts/{accountId}/in-flight-orders` returns only unresolved order security/status after filtering by account, namespace, owner, and TestRun. Terminal orders are excluded; no order payload or ledger details leave Trade. OpenAPI and Platform client are generated from the updated service contract. This is a read prerequisite for the V2.1 online pool and does not change order execution behavior or prove Market Data integration/persistence.

2026-10-10 V1.4终态拒绝Reservation释放补充：含Reservation的Historical FakeBroker命令若产生无Fill的`REJECTED`/`EXPIRED`终态，FakeBroker现在在订单写事务内创建唯一`RESERVATION_RESOLVE` Outbox，Outcome与拒绝证据绑定持久订单ID；Trade HTTP尝试经生成Portfolio Account client向Portfolio提交owner/TestRun/account scoped释放。投递失败保留Outbox重试/补偿，UNKNOWN不释放，Fill路径仍须先入账后释放。隔离Governance/Trade/Portfolio HTTP+PostgreSQL以ZERO_VOLUME→REJECTED及不可成交LIMIT→EXPIRED两类终态、同命令重放验证该边界；完整V1.4 code suite见[阶段§8.73](../../docs/prd/v1-local-simulation/04-daily-backtest.md#873-v14历史fakebroker终态拒绝释放资源预留2026-10-10)和[a04日志](../../evidence/audits/2026-10-10-v14-terminal-reservation-release-code-suite-a04.log)。该固定场景不覆盖全部拒绝类型、结算日历、OD-014或完整V1验收。
