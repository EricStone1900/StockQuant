# 平台API、身份与开发验收中心

服务：`platform-api-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS BFF + 持久任务协调。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.1建立身份/健康/TestRun，全部14阶段增量扩展；不新增独立验收平台服务。

唯一拥有：本地身份/会话、偏好、平台审计、通知投影、TestScenario目录/版本、TestRun元数据、TestAssertion和AcceptanceRecord。

边界：不拥有交易资金/订单事实，不直接跨库读写领域，不授予Web任意SQL/shell或Docker能力。

## 2. 内部分层

domain：测试场景/运行/人工签署、访问范围；application：BFF聚合、测试编排、证据导出、暂停命令转发；ports：领域Clients/JobCoordinator/Artifact；adapters：DB、会话认证、只读投影；bootstrap：API/受控后台任务。

目标目录：`services/platform-api-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

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

V3.1增加 `GET /api/v1/acceptance/v3/v3.1/runs/:testRunId/artifacts/:artifactId`：先按会话owner读取精确V3.1 TestRun，再核对TestRun中登记的INPUT引用或实时RunnerJob中登记的OUTPUT引用及其精确run/experiment namespace，最后用平台独立Bearer从research-automation-service读取受限内容。异主、缺身份、未关联Artifact分别由平台拒绝；独立HTTP smoke和Web准备页的隔离Playwright下载操作通过。平台API单测40/40，V3.1正式code suite通过。当前Web准备页提供关联输入读取/下载，完整研究工作台及活动服务部署尚未完成；本补充不更改人工验收状态。

V2.4验收创建接口当前为准备态：normal/rejection/recovery创建持久`WAITING` TestRun，明确`PAPER`/`FAKE`、`NOT_CONNECTED`数据、`PREPARATION_ONLY` Mandate、空订单/成交及`NOT_RUN`对账。该入口不调用Market Data、Governance、Portfolio或Trade Execution；本机隔离HTTP smoke以临时下游canary确认零请求，并覆盖会话及异主拒绝。它不实现SNAPSHOT→Mandate/risk/reservation→FakeBroker链，也不增加观察计数。活动Paper workflow与20交易日验收状态不变。

V2.4 Paper readiness只读代理补充（2026-09-27）：`GET /api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A|US_EQUITY`要求本地用户session，再以Platform API专属Bearer和服务身份调用Trade Execution内部准备态端点；不向浏览器暴露服务凭据。隔离PostgreSQL/HTTP smoke验证匿名401、有效session后向Trade Execution仅代理一次且两项身份头正确；浏览器测试用固定响应验证准备态展示。实际业务值/授权仍来自Trade Execution领域门禁端点，Web展示测试不会伪称连接真实Paper行情或下单。详见[P5.5 readiness审计](../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。

V2.2受限CSV补充（2026-09-25）：两个`POST /api/v1/acceptance/v2/v2.2/csv/*`路由先验证本地会话/用户范围，再代理到market-data-service；平台JSON parser上限为1 MiB，单文件内容限700 KB、最多10,000行。预览和导入均沿用同一显式映射/单位/时区语义；平台导入端固定HTTP 200并由结果字段区分首次/幂等，质量拒绝返回422。专用`platform_api_test` HTTP smoke已验证匿名401及120,284字节请求完整转发到localhost mock；该mock不验证真实Web→API→市场服务链。详情见[P6 CSV分钟导入](../../evidence/audits/2026-09-25-p6-csv-minute-import.md)。

V2.4观察窗口质量实现（2026-09-26）：日终计数按`scheduledFor`检查十个唯一的A股采样时刻，拒绝缺窗、重复和超过±60秒延迟；每窗及唯一09:31执行窗核对市场服务返回的requestedSymbols，并逐证券验证唯一报价、LIVE_SOURCE状态和0～1800秒新鲜度。隔离持久层烟测构造十个唯一采样窗、两个证券共22份有效报价样本和一个执行窗，并由仓储重新计算质量通过；平台API 44项单测/build通过。新`qualityForDate`不回写旧最终记录；活动服务尚未部署。详见[观察质量审计](../../evidence/audits/2026-09-26-v24-observation-quality.md)。

V3.3研究队列只读代理（2026-09-27）：`GET /api/v1/acceptance/v3/v3.3/runs/{testRunId}/research/queue`先验证本地会话和该Owner名下stageId为V3.3的TestRun，再以Platform API独立Bearer查询Research Automation精确run队列；偏移与页大小受限，跨Owner/错误阶段返回未找到，不向浏览器暴露服务凭据。具体Research Automation队列契约和状态见[Research Automation架构补充](./research-automation-service.md)。当前尚无V3.3 run创建与正式页面，因此此端点是后续队列页的读能力，不代表阶段功能或验收完成。
