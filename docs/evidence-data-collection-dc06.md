# DC-06 多项目交付与共享接口证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖项目边界、共享去重、持久项目策略和 Artifact 分页交付；正式 Web 验收中心仍需部署阶段接入。

## 实现

- `project-delivery.ts`：项目身份/资源归属校验、DATA_READ/DATA_WRITE/DATA_EXPORT 作用域、项目并发配额和公平队列。
- `project-access-repository.ts`：PostgreSQL 持久化项目策略、作用域、令牌哈希、激活状态和并发运行计数；数据库启用时 API 必须通过服务端令牌校验。
- 公平队列指标持久化到 `market_data_project_queue_metrics`，分页读取会记录 admitted 计数并可按项目查询。
- 物理去重键包含 source、market、security、frequency、adjustment、窗口和 adapterVersion；物理结果可共享但授权仍按项目独立校验。
- DataVersion 锁定分页，版本变化返回冲突；导出返回项目、DataVersion、行数和可复算 SHA-256 Manifest。
- 导出递归移除 token、projectToken、authorization、sourceCredential 和 rawResponse 字段后再计算 SHA-256。
- 新增 `ArtifactDeliveryRepository`：Artifact 行持久化到 `market_data_artifact_rows`，按项目和不可变 DataVersion 分页；跨项目读取和版本冲突均拒绝。
- 新增 API：`/v2/projects/access`、`/v2/data/page`、`/v2/data/artifact-rows`、`/v2/data/artifact-page`、`/v2/data/export`、`/v2/data/dedupe-key`。数据库模式使用服务端令牌；仅无数据库的本地开发模式允许 Header scopes。
- 平台验收代理 `/api/v1/acceptance/v2/dc06` 和 Web 页面 `/acceptance/v2/dc06` 已接入正常、跨项目拒绝、错误令牌恢复三个场景；项目令牌只在平台服务端配置，不下发浏览器。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
pnpm docs:check
pnpm contracts:check
pnpm fixtures:check
```

结果：17/17 单元测试通过；真实 PostgreSQL 集成测试 10/10 通过（项目认证、错误令牌拒绝、并发配额、队列指标、Artifact 行隔离、分页恢复和 DataVersion 冲突）；平台 API/Web TypeScript 和生产构建通过；DC-06 Playwright 浏览器场景 1/1 通过。HTTP 烟测验证 Artifact 写入、单页读取、错误令牌返回 403、同项目授权和物理去重键链路。

## 未完成门槛

DC-06 当前为 `IN_PROGRESS`。项目规则、持久项目策略/令牌校验、并发配额计数、公平队列指标、真实 Artifact 分页、导出脱敏、平台验收代理和 Web 场景已完成并验证；剩余为用户人工验收签字。无数据库本地模式仍允许开发 Header，正式数据库模式不会接受 Header scopes 伪造。
