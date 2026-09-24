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

预算组件包含纯内存 `BudgetLedger` 和 PostgreSQL `PgBudgetLedger`。数据库版本使用阶段行锁串行化预留，保留 RESERVED/UNKNOWN 的全部额度，SETTLED 只累计核实费用；重复请求幂等，UNKNOWN 不允许重新预留，只能核实原实验后结算。研究 API 启动时会确保账本表和 V3.1 阶段限额存在。当前实验创建/模型调用链还没有调用预算预留与结算组件，因此这仍是已实现并可单独验证的持久化边界，不是已生效的真实模型费用门禁。

`src/application/v31-runner-launch.ts` 现在提供无副作用的受控 Docker 启动计划：固定 `linux/amd64`、`network none`、只读根文件系统、无能力、非 root、CPU/内存/PID 限制和仅输入/输出两个挂载。目录必须预先存在于 `managedRoot/inputs/{testRunId}/{experimentId}` 与 `managedRoot/outputs/{testRunId}/{experimentId}`，并通过 realpath 校验；计划携带最大运行秒数供可信宿主执行器实施。它只接受 `image@sha256`，拒绝 ALLOWLIST（尚未实现域名级网络隔离），且不会携带继承环境或 Docker Socket。此纯函数返回 `execution=NOT_STARTED`，没有宿主执行器对超时或输出目录配额实施强制；实际执行仍需可信宿主适配器，API 容器不挂载 Docker Socket。

`src/application/v31-runner-host-adapter.ts` 提供独立的可信宿主适配边界：先写入 `RUNNING`，再执行已校验的启动计划，发布输出 ArtifactRef，最后写入一个终态回调；宿主执行器异常会转换为 `SPAWN_FAILED` 并保留错误。该模块不被 HTTP 服务自动调用，也不改变当前 `RUNNER_MODE=NOT_CONFIGURED` 的默认状态；接入真实 Ubuntu 控制器前仍需提供受控的生命周期 Sink、固定镜像和实际宿主权限证明。

`GET /v1/model-gateway/preflight` 和 `/ready.modelGatewayPreflight` 只检查模式、凭证引用是否存在和 Provider 主机是否精确命中外发 allowlist，不发送模型请求，也不返回凭证值。默认环境会明确返回 `BLOCKED`/`modelCalls=NOT_RUN`。

当前容器仍明确报告 `runner=NOT_CONFIGURED`、`modelGateway=NOT_CONFIGURED` 和 `PENDING_PREREQUISITES`。真实 RD-Agent、模型网关、Artifact 持久化和 Ubuntu Runner 验收不能用这些校验接口替代。

集成测试需要设置 `RESEARCH_AUTOMATION_DATABASE_URL`，只使用唯一测试 `experiment_id`，结束后删除本次测试行，不清理共享数据库或数据卷。
