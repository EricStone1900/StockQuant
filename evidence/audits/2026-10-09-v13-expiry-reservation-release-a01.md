# V1.3 FakeBroker 到期预留释放审计

日期：2026-10-09（Asia/Shanghai）

## 结论

隔离 PostgreSQL 回归通过。Trade Execution 对已确认的订单到期，在同一数据库事务中写入 `EXPIRED` 订单状态、`DAY_WINDOW_CLOSED` 事件和 owner/TestRun/account 绑定的 `RESERVATION_RESOLVE` Outbox。Portfolio 释放仍由 Outbox 投递器执行；Trade 不跨域写 Portfolio 账本。

部分成交订单到期时，如果 Fill Outbox 尚未确认投递，预留释放会等待；最后一笔 Fill 确认后才创建 `EXPIRED` 释放事件。超时进入 `UNKNOWN` 的订单不能再经到期转换释放预留，须先查询原订单。旧的撤单释放证据引用 `fakebroker-cancel:<orderId>` 保持不变。

## 验证

- `pnpm --filter @stockquant/trade-execution-service test`：PASS，18 个文件、91 项单测；隔离 PostgreSQL 目标检查 5/5。
- `pnpm --filter @stockquant/trade-execution-service typecheck`：PASS。
- `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`：PASS；一次性 PostgreSQL 容器绑定随机 loopback 端口，`activeServices=NOT_CONNECTED`，测试脚本完成后清理容器/网络。
- `pnpm verify:stage -- --stage V1.3 --suite code`：exit 0；完整套件日志见[代码套件记录](./2026-10-09-v13-expiry-reservation-release-code-suite-a01.log)及其SHA-256 sidecar。
- 新增数据库断言：到期状态/事件/Outbox 原子落库；部分成交到期等待 Fill Outbox；`UNKNOWN` 不创建释放 Outbox。

## 失败与边界

首轮集成运行发现泛化释放函数改变了既有撤单 evidenceRef，修复后保留原值。随后一轮因新增用例复用了原因果场景账户而影响历史现金断言；将新增用例改为独立账户后最终通过。最初沙箱执行因 Docker socket 权限拒绝未启动容器；经受控提升权限后运行同一隔离脚本。

本审计只关闭 FakeBroker 确认到期时的预留释放与 UNKNOWN 安全边界切片。它不证明日历/交易窗口判断正确、交易 Worker 错过窗口后的重评估、多日/日终调度、完整双市场结算或 V1.3/V1.5 正式验收通过。

## 变更与复现

- `services/trade-execution-service/src/adapters/postgres-fake-broker-repository.ts`
- `services/trade-execution-service/src/application/fill-outbox-delivery.ts`
- `services/trade-execution-service/tests/unit/fill-outbox-delivery.spec.ts`
- `services/trade-execution-service/scripts/test-persistence.mjs`

复现命令见上方验证列表。该审计不包含人工验收、活动数据库操作或真实券商调用。
