# V1.4 滑点后报价档位对照

日期：2026-10-07（Asia/Shanghai）

## 变更与验证

Trade Execution 历史 FakeBroker 撮合在应用方向性滑点后，按 0.01 报价档保守取整：BUY 向上，SELL 向下。这样与 V1.4 日线 Quant 引擎的分位成交账本一致。增加同一 10.00 元价格、55 bps 滑点下的 CN BUY/SELL 逐单断言，并保留零滑点费用比较。

验证通过：Quant `v14-trade-execution-parity.spec.ts` 6/6；Trade `historical-execution.spec.ts` 10/10；Trade 与 Quant TypeScript typecheck；`pnpm verify:stage -- --stage V1.3 --suite code` 和 `pnpm verify:stage -- --stage V1.4 --suite code` 在受控 loopback 环境均退出0；`git diff --check` 通过。普通沙箱首次门禁运行因 Qlib Worker 绑定临时 `127.0.0.1` socket 返回 EPERM，失败被保留，之后仅在获准的受控环境完成重跑。

## 未完成边界

本切片只覆盖固定 CN 价格/0.01 tick、方向性滑点和回测分位价格的对齐，不证明全市场价格档位或行情撮合规则。费用对照仍未完成：Quant 固定费Fixture与 FakeBroker 比例费用在非零滑点时产生不同费用；现有定向对照只在零滑点样例比较费用。日期适用费率、税费、完整结算与Paper账本全链路仍待P4处理，V1.4保持 `PARTIALLY_IMPLEMENTED`。

