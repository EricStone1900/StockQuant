# V1.4 Replay UNKNOWN 原单 namespace 隔离审计

日期：2026-10-10

## 修复

UNKNOWN 恢复此前调用 `GET /internal/v1/orders/{orderId}`，Trade Execution 按全局订单 UUID 返回状态，没有要求调用方绑定持久 ReplayRun 的 namespace。现在新增 Replay 专用 `GET /internal/v1/historical-orders/{orderId}?namespace=...`。数据库查询同时匹配 `order_id` 和 `namespace`；Replay worker 从已保存的 ReplayRun 记录读取 namespace；错误 namespace 返回 404。通用订单详情路由仅允许 Platform API 服务身份，Replay worker 无权调用。UNKNOWN 仍只读原单，不重发订单。

更新文件包括 Trade Execution 服务认证、FakeBroker PostgreSQL Adapter、HTTP bootstrap；Replay Coordinator、downstream client、生成客户端；OpenAPI 合同、生成器与身份/客户端/恢复单测；Trade 服务身份 HTTP+PG smoke。

## 验证

- `pnpm --filter historical-replay-worker test`：9 个测试文件、25 项通过。
- `pnpm --filter trade-execution-service test`：18 个测试文件、96 项通过；独立身份路由测试6/6通过。
- `pnpm --filter historical-replay-worker typecheck`：通过。
- `pnpm --filter trade-execution-service typecheck`：通过。
- `pnpm --filter trade-execution-service build`：通过。
- `node scripts/generate-trade-execution-historical-client.mjs --check`：通过。
- `node scripts/check-openapi-contract.mjs`：通过，Trade historical contract 3 operations。
- `node --check services/trade-execution-service/scripts/service-auth-http-smoke.mjs`：通过。
- `pnpm --filter trade-execution-service test:integration`：exit 0。真实隔离 PostgreSQL/HTTP smoke 中，Replay 对已执行订单以正确 namespace 查询返回200、错误 namespace返回404、Replay 对通用订单路由返回403；其它 Trade readiness 与 P5-P7 Outbox 恢复场景通过。Harness报告活动服务未连接，随机数据库容器/网络清理完成并核验。
- `git diff --check`：通过。

此审计关闭 P3 接受路径清单中的一个 Replay 读路由隔离子项，不代表全V1接受路径、V1.4业务规则、V1总门禁或用户验收完成。

## 阶段级兼容回归

随后执行完整`pnpm verify:stage -- --stage V1.4 --suite code`，exit 0。全仓baseline/build/lint/typecheck/unit、Portfolio/Trade/Market Data隔离PostgreSQL集成、Trade readiness容器边界、Governance/Replay/Quant身份HTTP smoke、V1.4各服务migration ledger、Quant与持久FakeBroker规则对照（10笔订单/9笔Fill/9个Outbox）及报告Artifact fencing均通过。锁版Market Data Python adapter 69/69；随机隔离数据库容器与网络全部清理核验，活动服务`NOT_CONNECTED`。该套件只支持当前V1.4代码兼容结论，不替代完整V1验收。
