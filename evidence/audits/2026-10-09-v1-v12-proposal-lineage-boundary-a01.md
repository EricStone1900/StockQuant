# V1.2 Qlib Artifact 到 V1.3 Paper Proposal 血缘边界审计

日期：2026-10-09。范围：只核对 V1.2 真实 Qlib 输出、Governance 研究快照、V1.3 Proposal/授权之间的当前链路；不创建或审批策略、不发送订单。

## 已验证事实

- V1.2 的 `V12AcceptanceService` 基于冻结 `v1.2-market-data-4` 输入执行 CN_A 与 US_EQUITY Qlib fit；生成策略 Artifact 后，向 Governance 发送两个不可执行的策略快照。快照含 owner、TestRun、Artifact ID/SHA、Fixture/Data/Factor 版本、策略 ID/hash、asOf、模式和 targets。
- Governance `governed_strategy_snapshots` 以 `(owner_id,test_run_id,strategy_id)` 唯一约束持久化快照；内容相同重试幂等、冲突内容拒绝。该接收路由只写快照收件箱，不创建 Proposal 或执行授权。
- 真实容器隔离 E2E 报告 `2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-a18684ac24a671e63a05.json` 状态 PASS，数据库断言为 `[2,0,0,0]`：normal Run 收到两条快照；未来数据拒绝 Run 收到零条；总 Proposal 数与执行授权数均为零。报告还绑定四个 TestRun UUID 和 Qlib 双市场真实 fit/predict 结果。
- V1.3 Paper Proposal 当前采用固定测试 `strategyVersion: fixture-manual-test-v1`；AUTO 测试另用 `fixture-auto-policy-test-v1`。Proposal 合同保存字符串版本，但没有读取 Governance 的 V1.2 快照并绑定 source Artifact/hash 的必需字段/校验。
- 项目决定 OD-007 只确认 NO_TRADE 只读观察基线；TopK 持有期、再平衡、组合、资金/风险费用、市场/证券及来源用途尚未批准。不能把 V1.2 TopK 快照直接当成可交易策略或活动 Mandate。

## 结论与待办

V1.2 的 Artifact→Governance 快照血缘已验证；V1.2→V1.3 Proposal/Run 的策略来源血缘尚未建立。当前固定 V1.3 模拟链路使用单独 Fixture 策略，隔离于 Qlib 输出。P2不能标为完全通过：先由所有者明确是否需要“仅隔离测试、FakeBroker、同一 owner/TestRun、不可激活”的 Qlib快照→Proposal来源绑定，以及所需持有/再平衡语义；若批准，再补合同、Governance验证和跨服务同Run断言。OD-007未批准前不得启用 TopK、创建活动 Mandate 或接入真实/活动账户。

## 证据

- 实际执行及数据库断言：[V1.2 Qlib E2E JSON](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-a18684ac24a671e63a05.json)。
- V1.2实现：`services/platform-api-service/src/application/v12-acceptance.ts`。
- Governance收据：`services/decision-governance-service/src/application/governance-api.ts`、`src/adapters/postgres-strategy-snapshot-repository.ts`。
- V1.3独立策略输入：`services/platform-api-service/src/application/v13-trading.ts`。
- 策略批准边界：[OD-007](../../docs/decisions/open-decisions.md)、[Fixture/活动策略边界审计](./2026-10-09-v1-fixture-vs-active-strategy-a01.md)。

该报告是链路审计，不代表 P2、V1.2 或 V1 通过，也不改变任何历史人工签署。
