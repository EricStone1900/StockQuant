# C4 / V2.3 Fixture本地学习范围决定

日期：2026-10-24。项目所有者选择C4范围A：把本轮C4交付限定为版本化合成Fixture上的锁版Qlib训练/预测、Artifact追溯、独立复算和边界报告。

## 允许范围

- 仅使用`fixtures/v2/v2.3/qlib-fit/`中`v2.3-qlib-fit-input-1`冻结合成输入。
- 将执行结果标记为`SIMULATION_ONLY`；验证冻结输入、Qlib/LightGBM运行、模型Artifact完整性、24条测试预测与独立复算一致性。
- 复用既有owner-scoped持久TestRun、Artifact、同Run CLI只读核对和脱敏导出工程证据。

## 明确边界

- 不将C3 BaoStock归档或大型日线归档用于训练或推断，也不请求行情/新闻Provider。
- 真实市场研究、真实PIT/历史股票池/公司行动质量、收益或统计有效性、策略候选执行、FakeBroker订单、RD-Agent、Ubuntu实机保持`NOT_RUN`/未启用。
- 本地Artifact重载复算只证明锁定LightGBM版本下已保存模型的推理可复现；它不是独立算法复核或模型质量/盈利验证。API字段`modelValidation`不得因此标记PASS。
- 本范围选择不构成V2.3/V2阶段人工验收签署；用户须在查看具体验收证据后另行确认。

验收结果见[2026-10-24 C4 Fixture验收记录](../../evidence/audits/2026-10-24-v23-c4-fixture-validation.md)。
