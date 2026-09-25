# P3.9 Portfolio 账户 OpenAPI 边界

日期：2026-09-25（Asia/Shanghai）。

## 改动

- 新增 `account-initialization-command.schema.json` 和 `account-snapshot.schema.json`，分别约束初始化请求和账户快照。
- Platform API 通过生成的 `InitializeAccountCommand`/`AccountSnapshot` 类型发送和读取 Portfolio 账户边界。
- 新增 `packages/contracts/openapi/portfolio-account.v1.json`，描述初始化、快照查询、服务身份/owner header 及 403/404/409 响应。
- `contracts:check` 新增 OpenAPI 清单检查，确认 operationId、响应集合和 Schema 引用存在。

## 验证

- `pnpm contracts:check`：28 个 JSON、16 个 Schema、8 个 Fixture 实例通过；15 个生成类型、5 条兼容矩阵规则和 2 个 OpenAPI operation 通过。
- Platform/Portfolio typecheck、全仓 build 通过；平台单测 35/35、Portfolio 单测 2/2 通过。
- Platform/Portfolio 容器重建后 `/ready` 返回 `brokerMode=FAKE`。
- 真实账户回归：既有 US 账户详情仍返回 `US_EQUITY / 10000.0000 USD / 1 ledger entry`；同一 V1.1 TestRun 的 US 初始化返回原 accountId 且 `replayed=true`。
- `pnpm v24:preflight` 保持全 PASS，Paper 调度未受影响。

## 状态与边界

P3.9 的账户边界 Schema、OpenAPI 清单、生成类型消费者和真实回归完成。该清单用于契约校验，尚未接入完整 OpenAPI 发布/生成服务器框架；其他服务边界仍需逐项迁移，人工验收仍保持 `NOT_RUN`。
