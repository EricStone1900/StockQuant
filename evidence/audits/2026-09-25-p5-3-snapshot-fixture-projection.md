# P5.3 SNAPSHOT 固定 Fixture 执行投影

日期：2026-09-25（Asia/Shanghai）
状态：domain / Fixture工程检查 PASS；FakeBroker/Portfolio 持久业务验收 NOT_RUN；未部署。

## 交付内容

- 冻结 Fixture：`fixtures/v2/v2.4/snapshot-execution/v24-snapshot-cn-paper-execution-v1.json`，SHA-256 `867196c50815dc84f8f9d61035920eba5cf9420e54d37ed3751a72d846a96109`。
- Schema `packages/contracts/schemas/common/v24-snapshot-fixture-execution.schema.json` 锁定 PAPER、FAKE、FIXTURE、证券/市场/时间、价格、费用及预期结果。
- 纯领域函数 `calculateSnapshotFixtureExecution` 只接受首个合格快照，输出 `PROJECTED_ONLY`：CN-A 示例为 100 股、CNY 10.0000、Fixture 测试费 CNY 5.0000。假定全量成交，不应用滑点，不声称成交量参与率已验证。
- 真实行情、LIVE/非FAKE及市场/证券错配均拒绝。当前不产生订单/Fill，也不写 FakeBroker、Portfolio、生产或活动观察库。

## 验证与边界

执行服务单测 **22/22** 通过，覆盖首个快照因果、失败模式、Fixture 成本与固定成交假设、市场币种及隔离拒绝。`pnpm contracts:check`、`pnpm fixtures:check`、`pnpm docs:check` 和 `git diff --check` 通过。

此结果是固定样本的领域投影，不是模拟成交，不是执行政策获批，也不能计入 V2.4 Paper 观察或验收。FakeBroker持久化、Portfolio入账/费用会计、治理授权和账户风控/资源预留尚待完成；OD-007 保持 OPEN，正式策略 HOLD。
