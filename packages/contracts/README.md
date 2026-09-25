# 跨服务契约

状态：S0_SOURCE / GENERATED / COMPATIBILITY_CHECKED。规范见[ADR-0002](../../docs/decisions/ADR-0002-contract-first-boundary.md)和[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。

`schemas/` 是公共值对象与消息的规范源。`pnpm contracts:generate` 从这些 Schema 生成 `generated/types.ts`、`generated/types.py`，以及当前 Portfolio 服务使用的本地 TypeScript 投影；`pnpm contracts:check` 会验证 JSON Schema、Fixture 实例、生成物漂移和 `compatibility-matrix.json` 中登记的稳定字段/枚举。OpenAPI 清单已用于 `portfolio-account.v1` 和 V2.4 观察/修订 API；完整发布流程及其他跨服务业务边界仍未实现，因此阶段任务不能勾选全部完成。

规则：

- 金额使用 Decimal 字符串，不使用 JSON number。
- 所有时间戳必须是含偏移的 ISO-8601；业务 Clock 必须显式携带。
- SecurityId 是稳定 UUID，ticker 只作带有效期的别名。
- environmentMode、brokerMode、dataMode、executionModel 分开。
- `LIVE` 保留为长期枚举值，但 V1～V3 的运行时配置和写命令必须拒绝。
- 修改 Schema 后必须重新生成客户端并执行兼容检查；当前 Money/Security、账户初始化命令和账户快照已接入 Platform/Portfolio 边界，并有 `portfolio-account.v1` OpenAPI 清单；其他业务客户端和发布流程仍待后续切片。
