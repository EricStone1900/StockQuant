# research-automation-service

V3.1 的最小研究编排边界。当前支持实验请求的校验、幂等创建、查询和取消，并把缺少真实模型凭证或隔离 Runner 的状态明确记录为 `PENDING_PREREQUISITES`。

服务不会调用真实模型、启动 Runner 或连接真实券商。`environmentMode` 固定为 `RESEARCH`，`brokerMode` 固定为 `FAKE`。

本地检查：

```bash
pnpm --filter @stockquant/research-automation-service typecheck
pnpm --filter @stockquant/research-automation-service test
pnpm --filter @stockquant/research-automation-service test:integration
```

当前已增加两个安全边界校验入口：`POST /v1/runner/jobs/validate` 校验不可变镜像 digest、run/experiment namespace、资源限制和网络策略；`POST /v1/artifacts/validate` 校验内容寻址 ArtifactRef。它们只做校验，不启动 Runner、不写 Artifact，也不调用模型。资源契约上限为 2 CPU、4096 MiB、3600 秒、128 个进程；这些是本阶段软件上限，实际 Ubuntu 可用容量仍待验证。

预算组件包含纯内存 `BudgetLedger` 和 PostgreSQL `PgBudgetLedger`。数据库版本使用阶段行锁串行化预留，保留 RESERVED/UNKNOWN 的全部额度，SETTLED 只累计核实费用；重复请求幂等，UNKNOWN 不允许重新预留，只能核实原实验后结算。研究 API 启动时会确保账本表和 V3.1 阶段限额存在。当前实验创建/模型调用链还没有调用预算预留与结算组件，因此这仍是已实现并可单独验证的持久化边界，不是已生效的真实模型费用门禁。

`src/application/v31-runner-launch.ts` 现在提供无副作用的受控 Docker 启动计划：固定 `linux/amd64`、`network none`、只读根文件系统、无能力、非 root、CPU/内存/PID 限制和仅输入/输出两个挂载。目录必须预先存在于 `managedRoot/inputs/{testRunId}/{experimentId}` 与 `managedRoot/outputs/{testRunId}/{experimentId}`，并通过 realpath 校验；计划携带最大运行秒数供可信宿主执行器实施。它只接受 `image@sha256`，拒绝 ALLOWLIST（尚未实现域名级网络隔离），且不会携带继承环境或 Docker Socket。此纯函数返回 `execution=NOT_STARTED`，没有宿主执行器对超时或输出目录配额实施强制；实际执行仍需可信宿主适配器，API 容器不挂载 Docker Socket。

`GET /v1/model-gateway/preflight` 和 `/ready.modelGatewayPreflight` 只检查模式、凭证引用是否存在和 Provider 主机是否精确命中外发 allowlist，不发送模型请求，也不返回凭证值。默认环境会明确返回 `BLOCKED`/`modelCalls=NOT_RUN`。

当前容器仍明确报告 `runner=NOT_CONFIGURED`、`modelGateway=NOT_CONFIGURED` 和 `PENDING_PREREQUISITES`。真实 RD-Agent、模型网关、Artifact 持久化和 Ubuntu Runner 验收不能用这些校验接口替代。

集成测试需要设置 `RESEARCH_AUTOMATION_DATABASE_URL`，只使用唯一测试 `experiment_id`，结束后删除本次测试行，不清理共享数据库或数据卷。
