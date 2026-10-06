# W1 Market Data 项目数据交付生成客户端

日期：2026-10-01（Asia/Shanghai）

Platform 的 DC-06 项目分页与脱敏导出调用已迁移到由 `market-data-project-delivery.v1` OpenAPI 生成的客户端。新增分页/导出请求与响应Schema、ProjectToken身份方案、生成器漂移检查及集成 smoke 入口。请求身份通过 `x-stockquant-project-id` + `x-stockquant-project-token`；无项目凭证时不再发送不可信的 `x-stockquant-scopes` 自报权限。Compose 和 `.env.example`增加同一随机项目凭证的配对配置名，不包含实际凭证。

执行与结果：

- `pnpm contracts:check`：PASS；211 JSON、146 Schema、36 Fixture；生成契约检查包括新增2个OpenAPI操作。
- `pnpm --filter @stockquant/platform-api-service typecheck`：PASS；Platform全量单测139项PASS。
- `pnpm test:integration:market-data`：PASS；Market Data PostgreSQL集成23项PASS、分钟分区恢复 smoke PASS；随后构建当前Market Data/Platform源码并通过真实隔离HTTP+PostgreSQL DC-06 smoke。
- Smoke 随机项目 `dc06-http-smoke-d78f034f-3506-41c8-8f42-d83338480129`：分页200、导出200（2行、脱敏与SHA-256断言通过）、无凭证401、跨项目403。仅更新隔离`market_data_test`中的随机项目/队列统计，结束时按精确项目ID清理；无行情、Provider、Paper或订单调用。
- 普通沙箱回环监听不可用，因此隔离HTTP命令按已有授权在本机受控运行。

保留的失败与更正：首次真实HTTP运行发现Market Data将缺项目凭证错误映射为403，违反契约401语义；修正错误映射后，下一次仍读到旧`dist`并重复失败。集成入口现先构建Market Data再执行 smoke。复跑使用当前构建后通过。实现错误和旧构建失败均保留在执行历史中。

该增量仅完成一个跨服务客户端边界及其隔离验证，不改变DC-06历史人工签署、W1整体状态或任何版本门禁；活动API发布/回退和新增人工验收仍未完成。

V1.1全量Code suite交叉回归（2026-10-01）：普通沙箱再次在Quant Research Worker临时loopback端口绑定处失败（exit 1，`PermissionError`），按已授权受控本机权限重跑同一`pnpm verify:stage -- --stage V1.1 --suite code`后exit 0。受控结果包含baseline/docs/contracts/fixtures、全仓构建/lint/typecheck/unit及V1.1隔离存储/Web/恢复适用回归；新增Market Data项目交付客户端生成器无漂移。受限运行失败保留，未更改活动服务、行情授权、Paper或订单。

计划/架构/验收状态同步（2026-10-01）：Platform与Market Data服务架构、V1.1阶段文件、V1计划和V1验收表已登记该项目分页/导出客户端与验证范围，继续明确完整客户端发布、通用Artifact生命周期、活动API切换/回退及新增范围人工验收未完成。`pnpm docs:check`通过（1,701本地链接）；`pnpm baseline:check`通过（211 JSON、146 Schema、36 Fixture，生成器/兼容检查通过）。W9复核：V1/V2/V3 `verify:version`均为INCOMPLETE/exit 2；证据引用校验分别PASS（V1 27引用/2 Manifest/3条目，V2 129/16/17，V3 113/19/19），缺失或哈希失败均0；门禁与引用核验是不同事实。
