# C4 / V2.3 Qlib 研究输入与验证缺口复核

日期：2026-10-24。类型：只读证据盘点与阶段路由更新；没有调用行情/新闻Provider、启动Qlib模型、生成TestRun或改动业务数据库。

## 结论

C3已按所有者批准的本地学习范围收口。C4的实现基础存在：锁版Qlib 0.9.6/LightGBM 4.7.0曾在隔离Worker上对冻结合成Fixture执行`LGBModel.fit/predict`，V2.3回放也已在C3批准的单次小样本上经FakeBroker跑通。现有证据不足以宣称V2.3完成真实市场研究或独立模型验证；阶段仍`PARTIALLY_IMPLEMENTED`。

真正市场数据Qlib研究当前受输入用途边界阻断。C3单次决定仅允许指定本地档案、一次性有界回放及30日留存，没有授予C4训练/研究用途。未经新的精确用途决定，不将该档案喂给模型。

## 现有输入和证据

| 输入/能力 | 已证事实 | C4可支持的范围 | 不能支持的结论 |
|---|---|---|---|
| `fixtures/v2/v2.3/qlib-fit/` | 冻结Manifest `v2.3-qlib-fit-input-1`；120行合成数据，72/24/24时间切分，`SIMULATION_ONLY`；Qlib隔离训练曾生成24个有限预测且重复Hash一致 | 重验或扩展Qlib工程路径、输入/Artifact绑定、因果切分工程和Fixture-only模拟流程 | 真实市场研究、收益、PIT、股票池覆盖或模型独立验证 |
| C3本地BaoStock上下文归档 | 3证券、5个交易日、720根RAW 5分钟Bar；截至2026-11-21留存；OD-008决定只针对一次有限FakeBroker回放 | 已有C3回放证据，不自动提供额外研究用途 | 不够组成训练/验证/测试窗口；没有权威逐Bar停复牌/限价和完整公司行动；不能推断可供Qlib研究 |
| 大型BaoStock日线归档 | 5,219个证券文件、6,260,343行、逐文件Hash/结构检查通过 | 仅证明本地文件完整性 | Manifest缺license、授权引用/用途；PIT、幸存者偏差、历史股票池与公司行动质量均未核实；禁止据此声明研究输入可用 |
| 既有独立验证实现 | V3.2有针对明确SMA Fixture的隔离候选代码执行与参考规则重算设计/实现 | 证明固定合成策略信号的独立重算路径 | 不等于V2.3 Qlib模型预测的独立复算；Fixture也未覆盖真实停牌、交易日历、公司行动与退市证券 |

## 尚缺内容

1. **输入用途与来源凭据**：C4研究所用DataVersion、精确source ID、可引用的`HISTORICAL_RESEARCH`用途决定及来源/保留条件。目前OD-008明确分钟/历史研究不属于已批的本地行情新闻用途；C3单次回放授权也不外推。
2. **研究所需数据语义**：足以覆盖预热、训练、验证、样本外测试的冻结日线/分钟窗口；决策时可用字段、历史证券池、公司行动、停牌、交易日历/规则及版本Hash。C3的三只证券五日样本明显不足；大归档的存在和Hash完整都不能代替这些内容。
3. **模型独立验证**：明确谁独立于训练Worker复算、对哪些冻结产物复算、使用什么容差和哪些断言。现存Qlib Fixture TestRun明确`modelValidation=NOT_RUN`；V3.2规则候选验证不能替代Qlib模型预测的独立复算。
4. **本阶段验收**：按选定输入边界补C4相应Web/TestRun/同Run CLI与人工验收。历史合成Qlib TestRun只证明当时的Fixture工程闭环，不是当前新增研究范围签收。

## 收口路径

**A. 本地学习/Fixture限定（推荐先考虑）**：所有者明确把C4当前交付限定为合成Fixture上的锁版Qlib训练/预测、可追溯Artifact、独立复算机制与假设/限制报告。结果标记`SIMULATION_ONLY`，真实市场数据/PIT研究保留`NOT_RUN`，不进入V2真实研究结论。须先冻结“独立复算”所复算的产物、容差和不变量，再做最小必要实现/验收。这是范围调整，C3批准不包含此决定。

**B. 真实市场研究**：先为具体来源与DataVersion确定用途，再取得/提供足够训练、预热和样本外窗口及其来源凭据、点时股票池/停牌/公司行动/规则上下文；完成输入资格审查后再执行真实Qlib研究和独立验证。大归档Hash通过不能替代前述门槛。

## 下一步

本次输入/缺口盘点已完成；当前需所有者选择A或B，或提供等效的C4输入范围决定。决定前保留V2.3 `PARTIALLY_IMPLEMENTED`，不运行基于C3 BaoStock归档的Qlib研究。完整V2阶段仍未完成。

## 依据

- [V2.3阶段说明](../../docs/prd/v2-data-and-replay/03-historical-minute-replay.md)及[版本计划C4工作包](../../docs/prd/v2-data-and-replay/00-version-plan.md)。
- [C3本地学习范围决定](../../docs/decisions/2026-10-24-v22-c3-local-learning-closeout-scope.md)和[追加收口记录](2026-10-24-v22-c3-local-learning-closeout.json)。
- [C3历史事实清单](2026-10-24-v22-c3-minimum-historical-fact-inventory.md)、[BaoStock大归档完整性记录](2026-10-05-w4-baostock-archive-integrity.json)和[Fixture授权门禁审计](2026-10-01-w4-fixture-authorization-gate.md)。
- [Qlib合成输入Manifest](../../fixtures/v2/v2.3/qlib-fit/manifest.json)、[锁版Qlib Fixture Web/CLI证据](../local/V2.3/41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe/evidence.json)及[V3.2独立验证设计Fixture](../../fixtures/v3/v3.2-independent-validation-v1/validation-design.json)。
