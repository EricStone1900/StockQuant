# DC-06 多项目交付与共享接口证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖项目边界、共享去重和只读交付接口；正式认证系统、跨项目真实租户和 Web 验收中心仍需部署阶段接入。

## 实现

- `project-delivery.ts`：项目身份/资源归属校验、DATA_READ/DATA_WRITE/DATA_EXPORT 作用域、项目并发配额和公平队列。
- 物理去重键包含 source、market、security、frequency、adjustment、窗口和 adapterVersion；物理结果可共享但授权仍按项目独立校验。
- DataVersion 锁定分页，版本变化返回冲突；导出返回项目、DataVersion、行数和可复算 SHA-256 Manifest。
- 新增 API：`/v2/projects/access`、`/v2/data/page`、`/v2/data/export`、`/v2/data/dedupe-key`。开发烟测使用显式 `x-stockquant-project-id` 和 `x-stockquant-scopes`，不代表生产认证配置。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
pnpm docs:check
pnpm contracts:check
pnpm fixtures:check
```

结果：16/16 单元测试通过；TypeScript、文档、合同和 Fixture 检查通过。HTTP 烟测验证同项目允许、跨项目返回 403、分页返回稳定 DataVersion 游标、导出 SHA-256，以及物理去重键生成。

## 未完成门槛

DC-06 当前为 `IN_PROGRESS`。项目规则和 API 已完成；正式认证/授权中间件、持久配额、公平队列运行指标、分页数据真实存储、导出脱敏和 Web/验收中心 E2E 仍需后续部署交付，不能把开发 Header 烟测当作跨项目人工验收。
