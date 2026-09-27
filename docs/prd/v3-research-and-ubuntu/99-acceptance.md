# V3 RD-Agent 自动研究与 Ubuntu 交付：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V3.1 真实 RD-Agent 小样本实验闭环](./01-rdagent-small-experiments.md) | NOT_RUN（V3.1 code suite通过；固定Fixture Chromium→平台→研究→冻结Runner同run关页恢复及exit-17、超时、128 MiB OOM、网络拒绝、活动Job取消和取消/Artifact并发排序隔离HTTP/PG smoke通过；外部模型调用均为0） | NOT_RUN | [准备证据](../../evidence-v3.1-preparation.md)；[P7.2 HTTP/PG](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)；[P7.3 Runner](../../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)；[P7.4预检/账本](../../../evidence/audits/2026-09-25-p7-4-request-budget-ledger.md)；[P3.R Artifact授权](../../../evidence/audits/2026-09-25-p3-r-artifact-boundary.md)；[P7.5固定浏览器全链路与故障恢复](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md) | 生产研究容器仍未部署本次测试路由；真实 RD-Agent/模型调用、生产费用对账和Provider外发限制、文件写入后事务崩溃的孤儿回收及其余故障矩阵、Ubuntu实机未完成。网络拒绝证据限于本地 `--network none`；OOM/网络并发验证只是固定小样本，不是生产连续性/容量证据；`modelCalls=NOT_RUN`。固定Fixture测试不等于模型实验或候选有效性 | 人工验收未签署 |
| [V3.2 独立复算、人工批准与模拟策略晋升](./02-candidate-validation-and-promotion.md) | NOT_RUN（当前工作树完整 code suite PASS；随机隔离PG/HTTP中固定合成候选源码于受限ARM64容器执行，70/70信号经第二隔离容器独立重算并用于OOS交易；owner-scoped准备态快照导出代码与CLI单测5/5、HTTP/文件烟测4项通过；normal/rejection/recovery真实入口均WAITING、无TestRun） | NOT_RUN | [PromotionRequest intake及读路由复核](../../../evidence/audits/2026-09-25-v3-2-promotion-intake.md)；[验证报告持久化](../../../evidence/audits/2026-09-27-v32-validation-report-persistence.md)；[精确版本决策](../../../evidence/audits/2026-09-27-v32-exact-version-decision.md)；[Worker候选隔离执行](../../../evidence/audits/2026-09-27-v32-independent-worker-process.md)；[当前工作树code suite复验](../../../evidence/audits/2026-09-27-v32-code-suite-reverification.md)；[浏览器及场景复核](../../../evidence/audits/2026-09-27-v32-browser-scenario-recheck.md)；[准备态证据导出CLI](../../../evidence/audits/2026-09-27-v32-evidence-export.md) | 实验仅限精确白名单合成Fixture；非Fixture/用户候选执行与Qlib独立验证仍缺，V3.1权威前置、治理/Paper正式精确指纹消费、V3.2业务TestRun/同run CLI/正式证据包及人工验收缺失；准备态快照CLI不替代正式阶段导出；无活动Registry/Mandate变更 | 待用户确认 |
| [V3.3 研究扩容、预算与持续运行](./03-research-scale-and-recovery.md) | NOT_RUN（V3.3 owner-scoped队列/分页账本读取、持久化WAITING准备态TestRun API/页面有契约、单测、专用PG、Bearer HTTP、Platform/Web类型检查、同run CLI核对及Playwright证据；阶段normal/rejection/recovery只创建WAITING/NOT_RUN记录，不派发Job） | NOT_RUN | [V3.3队列/账本/准备态运行切片](../../../evidence/audits/2026-09-27-v33-runner-queue-read.md) | Research Job派发、完整预算控制与轮次汇总、Paper并行可用性、阶段断言/证据导出、V3.1/3.2前置及Ubuntu证据未完成 | 人工验收未签署 |
| [V3.4 Ubuntu 迁移、全阶段 Web 回归与最终交付](./04-ubuntu-migration-and-release.md) | NOT_RUN | NOT_RUN | 待填写 | 待填写 | 待填写 |

## 2. 版本门禁

2026-09-23 状态复核：V3.1 已有研究 API、预算账本、Runner 镜像和受限宿主 Smoke 的准备范围证据，但不代表真实研究闭环。真实模型调用、Runner 服务接入、实际模型费用调用链、Provider 精确域名许可及 Ubuntu 实机仍未完成；OD-009 与用户人工验收保持未关闭，故 V3.1 和 V3 总结继续为 `NOT_RUN`。依据：[V3.1 准备证据](../../evidence-v3.1-preparation.md)。

- [ ] 每阶段第7节开发交付项已逐项核实；用户人工项有实际确认依据。
- [ ] 每阶段第8节由DRAFT_NOT_EXECUTABLE更新为实测手册，填写目录、URL、具体Fixture/参数、代码测试命令和预期输出。
- [ ] 正常/拒绝/恢复、代码套件、浏览器E2E、Web同run只读核对及证据导出均有实际命令/退出码；必需观察项未跳过。

- [ ] 所有必需阶段及成功/拒绝/恢复适用场景已通过，失败未被随机性掩盖。
- [ ] 正式页面与验收中心实际调用业务服务；长任务不依赖浏览器存活。
- [ ] FakeBroker独立状态、订单/Fill幂等、资金与可卖量、PIT及运行隔离通过。
- [ ] 数据、模型、券商、环境、成交模型分别标注；真实组件/外部服务与Fixture证据不混淆。
- [ ] 目标架构检查、性能/观察窗口按本版阶段要求记录，缺项仍NOT_RUN。
- [ ] 阶段脚本、日志、截图、数值检查、迁移/备份及操作说明齐备。
- [ ] LIVE写入口不可用，真实券商（含只读）未接入；本版仅模拟交付。

## 3. 运行证据模板

| 字段 | 内容 |
|---|---|
| 版本/阶段/场景版本/testRunId | 待填写 |
| market/account/namespace | 待填写 |
| environmentMode/dataMode/modelMode/brokerMode/executionModel | 待填写 |
| Commit或工作区快照Hash/镜像Digest/依赖锁Hash/迁移/契约 | 待填写 |
| 输入数据/股票池/日历/规则/成本/策略/Mandate/时钟 | 待填写 |
| seed/固定故障场景/实际注入事件序列 | 待填写 |
| Mac或Ubuntu/CPU架构/是否模拟架构/资源配额 | 待填写 |
| 命令/退出码/自动断言/Trace/截图/报告 | 待填写 |
| 实际结果/预期/容差/未覆盖与原因 | 待填写 |
| 人工验收人/UTC时间/结论 | 待填写；NOT_RUN/PASS/FAIL |

本版全部必需门禁PASS才可标PASS；部分完成用文字说明范围，总结不能覆盖子项FAIL/NOT_RUN。后续数据扩容或镜像/代码变化需新证据，不覆盖历史签署。
