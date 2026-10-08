# V1.3 / P3 订单故障边界盘点

日期：2026-10-08  
范围：复核当前仓库中的 V1.3 固定矩阵、Trade 持久化测试和计划边界；只记录现有证据，不据此宣称 P3 或 V1 通过。

## 当前已有证据

| 边界 | 当前可重读证据 | 结论 |
|---|---|---|
| UNKNOWN 原单查询、暂时不可查询、进程重启 | [V1.3 交接及刷新恢复审计](./2026-10-08-p3-v13-fixture-and-handoff.md)、[Trade P5.7 隔离 HTTP/PG smoke](../../services/trade-execution-service/scripts/p5-7-outbox-http-smoke.mjs) | 固定路径覆盖；保留原 `clientOrderId` 和 Reservation，不盲目重发 |
| 乱序累计成交、重复10次、序号冲突、累计回退、超量 | [Trade 持久化集成脚本](../../services/trade-execution-service/scripts/test-persistence.mjs) | 隔离 PostgreSQL 路径覆盖；超量/回退拒绝、相同事件幂等、冲突隔离 |
| 撤单与成交竞争、缺失序号缓冲、成功/拒绝撤单及余量释放 | [Trade 持久化集成脚本](../../services/trade-execution-service/scripts/test-persistence.mjs)、[P5.7 HTTP smoke](../../services/trade-execution-service/scripts/p5-7-outbox-http-smoke.mjs) | 隔离 PostgreSQL/HTTP 路径覆盖；另有撤单结果先到、累计全额成交先到的固定竞态复验；资源释放等待已确认 Fill 投递 |
| Fill/费用更正 Outbox 重试、重复投递、重启后收敛 | [P5.7 HTTP smoke](../../services/trade-execution-service/scripts/p5-7-outbox-http-smoke.mjs)、[V1.3 固定矩阵审计](./2026-10-08-p3-v13-fixture-and-handoff.md) | 已覆盖列明的固定投递失败与重试；不能推断任意数据库/网络故障均已覆盖 |
| FakeBroker 独立订单/资产差异、对账和刷新读取 | [V1.3 固定矩阵审计](./2026-10-08-p3-v13-fixture-and-handoff.md) | Fixture 模拟路径存在；Web刷新缺陷已修复并回归 |

## 仍未证明的边界

1. 交易规则只对冻结 Fixture 输入成立。全市场交易日历、交易所状态、停复牌、涨跌停、证券分类/最小数量、完整费税日期表与结算差异仍未完成或未获得数据来源验证；禁止将模拟输入扩写为真实市场能力。
2. 当前故障矩阵是有界、确定的 FakeBroker/隔离服务故障。任意中断点的进程/网络/数据库故障组合、消息积压及恢复时限没有穷举，也没有据此声明通用灾备能力。
3. MANUAL/AUTO 关键应用协调已部分抽取；L07/L08专用事件协调以及其他 HTTP 路径是否满足全部端口/应用服务边界，仍需逐项对照架构审查。代码存在不能作为边界通过证据。
4. 真实用户会话/权限、Ubuntu目标环境运行、未签署历史 Run 的原记录恢复，以及用户对 V1.3 范围的实际验收仍需独立处理。

## 按序后续动作

1. 先完成 L07/L08 事件应用协调边界审查；仅当发现有明确领域/应用职责错置且能由固定测试约束时才改代码，保持 HTTP 合同和交易结果不变。
2. 为每个尚未覆盖的可工程化订单故障边界定义固定输入、序号、期望终态、资源状态、Outbox/账本计数和同 Run CLI 断言；不使用随机种子反复试绿。
3. 对市场与费税缺口维持明确的拒绝/未支持状态，待来源和合同可验证时再扩展 Fixture 版本。
4. 保留手动验收、Ubuntu、P1 活动存储/OD-013及历史 Run 缺口为独立门禁，不通过新 E2E 覆盖。

本次不新增测试运行，也不变更业务逻辑。复核依据为仓库计划 §7、V1.3 交易阶段 §8.4/§8.6 和上述可定位的当前脚本/审计；实际运行结果以对应运行日志为准。

## 2026-10-08后续复核

本盘点列出的 L07/L08 HTTP层成交/撤单协调项随后已处理：sequenced Fill、L07撤单请求/结果、L08部分成交撤单、Reservation时序检查提取至 Platform `V13SequencedFill` 应用服务。新增7项定向单测、Platform全套60文件/268项通过，V1.3完整code suite及隔离21/21 Web/API/CLI矩阵通过；范围和剩余市场/故障边界不变。新证据见[订单协调应用服务审计](./2026-10-08-p3-v13-sequenced-fill-application-service.md)。因此原“按序后续动作1”已完成；剩余动作2–4继续有效。
