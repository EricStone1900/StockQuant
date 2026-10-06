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

2026-10-01分层增量：V3.1 ArtifactRef类型/不变量位于`src/domain/artifact-ref.ts`，文件内容实现位于`src/adapters/file-artifact-content-store.ts`，应用通过Artifact内容存储与引用仓储ports访问；PostgreSQL ArtifactRef adapter实现仓储port。Research Automation分层扫描纳入`baseline:check`。这是应用边界收敛，不代表跨服务统一Artifact物理存储、通用保留/过期生命周期、活动部署或验收已完成。验证详情见[W1审计](../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.md)。

2026-10-01生命周期增量：V3.1 ArtifactRef支持可选不可变`expiresAt`及`EXPIRED`终态。domain仅允许时间已到且状态为PUBLISHED/RETAINED时生成EXPIRED引用；PG约束阻止提前过期、身份/到期时间修改及EXPIRED复活。Platform TestRun投影保留EXPIRED状态，但仅公开PUBLISHED下载；文件store拒绝读取/发布EXPIRED内容。过期字节仍保留，没有配置清理计划。跨服务统一内容后端、过期策略批准/调度、物理清理、活动部署与人工验收仍未完成。见[W1生命周期审计](../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)。

2026-10-01完整性增量：`FileArtifactStore.read`在返回PUBLISHED/RETAINED字节前验证其SHA-256等于不可变ArtifactRef摘要，损坏内容在Research adapter处即被拒绝，而不只依赖Platform下载路由重复校验。隔离磁盘篡改单测和固定镜像V3.1完整code suite通过，未触碰活动Artifact卷；统一物理存储与其他Producer迁移仍未实现。见[W1 Artifact read-integrity审计](../../evidence/audits/2026-10-01-w1-artifact-read-integrity.md)。

2026-10-02不确定提交回滚保护：Runner输出数据库事务报错后，ArtifactRef查询若失败，不能据此推断元数据未提交。应用现在保留共享字节并输出结构化告警，只有成功查询确认没有持久引用时才尝试清理。V3.1 code suite使用本工作树Research镜像退出0；OD-013仍OPEN，未增加过期调度或物理清理。见[W1不确定提交审计](../../evidence/audits/2026-10-02-w1-artifact-rollback-uncertain-commit.md)及[SHA-256](../../evidence/audits/2026-10-02-w1-artifact-rollback-uncertain-commit.sha256)。

2026-10-01共享内容层增量：新增workspace package `@stockquant/artifact-content-store`，以不可变`namespace/sha256/artifactId`路径存放字节，校验写入/读取Hash并阻止路径穿越和符号链接目录。Research Adapter改用该内核；迁移期可读取并校验旧布局文件，不在读取时搬动旧内容。Compose源配置令Platform API和Research Automation挂载同一`research-artifacts-v1`命名卷，Runner仍无该卷。Platform新建Qlib引用把规范JSON字节写入共享内容卷，PostgreSQL保存owner/TestRun/media/lifecycle/Hash元数据；旧Qlib JSONB记录照旧读取。隔离V2.3真实PostgreSQL/Platform/Quant/Qlib Worker/Web/CLI/Evidence Export烟测通过，两个服务的内容store测试、Platform 145项单测和Research 179项单测通过。测试未重启/读取活动Artifact卷，也未发布新镜像；统一保留策略/物理清理、活动挂载迁移/回退及人工验收仍未完成。审计：[W1共享Artifact内容内核](../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md)。

2026-10-02共享内容删除完整性增量：共享包`remove(address)`现在只在目标仍是普通文件且字节SHA-256匹配不可变地址时删除；缺失目标保持幂等，损坏内容和符号链接均拒绝删除。该门禁是物理清理的安全前置，不提供过期策略审批、元数据引用确认、调度器或并发原子删除协议；服务必须先依据自身元数据生命周期判定清理资格。隔离包测试4/4通过，活动Artifact卷未访问。

2026-10-02回滚清理边界增量：Research失败发布回滚现在只删除新共享内容寻址位置；旧布局文件保持只读兼容，不再因同名新Artifact的回滚而被直接unlink。隔离回归覆盖共享字节清理后同名legacy文件仍存在。过期Artifact清理仍没有生命周期审批/引用检查的统一执行器；旧布局仍需独立迁移或策略化保留方案。

2026-10-02跨服务Promotion提交客户端增量：Research Automation→Quant Research的`POST /v1/promotions`现由`quant-promotions.v1`生成客户端调用；生成器校验operation、ServiceBearer、调用方身份和canonical request/result schema，并接入`contracts:generate/check`。UNKNOWN/error/无效响应继续进入精确幂等键对账，不盲目重试；V3.2业务验证、外部模型调用、Registry审批/激活和人工验收均不由code suite代替。

## 3. 数据与一致性

逻辑持久化：experiments/experiment_steps、candidate_artifacts、promotion_requests、research_checkpoints、budget_allocations、model_call_budgets、runner_jobs、artifact_refs。实验级预算先占用阶段额度；每个模型请求以唯一modelRunId和请求指纹再次预留，DISPATCHED/UNKNOWN金额持续占用实验限额；实际费用确认后逐请求结算，实验汇总不能低于已结算请求费用。网关拥有调用实际成本，本域汇总引用不重复计费。当前请求级账本已通过专用PG测试，注入式调用coordinator通过固定假Provider单测；它尚未接入服务HTTP/Runner工作流，也没有生产Provider和真实供应商用量/账单结算。

事务/幂等：实验输入/代码Hash与轮次稳定；步骤完成/Artifact指针原子发布；恢复不重复发布或晋升；真实LLM重生成不保证相同。

Runner Job持久身份：未指定`roundIndex`的旧版单Job请求继续使用`testRunId:experimentId`；带预算轮次的Job使用`testRunId:experimentId:round-N`。同一实验的各轮可独立入队、查询、接管和幂等重放，改变同一轮不可变Job载荷仍返回冲突。重试身份继续从对应轮次Job派生，保留attempt链。

V3.1当前实现补充：PostgreSQL预算账本以阶段行锁串行化并发预留；UNKNOWN保留全部额度，已核实结算后按实际费用累计；每个实验最多允许12个不同`modelRunId`，此上限持久化并随预算配置一同校验。实验创建、模型调用当前仍未形成真实RD-Agent→Provider生产闭环，Fixture验证不代表真实费用门禁通过。Runner启动计划只允许精确的受管输入/输出目录，拒绝路径穿越及跨run路径；资源软件上限为2 CPU、4096 MiB、3600秒和128 PIDs。启动计划不会执行容器；可信宿主超时强制和输出容量限制仍待实现。

2026-10-06 W7预算账本工程增量：Research Automation的内存账本与PostgreSQL账本增加了每TestRun不可变预算上限绑定；只允许在全局配置上限内设置，配置重放同值幂等、变值冲突，已存在承诺大于新上限时拒绝配置；Experiment预算预留与绑定共用阶段行锁，采用绑定上限或全局上限进行检查。PostgreSQL新增`research_budget_test_run_limits`加法迁移。仅Platform service bearer可通过`POST /v1/runner/budgets/test-run/limit`设定上限；OpenAPI、Schema和Platform生成客户端已接入并经过隔离HTTP/PG验证。上层Platform V3.3 formal workflow尚未调用该API，不能据此声称冻结Fixture的normal/rejection/recovery业务工作流已完成。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 实验创建/查询/取消（实验控制路由） | 固定数据/模型Profile/预算/轮数，202返回run；首轮并发1；实验取消不自动清除UNKNOWN费用。 |
| Runner Job提交/查询/取消 | 平台身份提交和查询；仅平台Bearer可请求精确Job取消。取消持久为`CANCELLED`并清除当前租约，Host后续heartbeat失效后中止执行、清理容器；重复取消幂等，Runner Host无取消权限。 |
| PromotionRequest提交 | 引用精确候选/实验/代码/数据，交quant独立复算；不能调用approve/activate。 |
| 受控Runner任务协议 | 镜像白名单、只读输入、独立输出/资源限额/网络政策；不接受任意宿主挂载。 |

模型调用经统一网关；market-data/quant提供固定数据和评价契约；Qlib实验在隔离镜像运行，quant另做独立候选复算。

Provider出站必须同时满足调用显式授权、精确域名/443 allowlist和网络层强制边界。Runner默认`network=none`；Research Automation只连internal-only backplane，模型Provider流量经单独受限CONNECT代理。代理只接受冻结Provider的精确主机，解析后拒绝特殊用途IPv4并固定连接至已检查地址；配置检查或固定URL本身不构成DNS/路由隔离。当前代码已有该代理原语及单测；工作树Compose已定义internal-only backplane、隔离服务连接及可选双网代理profile，且隔离拓扑由本机canary验证。Provider客户端仍未接线，活动Compose未应用这些更改，模型网关保持关闭，因此不得宣称生产egress已受限。

DeepSeek Chat Provider 与 SiliconFlow Embedding Provider 对无`Content-Length`响应均使用有界流式读取：分别在8 MiB和16 MiB上限处取消响应流并失败关闭，之后才进行严格UTF-8/JSON及模型/usage校验。非成功状态的响应体也会取消而不读取或记录供应商内容。固定端点、redirect拒绝和成本估算均不构成调用授权；真实Provider仍受独立调用授权和网络出口门禁控制。

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

研究服务身份从每个服务的Bearer Token推导；`x-stockquant-service-id`可省略，只在出现时校验是否与Token身份一致，且配置中的凭证必须唯一。route/scope基于Token主体执行。身份HTTP烟测和配置拒绝重复凭证均通过。研究服务还提供默认只读Artifact一致性巡检：只扫描本服务拥有的`research/{run}/{experiment}/{inputs|outputs}`旧布局与SHA-256分层布局，报告缺失PUBLISHED文件、引用Hash不符、近期未登记文件和过期孤儿；共享卷中的Platform/Qlib `research/{testRunId}/qlib-fixture/...`及其它非Research命名空间明确排除。显式维护窗口隔离前会重新校验候选路径、namespace、Artifact ID与内容Hash目录，只将本服务过期孤儿移动到同文件系统的外置隔离目录并写Hash清单，不自动删除。专用PG模拟文件先写、ArtifactRef未提交的崩溃窗口并成功发现孤儿。巡检不等于真实进程强杀/掉电恢复或周期备份，活动Artifact卷从未用隔离模式更改。

研究服务已实现PostgreSQL Runner Job租约/fencing及INPUT/OUTPUT Artifact路径：Runner Host须带当前workerId与fencingToken；服务只返回Job指定的已发布INPUT引用，限制8 MiB并核对SHA-256；OUTPUT发布绑定租约、精确namespace与已发布引用。Runner Host OpenAPI及生成客户端覆盖claim、输入、heartbeat、完成和`POST /v1/artifacts/publish`五个操作；输出发布客户端保留30秒限时、8 MiB/SHA预检与409租约丢失语义。PG事务锁定Runner Job行并在同一事务中持久ArtifactRef和Job产物引用；取消与发布线性排序，取消先提交则不运行文件/引用持久化，发布先获得锁则取消等待并保留已发布引用。平台身份可通过`POST /v1/runner/jobs/{jobId}/cancel`持久取消排队或运行中Job，取消原子记录`CANCELLED`、完成时间并清除租约；取消幂等，Host后续heartbeat及complete因旧租约被拒，执行器中止并删除容器，不允许取消Job被自动重试。Runner Host身份不能调用该路由。`v3.1-runner-input-bundle-v1` JSON契约、校验器、安全materializer、宿主执行器和独立`runner:host`循环入口已实现。临时隔离HTTP+PG smoke实际启动独立Host进程与冻结Docker镜像，贯通claim→INPUT→heartbeat→执行→OUTPUT持久发布→complete，并验证一次Host SIGKILL后的30秒租约过期、fencing token 2接管和旧容器清理；另以60秒固定任务实测取消后容器删除且未发布Artifact。固定离线Runner与恢复证据见[P7.3](../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)及[P7.5](../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。平台Artifact读取需核验实时RunnerJob。活动Artifact卷只读快照副本与当前23个PUBLISHED引用Hash核对通过。上述新Runner和平台读取/取消路由尚未部署到活动服务；Host持续运行、原生Ubuntu、真实RD-Agent/模型/费用及人工V3.1验收仍NOT_RUN。

## V3.2 contract preparation (2026-09-25)

Added `v3.2-promotion-request-v1` and candidate-validation scenario schemas. The request fixes references to the candidate Artifact, code, data manifest, metrics, validation plan, budget allocation and idempotency key; fixture source is explicit. Fixed fixture scenarios cover a candidate eligible for independent review and a future-data-leakage rejection. This freezes the request shape and fixture labels only; it does not implement quant recomputation, Registry writes or approval. V3.1 remains unaccepted and V3.2 business status remains NOT_RUN.

## V3.3 durable Runner checkpoint slice (2026-10-03)

Runner Host OpenAPI and generated client now expose checkpoint persist/read operations. The PostgreSQL adapter stores append-only, TestRun/Experiment/round-bound checkpoints with sequence idempotency, canonical JSON SHA-256 and a 256 KiB state limit; Host recovery materializes the latest verified checkpoint as read-only input, and heartbeat scans/persists the runner's atomically written output checkpoint. The complete V3.3 code suite passes with 207 Research unit tests, 29 Research PostgreSQL integration tests, 6 Platform PostgreSQL integration tests and Web 3/3. The suite remains deterministic Fixture/engineering validation: real RD-Agent checkpoint behavior, Paper continuity, market/provider use and human acceptance are NOT_RUN; this slice does not close V3.3.

## 2026-09-25 PromotionRequest submission boundary

Quant intake is available at `POST /v1/promotions` and requires a dedicated `research-automation-service` Bearer identity. Research-automation does not yet construct or submit the request from persisted experiment, Artifact and budget records; the outbound producer remains unimplemented. Its V3.2 workflow and independent recomputation remain NOT_RUN.

## 2026-09-27 PromotionRequest construction preparation

The pure constructor consumes exact UTF-8 data-manifest and validation-plan bytes, validates their strict sidecar schemas, computes each document SHA-256 internally, binds TestRun and experiment identity, and requires the plan to reference the exact manifest hash. Candidate source is derived from the validated plan. The Runner input-bundle parser now extracts the pair from reserved `data/v3.2-data-manifest.json` and `data/v3.2-validation-plan.json` paths, requires both or neither, and checks `dataContentSha256` against a bytewise path-sorted inventory of the other `data/` files. The plan declares exact relative paths for candidate, generated code and metrics outputs. The constructor verifies each published OUTPUT ref against the exact completed Job ID, fencing sourceRef and path-derived artifact ID before assigning its PromotionRequest role.

`V32PromotionRequestPreparer` now assembles that immutable request from injected experiment, Runner Job, budget, ArtifactRef and content-store ports. It checks the content-addressed input artifact bytes, extracts the sidecars, resolves the declared output paths against the completed Job artifacts, and derives stable request/idempotency identities from the job. It reports missing persisted evidence as `WAITING`; `READY_FOR_GATE_CHECK` means evidence is assembled only and cannot bypass V3.1 acceptance or trigger Registry state. `POST /v1/promotions/prepare` is platform-only and accepts exactly the shared `{testRunId, experimentId}` UUID command; it returns the frozen `WAITING` or `READY_FOR_GATE_CHECK` result schema. OpenAPI and compatibility rules bind the operation, identity and result shape. The route runs only when PostgreSQL-backed repositories are enabled; otherwise it returns 503. An isolated random-PostgreSQL HTTP smoke exercised persistence, strict request validation and stable replay. This endpoint only assembles evidence and does not submit to Quant.

## 2026-09-27 candidate Artifact delivery

`GET /v1/promotions/{promotionRequestId}/candidate-artifact` is restricted to the distinct `quant-validation-worker` Bearer identity. The durable submission journal exposes a request only after the V3.1 gate was accepted and Quant returned `AWAITING_INDEPENDENT_VALIDATION`; reads recheck the immutable request fingerprint, exact submitted PromotionRequest ID, candidate ArtifactRef identity, output namespace, runner fencing source, and stored content SHA-256. Reads are capped at 8 MiB. Platform and Runner identities cannot call the route. Contract schema, OpenAPI and compatibility rule are versioned. Random PostgreSQL/HTTP smoke passes the not-submitted 404, caller-scope 403 and submitted Worker read/hash checks. This endpoint does not itself start validation or modify Registry. No service token was configured in the active stack.

## 2026-09-27 V3.1 gate and guarded V3.2 submission

The platform-owned V3.1 gate is read using `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION`, independent from the Platform caller token used on Research Automation's inbound routes. `POST /v1/promotions/submit` is scoped to Platform and runs the preparer, exact-run gate reader, durable submission journal, then Quant's immutable `POST /v1/promotions` in that order. A missing/incomplete/unaccepted/mismatched gate returns `WAITING` without opening the journal or calling Quant. A passed gate is bound into the journal by evidence hash; a pending or unknown prior attempt requires exact-key reconciliation. The random-database integration smoke verifies the full path with mock Platform and Quant services, including zero Quant calls while human acceptance is `NOT_RUN`, then one call after a synthetic accepted gate and no duplicate on replay. This synthetic result does not count as user acceptance or real Quant validation.

## 2026-09-27 V3.3 owner-scoped Runner queue read

Research Automation exposes `GET /v1/runner/jobs?testRunId=<uuid>&offset=<n>&limit=<n>` to the Platform API Bearer only. The persistent store filters by the exact `job.testRunId`, orders by submission time and job ID, and bounds pages to 1–100 records; a PostgreSQL expression index covers TestRun/submission/job ordering. The Platform V3.3 proxy first requires the local user session and confirms the exact TestRun is owned by that user and has `stageId=V3.3`; only then does it forward the platform service identity. Unknown query keys, repeated parameters, invalid UUIDs and out-of-range pages fail closed. The response contract is `v3.3-runner-queue-v1`. Unit, PostgreSQL store integration, and HTTP identity/parameter smoke tests cover the slice. This read path does not create TestRuns, dispatch work, or prove V3.3 workload execution; the active service is not deployed with it.

W7 TestRun and round budget enforcement (2026-10-01): the TestRun-scoped ceiling is enforced transactionally with per-Experiment round allocations. RESERVED and UNKNOWN consume the full amount in their assigned round; SETTLED consumes verified actual cost, and allocations cannot transfer between rounds. The owner-scoped summary exposes exact `stageBudgetControl=TEST_RUN_AND_ROUND_CAP_ENFORCED`, including first-page TestRun totals and keyset continuation. An isolated HTTP/PostgreSQL smoke verified over-cap rejection, UNKNOWN retention, pagination and caller separation with zero model/Paper calls; a 66,100-row synthetic capacity probe is only a hot-cache microbenchmark. V3.3 scenario orchestration and business acceptance remain incomplete. See [W7 proxy integration audit](../../evidence/audits/2026-10-01-w7-v33-budget-proxy-integration.md).

2026-10-02：SiliconFlow Embedding无`Content-Length`响应执行16 MiB有界流读取；DeepSeek Chat响应执行8 MiB有界流读取，越限即取消，避免先完整缓冲后拒绝。两路径通过Fixture流测试，不包含真实Provider访问；成本只按版本化tariff估算，真实调用授权与生产egress门禁独立。

2026-10-06 V3.3模型调用账本派生Experiment结算：Platform专用Bearer endpoint仅接收TestRun UUID与期望轮数；PostgreSQL事务锁定stage/Experiment allocation，校验Experiment绑定的TestRun和round数量，并要求每个roundIndex恰有一笔SETTLED模型调用且无RESERVED/DISPATCHED/UNKNOWN调用。结算金额由不可变model-call ledger求和，不接受调用方金额；幂等重试要求既有结算金额与账本相同。隔离PG集成覆盖成功、幂等、错TestRun与UNKNOWN拒绝；完整跨服务证据见[W7结算审计](../../evidence/audits/2026-10-06-w7-v33-experiment-ledger-settlement.md)。结算事实仅证明Fixture/model-call ledger一致，不表示Provider invoice reconciliation。
