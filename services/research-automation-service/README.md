# research-automation-service

V3.1 的最小研究编排边界。当前支持实验请求的校验、幂等创建、查询和取消，并把缺少真实模型凭证或隔离 Runner 的状态明确记录为 `PENDING_PREREQUISITES`。

服务不会调用真实模型、启动 Runner 或连接真实券商。`environmentMode` 固定为 `RESEARCH`，`brokerMode` 固定为 `FAKE`。

本地检查：

```bash
pnpm --filter @stockquant/research-automation-service typecheck
pnpm --filter @stockquant/research-automation-service test
pnpm --filter @stockquant/research-automation-service test:integration
```

当前已增加两个安全边界校验入口：`POST /v1/runner/jobs/validate` 校验不可变镜像 digest、run/experiment namespace、资源限制和网络策略；`POST /v1/artifacts/validate` 校验内容寻址 ArtifactRef。准备层还提供 `POST /v1/runner/jobs`、状态查询和 `POST /v1/artifacts/publish`：Runner 状态与 ArtifactRef 写入 PostgreSQL，Artifact 内容写入 Compose 命名卷，发布按 SHA-256 幂等。它们只建立持久化和安全边界，不启动 Runner、不调用模型。资源契约上限为 2 CPU、4096 MiB、3600 秒、128 个进程；这些是本阶段软件上限，实际 Ubuntu 可用容量仍待验证。

Runner 生命周期回写入口为 `POST /v1/runner/jobs/{jobId}/start` 和 `POST /v1/runner/jobs/{jobId}/complete`。状态机只允许 `QUEUED -> RUNNING -> terminal`，terminal 可为 `COMPLETED`、`FAILED`、`TIMED_OUT`、`OUTPUT_LIMIT` 或 `SPAWN_FAILED`；回写前校验退出码、信号、耗时和 stdout/stderr 总量（最多 8 MiB），并要求关联的 RUN_LOG/METRICS/ERROR/CANDIDATE ArtifactRef 已发布且位于本 Job 的 output namespace。失败结果和 Artifact 引用保留在 PostgreSQL，非法转换或超限结果拒绝。`POST /v1/runner/jobs/{jobId}/retry` 只接受 terminal Job，生成新的 `:retry-{attempt}` Job，旧尝试和 Artifact 不覆盖；重复 retry 幂等。接口只接收可信宿主回调，当前不会由 API 容器自行启动 Docker。

预算组件包含纯内存 `BudgetLedger` 和 PostgreSQL `PgBudgetLedger`。数据库版本使用阶段行锁串行化预留，保留 RESERVED/UNKNOWN 的全部额度，SETTLED 只累计核实费用；重复请求幂等，UNKNOWN 不允许重新预留，只能核实原实验后结算。生产HTTP接口不接受调用者直接提交结算金额；`POST /v1/experiments/:id/budget/settle`仅在`NODE_ENV=test`且显式启用`STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`时可用，避免绕过Provider账单核实释放UNKNOWN预算。每实验最多允许12个不同的`modelRunId`，限制与预算限额一同持久化并在重启后校验；重复相同ID仍幂等，不消耗额外次数。研究 API 启动时确保账本表及V3.1阶段限额存在。当前`POST /v1/experiments`通过`ExperimentService.create`先预留实验预算，再保存实验；Runner Job入队前会校验该实验绑定的TestRun和`RESERVED`预算。取消尚未执行的实验会将已知未使用额度结算为0，UNKNOWN保持保留。预算写入失败时实验不会创建，实验保存冲突会将对应预留拒绝；阶段行锁和集成测试验证了并发预留不超过V3.1聚合限额。

除上述V3.1全阶段与实验级上限外，现已按`STOCKQUANT_RESEARCH_MAX_TEST_RUN_BUDGET_CENTS`实施累计TestRun预留硬限制，并按实验声明的1–3轮数平均分配固定轮次额度（余数按轮次顺序分配）。两层限制均在阶段行锁内原子检查；RESERVED/UNKNOWN按全额计，SETTLED按核实实际费用计；超限调用在模型派发前拒绝。单轮归属使用显式`roundIndex`，多轮请求缺少轮次、越界或尝试跨轮复用run ID均拒绝。UNKNOWN保留在原轮，不向其他轮转移额度。TestRun上限默认1000美分且不得超过阶段额度；Compose透传配置并在重启时比对PostgreSQL固定限额。旧实验绑定会从`research_experiments.test_run_id`回填。TestRun预算汇总按唯一Experiment分页返回每轮额度、已用和UNKNOWN预留；仅第一页返回总计。验证仍是隔离Fixture/PG，不证明真实Provider账单核对、正式业务工作流或Paper连续性。

W7场景编排前置：预算账本现可为具体TestRun持久化一个更严格的不可变上限，最大值不得超过服务级硬上限。配置和预留都在阶段锁内串行化；重复绑定相同数值幂等，绑定不同数值或低于已有承诺会拒绝。加法迁移创建`research_budget_test_run_limits`。Platform身份可通过`POST /v1/runner/budgets/test-run/limit`设置该值；OpenAPI/Schema和生成客户端参与漂移检查。隔离HTTP/PG场景验证匿名/Runner拒绝、幂等、变更冲突、超过cap不落Experiment/Reservation、旧承诺保留。Platform高层V3.3正式业务工作流尚未调用该接口，Web/CLI三场景仍为准备态。

`src/application/v31-runner-launch.ts` 现在提供无副作用的受控 Docker 启动计划：固定 `linux/amd64`、`network none`、只读根文件系统、无能力、非 root、CPU/内存/PID 限制和仅输入/输出两个挂载。目录必须预先存在于 `managedRoot/inputs/{testRunId}/{experimentId}` 与 `managedRoot/outputs/{testRunId}/{experimentId}`，并通过 realpath 校验；计划携带最大运行秒数供可信宿主执行器实施。它只接受 `image@sha256`，拒绝 ALLOWLIST（尚未实现域名级网络隔离），且不会携带继承环境或 Docker Socket。此纯函数返回 `execution=NOT_STARTED`，没有宿主执行器对超时或输出目录配额实施强制；实际执行仍需可信宿主适配器，API 容器不挂载 Docker Socket。

`src/application/v31-runner-host-adapter.ts` 提供独立的可信宿主适配边界：先写入 `RUNNING`，再执行已校验的启动计划，发布输出 ArtifactRef，最后写入一个终态回调；宿主执行器异常会转换为 `SPAWN_FAILED` 并保留错误。该模块不被 HTTP 服务自动调用，也不改变当前 `RUNNER_MODE=NOT_CONFIGURED` 的默认状态；接入真实 Ubuntu 控制器前仍需提供受控的生命周期 Sink、固定镜像和实际宿主权限证明。

`GET /v1/model-gateway/preflight` 和 `/ready.modelGatewayPreflight` 只检查模式、凭证引用是否存在、独立 `STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED` 显式授权及 Provider 主机是否精确命中外发 allowlist，不发送模型请求，也不返回凭证值。授权默认 `false`；即使改为 `true`，缺少运行时适配器、账单对账或可强制的DNS/出口边界时仍保持 `BLOCKED`/`modelCalls=NOT_RUN`。

测试环境可显式设置 `NODE_ENV=test` 与 `STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`，启用 `/v1/model-gateway/fixture/openai/v1/chat/completions` 和 `/v1/model-gateway/fixture/openai/v1/embeddings`。这些兼容端点只返回固定 Fixture 响应并走同一预算账本；非测试环境返回 404。`pnpm v31:litellm-model-gateway-internal-smoke` 使用锁定 Runner/LiteLLM 镜像、内部 Docker 网络和临时 PostgreSQL 验证两种客户端协议与费用结算；运行时必须提供 `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:...` 精确固定本地服务镜像。此项验证不证明 RD-Agent 控制器、真实 Provider、外部账单或生产运行链已接通，也不授权外呼。

当前容器仍明确报告 `runner=NOT_CONFIGURED`、`modelGateway=NOT_CONFIGURED` 和 `PENDING_PREREQUISITES`。真实 RD-Agent、模型网关、Artifact 持久化和 Ubuntu Runner 验收不能用这些校验接口替代。

集成测试需要设置 `RESEARCH_AUTOMATION_DATABASE_URL`，只使用唯一测试 `experiment_id`，结束后删除本次测试行，不清理共享数据库或数据卷。
