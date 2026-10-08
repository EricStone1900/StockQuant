# 平台API、身份与开发验收中心

服务：`platform-api-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS BFF + 持久任务协调。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.1建立身份/健康/TestRun，全部14阶段增量扩展；不新增独立验收平台服务。

唯一拥有：本地身份/会话、偏好、平台审计、通知投影、TestScenario目录/版本、TestRun元数据、TestAssertion和AcceptanceRecord。

2026-10-07本地会话实现增量：PostgreSQL `platform_local_sessions`存会话Token的SHA-256摘要与owner/创建/到期/撤销时间；原始256位随机Token仅通过HttpOnly SameSite Cookie发给浏览器，12小时过期，`POST /api/v1/session/logout`持久撤销。Platform API入口对每个带会话Cookie的请求查验数据库状态；数据库不可用时失败关闭。随机隔离V1.3 E2E证明logout后重启Platform再重放旧Token仍401。该实现覆盖本地单用户开发身份，不表示活动部署或外部身份提供方集成。

边界：不拥有交易资金/订单事实，不直接跨库读写领域，不授予Web任意SQL/shell或Docker能力。

## 2. 内部分层

domain：测试场景/运行/人工签署、访问范围；application：BFF聚合、测试编排、证据导出、暂停命令转发；ports：领域Clients/JobCoordinator/Artifact；adapters：DB、会话认证、只读投影；bootstrap：API/受控后台任务。

目标目录：`services/platform-api-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

2026-10-07 V1.3 Session推进协调边界实现：`V13AcceptanceController`只解析可信owner并映射HTTP错误；`V13SessionAdvanceService`在Application层按ports查询owner/TestRun范围、Portfolio持仓/HELD预留、FakeBroker独立余额与持仓及未决对账，再从Market Data Calendar解析下一Session，并经StageRun Repository以`expectedClock`栅栏持久推进。Platform仍只保存TestRun/Fixture Clock事件，不创建组合或FakeBroker账本事实。定向应用服务单测5/5、V1.3完整code suite和随机隔离Web/API/CLI矩阵21/21通过；更广泛Proposal/审批/执行协调仍有部分位于Controller，不能据此标记P3全面完成。审计：[应用层Session推进复验](../../evidence/audits/2026-10-07-v13-session-advance-application-e2e.md)。

2026-10-08 V1.3订单事件边界增量：L07/L08 sequenced Fill报告、撤单请求与撤单结果协调现由`V13SequencedFill`应用层流程执行，按ports查询owner/TestRun/Proposal/FakeBroker权威订单及Portfolio预留、用TestRun Clock生成确定性事件、调用Trade Execution并回读同Run投影；HTTP Controller只适配会话身份、下游clients和HTTP错误。应用流程7项定向用例；Platform全套60文件/268项单测、typecheck、V1.3完整代码套件及隔离Web/API/CLI矩阵21/21复验通过。领域订单/Fill/账本所有权与事件合同未改变。证据：[订单协调应用服务审计](../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。

2026-10-07 V1.5受限持久派发实现：仅normal NO_TRADE由Platform事务写入owner/TestRun范围的`v15_workflow_dispatch_outbox`，Relay通过真实JetStream发布，durable Consumer校验持久TestRun再调用稳定Temporal Workflow ID；业务账户、订单、Fill与账本仍归Portfolio/Trade。此为V1受限能力切片，尚非独立Workflow Orchestration Service。真实隔离E2E验证NATS短停、派发前Platform API重启、坏JSON/错误owner终止、同Run重复消息首次ACK丢弃后的真实redelivery，以及原Outbox恢复；Temporal调用边界一次性UNAVAILABLE经NAK/redelivery恢复以及NO_TRADE Activity执行中重启承载Worker的Platform API后恢复已有隔离E2E；数据库瞬态重试、真实Temporal服务进程重启、多Consumer竞争、交易/日终流程仍未验证。完整E2E和代码Hash见[派发审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。

## 3. 数据与一致性

逻辑持久化：identities/sessions、preferences、platform_audits、notification_projections、test_scenarios、test_runs、test_assertions、acceptance_records、job_dispatch_records。

事务/幂等：TestRun创建与持久派发记录同事务，后台恢复不会重复创建业务运行；stage/scenario/version唯一；人工结论追加、绑定代码/run，不能覆盖原失败。

实现复核补充（2026-09-25）：V2.4 观察 TestRun 的质量失效会先追加旧状态/断言/证据到 `acceptance_stage_run_revisions`，再将当前投影标记失败；日终完成保护终态并允许相同结果幂等重试。观察列表仅返回当前 owner 的 V2.4 observation runs；修订查询先按本地会话 owner 查找运行，再返回该 run 的修订。API、生成契约、Web 页、隔离 PostgreSQL 回归和页面浏览器用例已完成。运行中容器部署、API owner 权限及健康核对已完成；生产观察库当前没有可展示的修订记录，实际观察与人工验收状态未改变。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| GET /api/v1/dashboard；GET /api/v1/alerts；POST /api/v1/control/pause | 带账户范围聚合，暂停转发治理/执行，局部失败明确展示。 |
| 场景列表/创建TestRun/查询/取消（S0待冻结路由） | CLI与Web同入口，202仅受理；初始化通过业务API。 |
| check-only/证据导出/人工签署端口（S0待冻结路由） | 同run后端事实断言；禁止新增订单/模型调用；人工签署校验实际用户身份。 |

通过生成Client读写各领域；粗粒度长任务可委托workflow；证据存Artifact引用；Stage能力不足明确阻塞。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：消费领域事件构建可重建通知/状态投影；按aggregateVersion去重；关键写操作仍向领域权威校验。

1. 登录并授权到模拟namespace；选择stage/scenario固定输入并生成testRunId。
2. 持久受理、后台通过领域API准备隔离账户/数据、触发功能，收集真实业务ID。
3. 独立读取事实计算expected/actual，Web/CLI查看同run；浏览器关闭不影响任务。
4. 导出脱敏证据，实际用户追加人工结论；脚本不得代签，清理仅选定非活动运行。

## 6. 故障、权限与恢复

某领域503返回分区失败/陈旧，不能当正常空值；未满观察期WAITING，零测试/缺脚本不能PASS；平台故障不导致交易服务停收合法Fill。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS BFF + 持久任务协调组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

正式导航/总览及/acceptance的版本阶段、场景、任务、证据、差异、人工记录；见组件文档。

测试映射：T01～03、T22/35～37、VT01；run越权、幂等、关闭Web、只读核对无副作用及不能自动签署。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

## 实现证据补充（2026-09-25）

V1.1历史TestRun补充（2026-09-26）：活动库44条V1.1旧记录已按事务影子迁移至`acceptance_stage_runs`，旧表仍保留，源/目标投影差异为0。`STOCKQUANT_V11_RUN_STORAGE`默认`legacy`；显式设为`stage`后，服务启动校验两表全部旧记录映射无缺失/冲突，V1.1按owner从统一表读取，创建、状态和断言通过同一PG事务双写新旧表。stage写入失败会回滚legacy变更；缺影子行或不一致则启动失败。该模式的专用PG与真实HTTP隔离 smoke通过；活动Compose未切换，且切换部署必须停止旧写入实例以避免双写不一致。旧表暂不删除，API回退/部署演练仍待。

V3.1 exact-run promotion gate (2026-09-27): Platform persists user acceptance separately in `v31_acceptance_records`, keyed to the immutable TestRun and canonical evidence hash. `POST /api/v1/acceptance/v3/v3.1/runs/{testRunId}/acceptance` requires the owner's session and explicit exact-run confirmation; it accepts only a completed normal run with all assertions, required real-model/Runner assertion IDs, `RESEARCH` + `FAKE`, LIVE model response hash/cost and completed Runner published output hash. `GET /internal/v1/acceptance/v3/v3.1/gate/{testRunId}` is restricted to Research Automation's dedicated Bearer token and matching service ID. The separate token is passed into this service and Research Automation by Compose. The isolated integration smoke uses synthetic rows and does not create production or human acceptance evidence; current V3.1 remains NOT_RUN.

V3.2 user submission action (2026-09-27): `POST /api/v1/acceptance/v3/v3.2/runs/{testRunId}/promotion-submission` requires the session owner, an explicit command and an owned normal V3.1 run. Platform derives the experiment ID from that persisted run before forwarding to Research Automation; clients cannot substitute another experiment. The action returns `humanAcceptance=NOT_CHANGED` and delegates gate enforcement to Research Automation. An isolated synthetic HTTP test verifies missing preparation evidence returns WAITING and does not change the acceptance record.

V3.2 Quant Promotion client boundary (2026-10-01): Platform promotion detail, independent validation report reads, and exact-version decision writes now use `GeneratedQuantPromotionClient` from the existing `quant-promotions.v1` OpenAPI operations. Platform preserves its session/owner/source-TestRun/acceptance gate before decision writes, report binding checks, and existing 403/404/409/422 behavior; V3.3 readiness projection uses the generated detail reader while retaining owner checks. Client code itself has no authority to approve without the application gate; the implementation change did not invoke these routes or modify Registry state. Full V3.2 code suite passed using readiness-only synthetic input; human acceptance remains NOT_RUN.

V1.2 Quant Research preview client boundary (2026-10-01): Platform V1.2 Qlib probe, fixed factor preview, and RD-Agent boundary probe now use `GeneratedQuantV12PreviewClient` backed by three ServiceBearer OpenAPI operations and canonical response schemas. The same client feeds V1.2 TestRun verification and the three authenticated preview routes. These routes remain read-only; user-session and bearer separation are preserved. No model provider is configured/called by this path; V1.2 full code suite passed with the locked local test suite, while manual acceptance remains historical and unchanged.

V3.1增加 `GET /api/v1/acceptance/v3/v3.1/runs/:testRunId/artifacts/:artifactId`：先按会话owner读取精确V3.1 TestRun，再核对TestRun中登记的INPUT引用或实时RunnerJob中登记的OUTPUT引用及其精确run/experiment namespace，最后用平台独立Bearer从research-automation-service读取受限内容。异主、缺身份、未关联Artifact分别由平台拒绝；独立HTTP smoke和Web准备页的隔离Playwright下载操作通过。平台API单测40/40，V3.1正式code suite通过。当前Web准备页提供关联输入读取/下载，完整研究工作台及活动服务部署尚未完成；本补充不更改人工验收状态。

V2.4验收创建接口当前为准备态：normal/rejection/recovery创建持久`WAITING` TestRun，明确`PAPER`/`FAKE`、`NOT_CONNECTED`数据、`PREPARATION_ONLY` Mandate、空订单/成交及`NOT_RUN`对账。该入口不调用Market Data、Governance、Portfolio或Trade Execution；本机隔离HTTP smoke以临时下游canary确认零请求，并覆盖会话及异主拒绝。它不实现SNAPSHOT→Mandate/risk/reservation→FakeBroker链，也不增加观察计数。活动Paper workflow与20交易日验收状态不变。

2026-10-01跨服务契约增量：Platform V2.2 minute CSV import/preview、导入详情/Bar分页及CSV/Parquet upload create/chunk/progress/preview/finalize/cancel路由在本地session/owner校验后，调用OpenAPI生成的`GeneratedMarketDataMinuteClient`，并携带独立Platform Bearer身份；Market Data错误status/body由Platform保留。生成漂移门禁、Platform typecheck/lint/105项单测及V1.1 code suite通过。新增隔离Market Data/Platform/PG/Chromium联测覆盖上传、读取、取消及owner边界通过；没有活动API部署。本增量不改变服务身份/NO_TRADE边界。证据：[W1 Market Data分钟import客户端审计](../../evidence/audits/2026-10-01-w1-market-data-minute-import-client.md)。

V2.4 Paper readiness只读代理补充（2026-09-27）：`GET /api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A|US_EQUITY`要求本地用户session，再以Platform API专属Bearer和服务身份调用Trade Execution内部准备态端点；不向浏览器暴露服务凭据。隔离PostgreSQL/HTTP smoke验证匿名401、有效session后向Trade Execution仅代理一次且两项身份头正确；浏览器测试用固定响应验证准备态展示。实际业务值/授权仍来自Trade Execution领域门禁端点，Web展示测试不会伪称连接真实Paper行情或下单。详见[P5.5 readiness审计](../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。

V2.2受限CSV补充（2026-09-25）：两个`POST /api/v1/acceptance/v2/v2.2/csv/*`路由先验证本地会话/用户范围，再代理到market-data-service；平台JSON parser上限为1 MiB，单文件内容限700 KB、最多10,000行。预览和导入均沿用同一显式映射/单位/时区语义；平台导入端固定HTTP 200并由结果字段区分首次/幂等，质量拒绝返回422。专用`platform_api_test` HTTP smoke已验证匿名401及120,284字节请求完整转发到localhost mock；该mock不验证真实Web→API→市场服务链。详情见[P6 CSV分钟导入](../../evidence/audits/2026-09-25-p6-csv-minute-import.md)。

V2.4观察窗口质量实现（2026-09-26）：日终计数按`scheduledFor`检查十个唯一的A股采样时刻，拒绝缺窗、重复和超过±60秒延迟；每窗及唯一09:31执行窗核对市场服务返回的requestedSymbols，并逐证券验证唯一报价、LIVE_SOURCE状态和0～1800秒新鲜度。隔离持久层烟测构造十个唯一采样窗、两个证券共22份有效报价样本和一个执行窗，并由仓储重新计算质量通过；平台API 44项单测/build通过。新`qualityForDate`不回写旧最终记录；活动服务尚未部署。详见[观察质量审计](../../evidence/audits/2026-09-26-v24-observation-quality.md)。

V2.4采样策略一致性（2026-09-30）：`STOCKQUANT_V24_SAMPLING_INTERVAL_MINUTES` 默认30，仅接受20/30；停止状态应用配置，运行中恢复沿用持久策略。调度器据此生成交易时段窗口；每条事件记录政策值，日终校验拒绝混用并要求14或10个唯一窗口。旧事件仅在原30分钟标记齐全时兼容。完整隔离阶段代码套件已通过；不代表活动服务部署或数据授权。详情见[V2.4采样策略审计](../../evidence/audits/2026-09-30-w3-sampling-interval-policy.md)。

V3.3研究队列只读代理（2026-09-27）：`GET /api/v1/acceptance/v3/v3.3/runs/{testRunId}/research/queue`先验证本地会话和该Owner名下stageId为V3.3的TestRun，再以Platform API独立Bearer查询Research Automation精确run队列；偏移与页大小受限，跨Owner/错误阶段返回未找到，不向浏览器暴露服务凭据。具体Research Automation队列契约和状态见[Research Automation架构补充](./research-automation-service.md)。当前尚无V3.3 run创建与正式页面，因此此端点是后续队列页的读能力，不代表阶段功能或验收完成。

V2.4观察器跨服务读取（2026-10-01）：Market Data A股日历和报价预览由`market-data-calendar.v1`生成客户端调用，报价操作要求Platform Bearer；FakeBroker reconciliation summary由`trade-execution-historical.v1`平台客户端调用。Observation Handler必须先满足明确报价用途授权、引用和数据版本才可触发quote客户端；未配置时保持`NOT_AUTHORIZED`/`NOT_CONNECTED`且零报价请求。契约和代码仅经Fixture/mock及隔离V2.4 suite验证，未部署、未启用订阅或增加观察日，来源授权门禁不变。

2026-10-01 DC-06项目数据交付：项目分页与脱敏导出由`GeneratedMarketDataProjectDeliveryClient`承载，凭据名为`STOCKQUANT_DC06_PROJECT_ID` / `STOCKQUANT_DC06_PROJECT_TOKEN`，只传ProjectToken身份，不发送`x-stockquant-scopes`自报权限。新增Market Data OpenAPI、请求/响应Schema、生成漂移检查及Compose配对配置名；匿名401、跨项目403、分页/导出200在随机隔离Platform→Market Data→PostgreSQL smoke验证。活动API未切换，凭据保持空配置。审计：[DC-06客户端与HTTP验证](../../evidence/audits/2026-10-01-w1-market-data-project-client.md)。

W1 Artifact persistence boundary increment (2026-10-01): V2.3 Qlib Fixture Artifact persistence is now exposed to bootstrap through `QlibFixtureArtifactRepository` in `src/ports`; `PostgresQlibFixtureArtifactRepository` implements it in `src/adapters`. The port retains `migrate`, immutable `save`, and owner/TestRun-scoped integrity-checked `find`. The table and payload remain Qlib-specific, so this is not yet the shared Artifact content store/lifecycle. Full V2.3 code suite and the isolated Qlib TestRun persistence/read/export smoke passed after the change; no external data, provider, broker, or active service was used. See [W1 port audit](../../evidence/audits/2026-10-01-w1-platform-qlib-artifact-port.md).

W7 V3.3 budget-summary proxy update (2026-10-01): the owner-scoped proxy now accepts exactly the three `stageBudgetControl` values declared by the Research Automation schema, including `TEST_RUN_AND_ROUND_CAP_ENFORCED`, instead of requiring the stale `NOT_IMPLEMENTED` value. It still validates the exact owned V3.3 TestRun and page/cursor binding before forwarding. Unit coverage verifies all declared values and rejects unsupported values. The full V3.3 code suite and isolated Research Automation HTTP/PostgreSQL cap smoke passed; the V3.3 business workflow and Paper continuity remain incomplete. See [W7 proxy audit](../../evidence/audits/2026-10-01-w7-v33-budget-proxy-integration.md).

W1 V2.3 Artifact lifecycle increment (2026-10-01): `qlib_fixture_artifacts` persists PUBLISHED/RETAINED/EXPIRED and an optional immutable `expires_at`; legacy rows migrate as PUBLISHED without an invented retention deadline. PostgreSQL enforces allowed lifecycle transitions and expiry timing, TestRun projection reads current repository status, and EXPIRED artifacts remain auditable but are no longer downloadable. Dedicated `platform_api_test` lifecycle integration passed, including early expiry rejection and terminal no-revival. The Qlib-specific PostgreSQL table continues to own Qlib Artifact metadata; starting with the 2026-10-01 shared-content increment, new payload bytes are content-addressed on the same `research-artifacts-v1` volume used by Research Automation. Existing JSONB rows remain readable, and the active Compose stack has not been changed. See [lifecycle audit](../../evidence/audits/2026-10-01-w1-v23-qlib-artifact-lifecycle.md) and [SHA-256](../../evidence/audits/2026-10-01-w1-v23-qlib-artifact-lifecycle.sha256).

W1 shared Artifact bytes (2026-10-01): Platform's Qlib adapter now uses `@stockquant/artifact-content-store` and stores only reference metadata for new files in PostgreSQL; the shared immutable volume stores bytes under `research/{testRunId}/qlib-fixture/{sha256}/{artifactId}`. The Qlib owner-scoped API and exporter continue to verify the DB reference and content hash. Existing rows with inline JSONB payloads remain readable for migration. Compose source mounts the named volume into Platform API as well as Research Automation, but no active container was restarted or redeployed. See [shared content audit](../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md).

W1 legacy Qlib JSONB backfill (2026-10-01): `backfillLegacyPayloads` validates bounded PUBLISHED/RETAINED batches against both SHA fields, publishes and reads back immutable shared bytes, then clears JSONB with an identity/hash/payload/status compare-and-set. Dry-run is default; the CLI is restricted to dedicated `platform_api_test` and an explicit temporary content root. Unit tests (9/9) and dedicated PostgreSQL lifecycle/backfill integration (2/2) pass, including rerun and continued owner-scoped reads. The complete V2.3 code suite also passed with locked synthetic Qlib and removed isolated resources. No active business database, application container, or runtime Artifact volume was read or migrated. Production migration remains behind W8 authorization and backup gates.

W1 operational readiness probes (2026-10-02): the five Platform `/ready` checks for Portfolio, Trade Execution, Historical Replay, Market Data and Research Automation use the shared `service-readiness-probe` adapter. Required dependencies enforce a 3-second timeout and require 2xx plus valid JSON; optional preview surfaces map any failure to `UNAVAILABLE`. These endpoints remain operational probes, while business calls use their versioned generated clients. Unit coverage and the V1.1 code-suite rerun are recorded in [the readiness probe audit](../../evidence/audits/2026-10-02-w1-platform-readiness-probe.md).

V2.4 告警投影增量（2026-10-03）：平台以登录会话校验用户，再通过生成的`market-data-calendar.v1` Bearer 客户端读取Market Data活动Incident；确认请求由平台根据当前会话补入actorId，不信任浏览器自报身份。Web `/paper`显示严重级别、告警码、活动状态与最近发生时间，仅`OPEN`项可显式确认。界面和Platform测试使用Mock响应；Market Data真实持久生命周期由隔离PostgreSQL单测验证，活动环境尚未部署或授权采集。证据见[W3告警生命周期审计](../../evidence/audits/2026-10-03-w3-alert-incident-lifecycle.md)。

2026-10-06 V3.3同TestRun结果归并及Experiment结算：Platform在确认两轮Runner输出Hash/metrics后读取Research Automation全量TestRun预算摘要，仅对固定两轮、各23-cent Fixture调用且无UNKNOWN/未决的唯一Experiment发起账本派生结算；随后复读Experiment预算及TestRun摘要，匹配SETTLED 46/80 cents后将账本证据写入同一个仍RUNNING的StageRun。Research endpoint不接受Platform传入金额；此为Fixture预算账本结算，不是第三方账单核销，业务验证和人工签署仍独立未完成。完整审计见[W7 Experiment账本结算](../../evidence/audits/2026-10-06-w7-v33-experiment-ledger-settlement.md)。
