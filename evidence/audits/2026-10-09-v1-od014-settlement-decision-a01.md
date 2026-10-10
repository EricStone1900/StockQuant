# OD-014 双市场 Paper 现金结算语义提案

日期：2026-10-09。状态：待项目所有者确认；本文是决策输入，不是已批准规则或已实现功能。只讨论 V1 Fixture/FakeBroker 模拟，不接触真实账户或券商。

## 提案：严格已结算现金模式

为满足全局 XMK-03 并避免把应收款误当成可用现金，建议 V1 初始 Paper 模式对 CN_A 与 US_EQUITY 使用同一保守资金门槛，结算日期仍分别由市场日历决定：

1. SELL Fill 的净卖出额记录为带原始 Fill ID、市场、币种、交易日、结算日和唯一 settlement ID 的 `PENDING_RECEIVABLE`。成交时不增加 `SETTLED_CASH`。
2. BUY 预留只使用同一账户、同一币种的 `SETTLED_CASH`；应收款不计入 `availableToTrade` 或 `withdrawableCash`。结算前仅依靠该笔应收款的 BUY 返回 `INSUFFICIENT_SETTLED_CASH`，且不创建预留、订单或账本事实。
3. 每个市场使用版本化 Fixture session manifest；每个交易 session 明确列出其下一 settlement session。结算只由注入的 Run Clock 在该 session 开始时推进，不按小时或自然日推算。若日期/下一 session 不在清单中，返回可诊断的 `SETTLEMENT_CALENDAR_UNAVAILABLE`，保持应收款，不猜测日期。
4. 到期结算将应收款一次性转成已结算现金。Settlement ID 唯一，重复投递或恢复只能读取已完成的相同结算，不重复记账；每次转换保留 SELL Fill、原始费项、Settlement 和账本条目的关联。
5. 结算按账户/市场/币种隔离。CN_A/CNY 不为 US_EQUITY/USD 提供购买力，反之亦然；V1 不实现跨币种融资、保证金或负现金。

此方案刻意采用保守的模拟资金约束，不声称复制所有券商的“可用/可取”口径。上交所投教材料举例指出，股票卖出资金可用于当日购买货币 ETF；该材料针对货币 ETF 的交易机制，不能推出所有股票买入或所有券商账户的可用资金规则。SEC 的 T+1 FAQ 说明美国适用交易通常自 2024-05-28 起按 T+1 标准交收，但没有规定本项目 Paper 账户的买入购买力策略。来源：[上交所投教：货币 ETF](https://edu.sse.com.cn/etfgame/gametopic/c/4940402.shtml)、[SEC：T+1 FAQ](https://www.sec.gov/exams/educationhelpguidesfaqs/t1-faq)。

## Fixture 与验收切片

Fixture 是**合成且显式列举日期**的双市场日历，不代表真实交易所完整日历。首个切片仅覆盖 V1.4 固定回测所需 session；每条记录包含 `market`、`sessionDate`、`settlementDate`、`calendarVersion`、`provenance` 和预期断言，并以 manifest/SHA-256 冻结。超出清单范围必须拒绝，不延伸推导。

提案要求的最小双市场断言：

- 结算日前 SELL 仅增加应收，不增加已结算现金或购买力；应收单独计入资产净值。
- 仅以未结算卖出款买入时，CN_A 与 US_EQUITY 均拒绝，Portfolio/FakeBroker 账本无副作用。
- 到列明的结算 session 后，应收转成已结算现金；使用相同交易输入的 BUY 仅在此后通过资金检查。
- 周末/Fixture 内非交易日映射到清单明确指定的下一 session；清单尾部或未知日历无映射时保持应收并失败关闭。
- 部分 SELL、费用扣除、进程恢复、重复结算投递、重复 client request 均核对数量/金额/唯一结算记录。
- 同币种边界和 CN/US 账户隔离均有正/负例；同 Run Web、API、CLI `--check-only` 与独立账本断言一致。

## 需要所有者确认

请确认以下二选一，或直接给出逐市场替代口径：

- **批准严格已结算现金模式**：按上文继续实现和验收；结算前卖款不可支持新的 BUY。Fixture 仅覆盖列明日期，结果仅是 V1 合成模拟证据。
- **调整购买力口径**：说明 CN_A 与 US_EQUITY 的卖出资金何时可用于买入、何时可取、是否可跨日历/市场，并确认对应模拟目标和限定；随后据此改写 Fixture/合同/测试后再实现。

在确认前不把提案写成当前产品规则、不改变现有需求追踪状态，也不实施相关 Paper SELL→BUY 路径；可独立推进的 V1 工作继续进行。
