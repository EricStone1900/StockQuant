# 双市场低频自动交易产品验收

版本2.0，2026-09-06。配套[PRD](./00-product-requirements.md)、[架构](./02-system-architecture.md)、[契约](./03-market-rules-and-contracts.md)、[实施计划](./04-development-plan.md)、[追踪矩阵](./01-feature-traceability.md)与[测试计划](./90-test-plan.md)。

## 1. 当前状态与最终目标

2026-09-07本轮验收按[三版共同规则](./05-three-version-delivery.md)单独记录，全部初始NOT_RUN。V1～V3只交付研究与模拟平台、Web验收中心及Ubuntu部署；下文R0～R3保留长期产品验收，不要求本轮接真实券商，也不能用本轮通过代替真实账户/实盘证据。

| 本轮版本 | 必需证据 | 当前结论 |
|---|---|---|
| [V1验收](./v1-local-simulation/99-acceptance.md) | 5阶段真实组件小样本、双市场FakeBroker、同步Web、日线回测和恢复 | NOT_RUN |
| [V2验收](./v2-data-and-replay/99-acceptance.md) | 5阶段实际免费来源、用户分钟数据、回放、连续Paper、资源扩容 | NOT_RUN |
| [V3验收](./v3-research-and-ubuntu/99-acceptance.md) | 4阶段实际RD-Agent、独立复算/批准、研究恢复、真实Ubuntu与Web全阶段回归 | NOT_RUN |

三版完成后仍需单独处理真实券商、真实账户、R2及未纳入增强项。任何Web阶段缺正常/异常操作、独立业务断言或人工证据，不满足对应阶段退出条件。新增DV-01～07/VT01～07也必须有逐项证据。

各阶段必须完成第7节交付待办，并提供第8节经开发者实测的操作手册（环境、具体数据、Web路径/输入/预期、实际命令/退出码、代码测试、同run交叉核对、恢复及证据）。手册VERIFIED_EXECUTABLE仅代表可执行，不等于用户人工验收PASS；人工项须有用户确认时间和依据。

本包是全新项目待实现设计，所有业务验收均NOT_RUN。主要目标是本人使用的A股与美股低频量化自动实盘；两个市场分别形成数据→策略→风控→自动授权→券商→成交结算→对账→复盘闭环。只有Paper、人工执行或单市场完成，不满足整体目标。

原基线含8份Markdown、16个功能域、124条编号功能和55组测试；本轮增加共同规则、三个版本文件夹、DV-01～07及VT01～07。实际文件清单以目录为准，文档完整与链接检查不代表任何服务已经运行。

## 2. R0双市场确定性闭环

| 门禁 | 必需结果 | 状态 |
|---|---|---|
| 基础语义 | market/venue/security/currency分离；两套交易/结算日历、夏令时Fixture | NOT_RUN |
| 初始化 | 双账户/原币现金/持仓批次幂等，重启无累加 | NOT_RUN |
| 数据与策略 | 固定版本/Hash/PIT/质量用途、两市场量化和HOLD/调仓 | NOT_RUN |
| 硬风控与资源 | 全Leg和中间路径、账户共享资源、USD/CNY分开、不可超支超卖 | NOT_RUN |
| 人工/自动授权 | MANUAL_APPROVAL与AUTO_POLICY均验证；自动路径不等待每笔人工 | NOT_RUN |
| Paper执行 | 可信授权、批次原子接受、增量Fill、部分成交/撤单/UNKNOWN | NOT_RUN |
| 账本与对账 | 结算和可卖分开、重复只入一次、差异/冲正/基础复盘 | NOT_RUN |
| 工作流与Web | 真服务/数据库/总线/工作流，网页关闭仍能执行，状态可读 | NOT_RUN |
| 恢复与暂停 | 重启恢复不重发，日切不释放未知占用，暂停仍入账 | NOT_RUN |
| 交付材料 | 独立启动、测试、Fixture、备份和恢复入口可运行 | NOT_RUN |

R0策略可为QUANT_ONLY，不要求外部LLM、全部新闻源或自动研究。R0测试通过仍须明确dataMode/modelMode/brokerMode为Fixture或Paper。

## 3. R1真实来源与连续模拟

| 门禁 | 必需结果 | A股 | 美股 |
|---|---|---|---|
| 来源与许可 | 有权使用的日频/PIT/公司行动/日历/执行报价；数据质量报告 | NOT_RUN | NOT_RUN |
| 账户只读 | 券商能力、权限、现金/结算/购买力/持仓同步可核验 | NOT_RUN | NOT_RUN |
| 回测 | 历史股票池/成本/税费/停牌及市场规则有效，样本外结果可复验 | NOT_RUN | NOT_RUN |
| Shadow | 建议至少20个当地交易日，信号/延迟/可执行性/成本和异常记录 | NOT_RUN | NOT_RUN |
| 执行政策 | 报价年龄、账户年龄、价差/价格偏差、参与率、撤改/窗口规则冻结 | NOT_RUN | NOT_RUN |
| 实时对账 | 外部交易/公司行动/费用/结算变化可识别，日终作业正常 | NOT_RUN | NOT_RUN |
| 运行环境 | 常开主机/Bridge如需、时钟、会话、通知、资源与恢复报告 | NOT_RUN | NOT_RUN |

某策略若需要新闻、市场状态或Agent证据，额外满足其声明依赖的门禁；不能用关闭一个必需模块临时规避其失败。

## 4. R2双市场自动实盘最终验收

| 门禁 | 必需结果 | A股 | 美股 |
|---|---|---|---|
| 实际通道 | 各至少一个合法可用API，place/query/cancel、成交/资产、能力和权限核验 | NOT_RUN | NOT_RUN |
| 策略与授权 | 本人批准精确版本及Mandate，资金/白名单/时段/到期/停止条件完整 | NOT_RUN | NOT_RUN |
| 无逐笔人工 | 允许范围内自动判定、发送、成交、结算、对账及报告，不依赖网页/手工回填 | NOT_RUN | NOT_RUN |
| 最后发送检查 | 暂停、账户/报价新鲜、规则/风险/占用、Permit、租约和fencing验证 | NOT_RUN | NOT_RUN |
| 并发/未知 | 两Worker、响应丢失、断线/会话到期、Gateway重启无重复副作用 | NOT_RUN | NOT_RUN |
| 结算/账本 | 原币费用/税费、已结算/未结算、外部订单、公司行动与券商一致 | NOT_RUN | NOT_RUN |
| 低频与时序 | 当地交易日/夏令时/提前收盘；预算不跨日错清；无信号不交易 | NOT_RUN | NOT_RUN |
| 例外与接管 | 过期/超Mandate/对账错误停止，撤销不会误称在途已消失 | NOT_RUN | NOT_RUN |
| 无人值守 | 夜间运行、主机恢复、错过窗口不补旧单、告警与通知失败策略 | NOT_RUN | NOT_RUN |
| 灾备与回滚 | 隔离恢复实测，RPO/RTO满足批准值，券商缺失事实补齐后再启用 | NOT_RUN | NOT_RUN |
| 受控观察 | 本人批准的资金/证券范围与观察期，实际记录和已知风险 | NOT_RUN | NOT_RUN |
| 本人启用签署 | 对具体market/account/Mandate和版本批准实盘启用 | 待填写 | 待填写 |

整体结论：NOT_RUN。只有两市场全部适用门禁PASS，主要目标才为COMPLETE。一市场已完成时可记录该市场PASS，整体为PARTIAL，不以“另一个后续接入”替代双市场要求。

## 5. R3增强验收

启用Agent需要Schema/Tool/证据/PIT/Prompt版本/失败降级与黄金评测。启用第三方策略和自动研究需要真实Sandbox隔离、复算与人工晋升。启用Memory/学习需要未来结果过滤、反例、污染隔离和经验版本治理。状态均NOT_RUN；未启用不阻塞QUANT_ONLY的R2。

## 6. 证据记录模板

| 字段 | 待填内容 |
|---|---|
| 产品版本/D交付包/服务S阶段/需求ID | 待填写 |
| 证据层级 | UNIT / FAKE_INTEGRATION / REAL_E2E / RELEASE |
| market与账户脱敏ID | 待填写 |
| dataMode/modelMode/brokerMode/approvalMode/decisionMode | 分别填写，不仅写“真实” |
| Commit/工作区变更/镜像Digest/依赖锁Hash | 待填写 |
| 迁移/OpenAPI/AsyncAPI/Schema版本 | 待填写 |
| 数据/日历/规则/FX/策略/成本/执行政策/Mandate版本 | 待填写 |
| 环境/主机/Bridge/券商会话与权限验证依据 | 待填写，不记录凭证 |
| 测试命令/退出码/报告/Trace/截图 | 待填写 |
| 通过/失败/跳过及未覆盖范围 | 待填写 |
| proposal/batch/clientOrder/fill/ledger关键ID | 待填写 |
| 性能/恢复/监控实测及批准目标 | 待填写 |
| 风险/停止条件/回滚与恢复验证 | 待填写 |
| 执行者/本人签署/UTC时间 | 待填写，允许同一人 |
| 结论 | NOT_RUN / PASS / FAIL；整体可PARTIAL，不能掩盖硬失败 |

## 7. 失败与恢复要求

权限、硬风控、金额、时间/PIT、数据质量、幂等、结算/账本或恢复失败只能FAIL。性能/告警/可用性未达到本人批准目标也不能正式无人值守发布。跳过项和未覆盖项必须列明，不通过测试数量推导完成率。

恢复步骤：暂停新发送→保留在途/UNKNOWN→备份现有数据库/Artifact与发送日志→查询券商权威订单/成交/资产→补齐缺失与对账→兼容迁移或回滚→重建投影→检查风险、Mandate和时效→本人或已批准恢复规则重新启用。禁止删账本、重置预算或重发未知订单解决差异。
