# V1.4 日线逐单结果与执行规则子集对照

日期：2026-10-07（Asia/Shanghai）

## 结果

回测现在为每笔 BUY/SELL 输出 requestedQuantity、filledQuantity、status 和 reason；BUY 支持 `ZERO_VOLUME`、`INSUFFICIENT_CASH`、`PARTICIPATION_LIMIT`，SELL 保留 `ZERO_VOLUME`、`T_PLUS_ONE`、`PARTICIPATION_LIMIT`。`rejectedOrders` 只计拒绝，`partiallyFilledOrders` 单独统计部分成交。正式 Web 显示新指标。

定向 Quant 单测覆盖无成交量、现金不足、部分买入和 SELL/T+1，20/20 通过。与 Trade Execution 的历史撮合结果比较全成 BUY/SELL、参与率限制部分 BUY（25股）和零成交 `ZERO_VOLUME`；同一输入的成交数量、价格、费用与下一交易 Session 一致。该单测层对照使用同一确定性撮合入口，不经过 Trade HTTP、治理授权或 Portfolio 账本。

## 隔离端到端验证

`pnpm test:integration:v14-backtest` 使用一次性 PostgreSQL、Quant、Platform API 和 Web。5/5 Playwright 测试通过；8 个 Web 创建的 TestRun 均由 `verify:stage -- --stage V1.4 --run <id> --check-only` 针对同一 Run 核验。大额买入 Run `bded944b-deb2-4a4d-9410-1efcfa5bb0b8` 请求100000股、成交989股，结果 `PARTIALLY_FILLED`，剩余原因 `INSUFFICIENT_CASH`；Web和CLI均核验部分成交指标。其本地证据位于 `evidence/local/V1.4/bded944b-deb2-4a4d-9410-1efcfa5bb0b8/`。

`pnpm verify:stage -- --stage V1.4 --suite code` 受控loopback环境退出0，且包含以下实际Trade PostgreSQL持久仓储对照；该脚本独立机器输出PASS：Quant与已持久FakeBroker订单、Fill及Fill Outbox逐单比较 BUY、SELL、部分BUY 和 `ZERO_VOLUME`拒绝；数据库计数为 orders=4、fills=3、fill_outbox=3，零量拒绝无Fill/Fill Outbox。随机PostgreSQL容器和网络已移除并核验。Quant 持久化16组BacktestRun/Manifest，结果 Hash 一致。Platform/Quant 崩溃恢复、取消、相同ID幂等及输入冲突、合成限制、历史日期费率和RAW公司行动场景均通过。随机Compose容器、命名卷和网络均已清理；外部行情与券商调用为0，人工验收仍为 `NOT_RUN`。完整隔离集成JSON和输入SHA清单见[持久任务审计](./2026-10-07-v14-durable-tasks-b026a189be132c0a09b7.md)。

`pnpm verify:stage -- --stage V1.4 --suite code` 在受控本机loopback权限下退出0；普通沙箱运行因Qlib Worker绑定 `127.0.0.1` 返回EPERM，按仓库既有受控重跑流程验证。Quant 19个测试文件97项通过，Python Worker 14项通过；Trade 18个文件85项、Platform 52个文件222项通过。`pnpm docs:check` 检查4908个链接、0失败；合同/Fixture基线检查通过；`git diff --check` 通过。

## 未完成边界

这是确定性小Fixture下的规则子集证据。真实全市场日历、完整CN/US费税/滑点取整、复杂公司行动、完整结算应收及Paper完整业务服务/账本规则对照仍未完成；V1.4阶段和V1版本门禁保持未通过，新增范围人工验收也未签署。
