# P5.2 FakeBroker 幂等载荷完整性

日期：2026-09-25（Asia/Shanghai）
状态：隔离工程验证 PASS；未部署。

## 改动

- `historicalExecutionFingerprint` 以 SHA-256 标识请求语义，涵盖 namespace、account、clientOrderId、证券、数量、bar 时间/价格/成交量及默认化后的 side、order type、TIF、参与率和滑点。
- FakeBroker 在 `(namespace, clientOrderId)` 上获取事务级 advisory lock 后读取既有订单。同键且指纹一致时返回原结果；载荷变化或升级前旧订单缺少指纹时抛出 409，不重新执行。
- 新订单持久化请求指纹。HTTP 冲突映射为 409。
- 新增专用 `trade_execution_test` 数据库入口、显式正式库保护、唯一 namespace 及精确测试行清理。集成脚本设计验证并发相同请求只产生一个订单/成交/事件/outbox、异载荷无副作用和连接重开后的幂等重放。

## 验证

| 检查 | 结果 |
|---|---|
| `pnpm --filter @stockquant/trade-execution-service test` | PASS，2 个文件 / 16 项 |
| `pnpm --filter @stockquant/trade-execution-service typecheck` | PASS |
| `pnpm --filter @stockquant/trade-execution-service build` | PASS |
| `pnpm test:integration:trade-execution` | PASS；专用 `trade_execution_test` DB。并发同键只产生1个订单/Fill/event/outbox；数量、价格异载荷及模拟升级前的无指纹订单均返回409且无新副作用；关闭并重开连接后原结果一致 |
| `pnpm contracts:check` | PASS |
| `pnpm docs:check` | PASS，480链接 |
| `git diff --check` | PASS |

沙箱授权后新增专用 `trade_execution_test` 角色/数据库并通过隔离集成验证；测试创建的唯一 namespace 已清理。正式 `trade_execution` 库、Paper 账户、观察记录和正式 FakeBroker订单未被触碰。该补丁未部署到活动交易执行服务。升级前已存在且没有指纹的订单会在相同键重放时失败关闭；应先查询原订单事实，不能换载荷盲目重试。正式策略、Mandate、风控预留、SNAPSHOT下单与成交链仍未实现，OD-007 继续 OPEN，PAPER 策略维持 HOLD。
