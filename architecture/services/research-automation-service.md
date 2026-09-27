# RD-Agent自动研究服务

服务：`research-automation-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python API + RD-Agent控制器 + 隔离Runner。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2兼容探针；V3.1实际小实验、V3.2候选、V3.3扩容恢复、V3.4Ubuntu。

唯一拥有：Experiment、实验计划/轮次/预算分配、生成代码CandidateArtifact、失败试验、PromotionRequest及研究检查点。

边界：不拥有生产或模拟策略Registry写批准权，不直接交易；RD-Agent不是第二个同名领域服务。

## 2. 内部分层

domain：实验/候选/预算/检查点；application：研究循环、候选提交、取消/恢复；ports：ModelGateway/ExperimentRunner/QlibEvaluation/Artifact/Clock；adapters：固定RD-Agent fork、模型网关客户端、Docker受控Runner、DB。

目标目录：`services/research-automation-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：experiments/experiment_steps、candidate_artifacts、promotion_requests、research_checkpoints、budget_allocations、model_call_budgets、runner_jobs、artifact_refs。实验级预算先占用阶段额度；每个模型请求以唯一modelRunId和请求指纹再次预留，DISPATCHED/UNKNOWN金额持续占用实验限额；实际费用确认后逐请求结算，实验汇总不能低于已结算请求费用。网关拥有调用实际成本，本域汇总引用不重复计费。当前请求级账本已通过专用PG测试，注入式调用coordinator通过固定假Provider单测；它尚未接入服务HTTP/Runner工作流，也没有生产Provider和真实供应商用量/账单结算。

事务/幂等：实验输入/代码Hash与轮次稳定；步骤完成/Artifact指针原子发布；恢复不重复发布或晋升；真实LLM重生成不保证相同。

V3.1当前实现补充：PostgreSQL预算账本以阶段行锁串行化并发预留；UNKNOWN保留全部额度，已核实结算后按实际费用累计。实验创建/模型调用当前尚未接入预留/结算调用，因此费用门禁仍未端到端验证。Runner启动计划只允许精确的受管输入/输出目录，拒绝路径穿越及跨run路径；资源软件上限为2 CPU、4096 MiB、3600秒和128 PIDs。启动计划不会执行容器；可信宿主超时强制和输出容量限制仍待实现。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 实验创建/查询/取消（实验控制路由） | 固定数据/模型Profile/预算/轮数，202返回run；首轮并发1；实验取消不自动清除UNKNOWN费用。 |
| Runner Job提交/查询/取消 | 平台身份提交和查询；仅平台Bearer可请求精确Job取消。取消持久为`CANCELLED`并清除当前租约，Host后续heartbeat失效后中止执行、清理容器；重复取消幂等，Runner Host无取消权限。 |
| PromotionRequest提交 | 引用精确候选/实验/代码/数据，交quant独立复算；不能调用approve/activate。 |
| 受控Runner任务协议 | 镜像白名单、只读输入、独立输出/资源限额/网络政策；不接受任意宿主挂载。 |

模型调用经统一网关；market-data/quant提供固定数据和评价契约；Qlib实验在隔离镜像运行，quant另做独立候选复算。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：实验完成/失败/候选提交在S0冻结；不把候选事件直接连成策略ACTIVE或订单。

1. 冻结数据/时间切分/模型/代码和预算，真实模型生成假设/代码。
2. Runner按白名单镜像执行Qlib评估，保存全部失败与反例，不能只保留最佳收益。
3. 量化域独立复算，用户批准后进入模拟策略，研究域只能查看晋升状态。
4. 检查点恢复、排队/扩容保持预算与发布幂等，录制响应只用于确定性编排测试。

## 6. 故障、权限与恢复

越权/超时/OOM隔离终止实验；模型响应未知记录可能计费；没有凭证则真实闭环NOT_RUN，不能用预制因子代替。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python API + RD-Agent控制器 + 隔离Runner组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

实验参数/轮次、假设/代码/日志/指标、预算、失败、检查点、候选审批跳转；控制器秘密与Socket不暴露。

测试映射：T12～14/20/38、VT07；实际模型→代码→Qlib、Runner隔离、预算/取消/恢复、独立复算及未批准不晋升。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

## 实现证据补充（2026-09-25）

研究服务身份从每个服务的Bearer Token推导；`x-stockquant-service-id`可省略，只在出现时校验是否与Token身份一致，且配置中的凭证必须唯一。route/scope基于Token主体执行。身份HTTP烟测和配置拒绝重复凭证均通过。研究服务还提供默认只读Artifact一致性巡检：报告缺失PUBLISHED文件、引用Hash不符、近期未登记文件和过期孤儿；显式维护窗口操作只会将过期孤儿移动到同文件系统的外置隔离目录并写Hash清单，不自动删除。专用PG模拟文件先写、ArtifactRef未提交的崩溃窗口并成功发现孤儿。巡检不等于真实进程强杀/掉电恢复或周期备份，活动Artifact卷从未用隔离模式更改。

研究服务已实现PostgreSQL Runner Job租约/fencing及INPUT/OUTPUT Artifact路径：Runner Host须带当前workerId与fencingToken；服务只返回Job指定的已发布INPUT引用，限制8 MiB并核对SHA-256；OUTPUT发布绑定租约、精确namespace与已发布引用。PG事务锁定Runner Job行并在同一事务中持久ArtifactRef和Job产物引用；取消与发布线性排序，取消先提交则不运行文件/引用持久化，发布先获得锁则取消等待并保留已发布引用。平台身份可通过`POST /v1/runner/jobs/{jobId}/cancel`持久取消排队或运行中Job，取消原子记录`CANCELLED`、完成时间并清除租约；取消幂等，Host后续heartbeat及complete因旧租约被拒，执行器中止并删除容器，不允许取消Job被自动重试。Runner Host身份不能调用该路由。`v3.1-runner-input-bundle-v1` JSON契约、校验器、安全materializer、宿主执行器和独立`runner:host`循环入口已实现。临时隔离HTTP+PG smoke实际启动独立Host进程与冻结Docker镜像，贯通claim→INPUT→heartbeat→执行→OUTPUT持久发布→complete，并验证一次Host SIGKILL后的30秒租约过期、fencing token 2接管和旧容器清理；另以60秒固定任务实测取消后容器删除且未发布Artifact。固定离线Runner与恢复证据见[P7.3](../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)及[P7.5](../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。平台Artifact读取需核验实时RunnerJob。活动Artifact卷只读快照副本与当前23个PUBLISHED引用Hash核对通过。上述新Runner和平台读取/取消路由尚未部署到活动服务；Host持续运行、原生Ubuntu、真实RD-Agent/模型/费用及人工V3.1验收仍NOT_RUN。

## V3.2 contract preparation (2026-09-25)

Added `v3.2-promotion-request-v1` and candidate-validation scenario schemas. The request fixes references to the candidate Artifact, code, data manifest, metrics, validation plan, budget allocation and idempotency key; fixture source is explicit. Fixed fixture scenarios cover a candidate eligible for independent review and a future-data-leakage rejection. This freezes the request shape and fixture labels only; it does not implement quant recomputation, Registry writes or approval. V3.1 remains unaccepted and V3.2 business status remains NOT_RUN.

## 2026-09-25 PromotionRequest submission boundary

Quant intake is available at `POST /v1/promotions` and requires a dedicated `research-automation-service` Bearer identity. Research-automation does not yet construct or submit the request from persisted experiment, Artifact and budget records; the outbound producer remains unimplemented. Its V3.2 workflow and independent recomputation remain NOT_RUN.

## 2026-09-27 PromotionRequest construction preparation

The pure constructor consumes exact UTF-8 data-manifest and validation-plan bytes, validates their strict sidecar schemas, computes each document SHA-256 internally, binds TestRun and experiment identity, and requires the plan to reference the exact manifest hash. Candidate source is derived from the validated plan. The Runner input-bundle parser now extracts the pair from reserved `data/v3.2-data-manifest.json` and `data/v3.2-validation-plan.json` paths, requires both or neither, and checks `dataContentSha256` against a bytewise path-sorted inventory of the other `data/` files. The plan declares exact relative paths for candidate, generated code and metrics outputs. The constructor verifies each published OUTPUT ref against the exact completed Job ID, fencing sourceRef and path-derived artifact ID before assigning its PromotionRequest role.

`V32PromotionRequestPreparer` now assembles that immutable request from injected experiment, Runner Job, budget, ArtifactRef and content-store ports. It checks the content-addressed input artifact bytes, extracts the sidecars, resolves the declared output paths against the completed Job artifacts, and derives stable request/idempotency identities from the job. It reports missing persisted evidence as `WAITING`; `READY_FOR_GATE_CHECK` means evidence is assembled only and cannot bypass V3.1 acceptance or trigger Registry state. Focused preparation tests cover replays and rejection/waiting paths. The full V3.2 code suite passes with Research Automation 122 tests/build. Platform-only `POST /v1/promotions/prepare` invokes the preparer when PostgreSQL-backed repositories are enabled; otherwise it returns 503. An isolated random-PostgreSQL HTTP smoke exercised the full persistence chain and stable replay. This endpoint only assembles evidence and does not submit to Quant.

## 2026-09-27 candidate Artifact delivery

`GET /v1/promotions/{promotionRequestId}/candidate-artifact` is restricted to the distinct `quant-validation-worker` Bearer identity. The durable submission journal exposes a request only after the V3.1 gate was accepted and Quant returned `AWAITING_INDEPENDENT_VALIDATION`; reads recheck the immutable request fingerprint, exact submitted PromotionRequest ID, candidate ArtifactRef identity, output namespace, runner fencing source, and stored content SHA-256. Reads are capped at 8 MiB. Platform and Runner identities cannot call the route. Contract schema, OpenAPI and compatibility rule are versioned. Random PostgreSQL/HTTP smoke passes the not-submitted 404, caller-scope 403 and submitted Worker read/hash checks. This endpoint does not itself start validation or modify Registry. No service token was configured in the active stack.

## 2026-09-27 V3.1 gate and guarded V3.2 submission

The platform-owned V3.1 gate is read using `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION`, independent from the Platform caller token used on Research Automation's inbound routes. `POST /v1/promotions/submit` is scoped to Platform and runs the preparer, exact-run gate reader, durable submission journal, then Quant's immutable `POST /v1/promotions` in that order. A missing/incomplete/unaccepted/mismatched gate returns `WAITING` without opening the journal or calling Quant. A passed gate is bound into the journal by evidence hash; a pending or unknown prior attempt requires exact-key reconciliation. The random-database integration smoke verifies the full path with mock Platform and Quant services, including zero Quant calls while human acceptance is `NOT_RUN`, then one call after a synthetic accepted gate and no duplicate on replay. This synthetic result does not count as user acceptance or real Quant validation.

## 2026-09-27 V3.3 owner-scoped Runner queue read

Research Automation exposes `GET /v1/runner/jobs?testRunId=<uuid>&offset=<n>&limit=<n>` to the Platform API Bearer only. The persistent store filters by the exact `job.testRunId`, orders by submission time and job ID, and bounds pages to 1–100 records; a PostgreSQL expression index covers TestRun/submission/job ordering. The Platform V3.3 proxy first requires the local user session and confirms the exact TestRun is owned by that user and has `stageId=V3.3`; only then does it forward the platform service identity. Unknown query keys, repeated parameters, invalid UUIDs and out-of-range pages fail closed. The response contract is `v3.3-runner-queue-v1`. Unit, PostgreSQL store integration, and HTTP identity/parameter smoke tests cover the slice. This read path does not create TestRuns, dispatch work, or prove V3.3 workload execution; the active service is not deployed with it.
