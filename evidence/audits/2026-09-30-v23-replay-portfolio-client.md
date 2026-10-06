# V2.3 Historical Replay Portfolio Account 生成客户端增量

日期：2026-09-30。范围：Historical Replay Worker对Portfolio账户初始化和账本快照的跨服务调用。

将现有`portfolio-account.v1`五操作OpenAPI客户端生成到Historical Replay Worker，加入该消费者生成类型，并把单Bar/多Bar回放中账户初始化、每Bar账本提交屏障和最终快照四类手写HTTP调用迁移到客户端。随后也将历史FakeBroker下单调用迁移到`trade-execution-historical.v1`生成客户端，保持`historical-replay-worker`独立Bearer身份，并保留HTTP错误状态和原始错误体。类型化响应发现并修正一个既有状态读取缺陷：Trade Execution结果中的状态位于`result.status`，回放因果屏障之前读取顶层`status`。初始化幂等键、owner范围与账本版本比较逻辑保持不变。

验证结果：

| 命令 | 结果 | 证据 |
|---|---|---|
| `pnpm contracts:generate` / `pnpm contracts:check` | PASS | Portfolio Account客户端生成至Platform、Trade Execution、Historical Replay；Historical FakeBroker客户端由OpenAPI生成并完成漂移检查；Governance Registry客户端同步检查 |
| Historical Replay build与unit | PASS，退出0 | 构建通过；7文件20项单测通过，含两种生成客户端调用/拒绝状态测试 |
| `pnpm verify:stage -- --stage V2.3 --suite code` | PASS，受控loopback权限下退出0 | 合同/Fixture、全仓质量检查、Replay/Portfolio/Governance/Quant隔离PG/HTTP边界、历史执行三场景及真实锁版Qlib合成Fit冒烟通过；V2.3限定隔离测试结果PASS |

没有请求市场数据，没有改变活动部署；Qlib只使用固定合成Fixture，AMD64容器在Apple Silicon上仿真，不构成真实市场训练、容量、Ubuntu或盈利证据。原回放TestRun/人工作业范围保留，不将本增量扩大为V2.3研究通过或阶段重新签收。
