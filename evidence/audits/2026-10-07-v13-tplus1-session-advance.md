# V1.3 持久交易日推进与 T+1 卖出闭环

日期：2026-10-07（Asia/Shanghai）  
验证命令：`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated`  
结果：随机 Compose 项目 `sq-v13-web-c0bc6bf6c19718dca023` 下 Playwright 21/21 通过；Web/API/CLI 对同一 TestRun 核验，FakeBroker 模式，外部行情和真实券商调用均为 0。Harness 清理并验证项目容器、卷、网络、镜像为 0。完整 Code suite `pnpm verify:stage -- --stage V1.3 --suite code` 在受控本机 loopback 环境退出 0。`pnpm contracts:check`、`pnpm docs:check` 和 `git diff --check` 通过；Markdown 链接检查 4909 条、0 失败。

新增 L01/L05 正反场景先在 2026-09-28 Fixture Session 买入 100 股；同 Session SELL 被拒，未创建 FakeBroker 订单或改变账户；随后通过正式 Web 控制在版本化日历 `sse-cn-a-share-2026-1` 推进到下一合法 Session 2026-09-29。推进事件持久化、带序号并幂等重放。SELL 成交 100 股、价格 10.00 CNY、费用 5.00 CNY，成交时间为下一 Session；Portfolio 与独立 FakeBroker 最终现金均为 9990.0000 CNY、持仓均为空，预留 CAPTURED、差异为空。同一 TestRun 的 CLI `--check-only` 通过。

完整 21 项矩阵的 T+1 关键 Run：[`325a26ff-0f66-4ff2-8d4b-35944ae26f7d`](../local/V1.3/325a26ff-0f66-4ff2-8d4b-35944ae26f7d/evidence.json)，Manifest SHA-256 为 `4ce29b59f8188e10df45fa8a2dd8eab3830080520e556644db53631854d3bce8`。单项定向复验 Run：[`c3384c64-9aa1-41fc-a0d8-1ebd90ad57ff`](../local/V1.3/c3384c64-9aa1-41fc-a0d8-1ebd90ad57ff/evidence.json)，Manifest SHA-256 为 `798db0a65f61e9d83fb03a9f471c3fb09e6495e8bb630898447297f91486b175`。

相关实现快照 SHA-256 清单：[源码与测试清单](./2026-10-07-v13-tplus1-session-advance.sha256)。

首次全矩阵因未传入 L08 专用故障注入开关而有 1 项失败；开启固定的一次性故障后重跑为 21/21。此前失败结果保留。手工用户验收仍为 `NOT_RUN`，本次不改变历史签署。V1.3 仍为 `PARTIALLY_IMPLEMENTED`：全市场规则覆盖、交接手册和本轮用户验收未完成；V1 版本门禁不因本次测试而放行。
