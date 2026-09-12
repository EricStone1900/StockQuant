# DC-06 多项目交付与共享接口证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖项目边界、共享去重和只读交付接口；正式认证系统、跨项目真实租户和 Web 验收中心仍需部署阶段接入。

## 实现

- `project-delivery.ts`：项目身份/资源归属校验、DATA_READ/DATA_WRITE/DATA_EXPORT 作用域、项目并发配额和公平队列。
- `project-access-repository.ts`：PostgreSQL 持久化项目策略、作用域、令牌哈希、激活状态和并发运行计数；数据库启用时 API 必须通过服务端令牌校验。
- 公平队列指标持久化到 `market_data_project_queue_metrics`，分页读取会记录 admitted 计数并可按项目查询。
- 物理去重键包含 source、market、security、frequency、adjustment、窗口和 adapterVersion；物理结果可共享但授权仍按项目独立校验。
- DataVersion 锁定分页，版本变化返回冲突；导出返回项目、DataVersion、行数和可复算 SHA-256 Manifest。
- 导出递归移除 token、projectToken、authorization、sourceCredential 和 rawResponse 字段后再计算 SHA-256。
- 新增 API：`/v2/projects/access`、`/v2/data/page`、`/v2/data/export`、`/v2/data/dedupe-key`。开发烟测使用显式 `x-stockquant-project-id` 和 `x-stockquant-scopes`，不代表生产认证配置。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
pnpm docs:check
pnpm contracts:check
pnpm fixtures:check
```

结果：17/17 单元测试通过；真实 PostgreSQL 集成测试 9/9 通过（项目认证、错误令牌拒绝、并发配额、队列指标）；TypeScript、文档、合同和 Fixture 检查通过。HTTP 烟测验证同项目允许、跨项目返回 403、数据库模式缺失/错误令牌返回 403、分页计入 admitted 指标、导出脱敏后 SHA-256，以及物理去重键生成。

## 未完成门槛

DC-06 当前为 `IN_PROGRESS`。项目规则、持久项目策略/令牌校验、并发配额计数、公平队列指标、分页/导出脱敏和 API 已完成并验证；分页数据真实 Artifact 存储和 Web/验收中心 E2E 仍需后续部署交付。无数据库本地模式仍允许开发 Header，正式数据库模式不会接受 Header scopes 伪造。
