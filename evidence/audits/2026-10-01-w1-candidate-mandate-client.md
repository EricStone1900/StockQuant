# W1 Platform → Decision Governance 候选 Mandate 生成客户端

日期：2026-10-01（Asia/Shanghai）

## 变更

- 基于 `packages/contracts/openapi/decision-governance-candidate-mandate.v1.json` 生成 Platform 客户端，固定 operation、请求/响应 schema、`platform-api-service` 身份和 Bearer 安全要求。
- V3.2 Platform 只读候选绑定路径改为调用生成客户端；保留本地用户身份、所属正常 V3.1 TestRun 和已接受状态门禁，以及 Governance 403/422/503 到 Platform 错误映射。
- 新增 `scripts/generate-candidate-mandate-client.mjs` 并接入 `contracts:generate` / `contracts:check`，漂移时失败关闭。
- 仅执行准确版本/候选 Artifact 一致性查询，不创建 Mandate、不启用策略、不触发Paper交易或市场数据请求。

## 验证

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v32-acceptance.spec.ts`：8/8通过。
- `pnpm --filter @stockquant/platform-api-service test`：33文件、116/116通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：通过。
- `pnpm --filter @stockquant/platform-api-service lint`：通过（脚本执行TypeScript no-emit检查）。
- `pnpm contracts:check`：通过；177 JSON、116 schema、36 Fixture、生成器漂移、98 consumer rules及19 OpenAPI文档检查通过。
- `pnpm docs:check`：1601本地链接通过。

## 边界

此为代码与契约回归证据，不代表跨容器E2E、活动API发布或用户验收。没有访问活动服务、数据源、Provider或Broker；NO_TRADE及无数据源授权维持。W1/W9及版本验收仍未完成。
