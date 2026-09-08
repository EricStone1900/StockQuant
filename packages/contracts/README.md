# 跨服务契约

状态：S0_SOURCE / NOT_RUN。规范见[ADR-0002](../../docs/decisions/ADR-0002-contract-first-boundary.md)和[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。

`schemas/` 是公共值对象与消息的规范源。当前文件只覆盖 V1.1 开始实现所需的最小边界；TS/Python 类型生成器、OpenAPI、兼容检查和发布流程尚未实现，因此阶段任务不能勾选完成。

规则：

- 金额使用 Decimal 字符串，不使用 JSON number。
- 所有时间戳必须是含偏移的 ISO-8601；业务 Clock 必须显式携带。
- SecurityId 是稳定 UUID，ticker 只作带有效期的别名。
- environmentMode、brokerMode、dataMode、executionModel 分开。
- `LIVE` 保留为长期枚举值，但 V1～V3 的运行时配置和写命令必须拒绝。
- 修改 Schema 后必须重新生成客户端并执行兼容测试；当前仅可运行 JSON 语法检查。
