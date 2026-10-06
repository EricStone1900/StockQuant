# V1 小数据本地模拟闭环：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PASS（自动验证） | PASS（用户确认） | normal `d5add8bf-ae44-48a8-b726-b4be34ab4278`（[恢复的原始TestRun证据包](../../../evidence/local/V1.1/d5add8bf-ae44-48a8-b726-b4be34ab4278/evidence.json)，manualConclusion仍NOT_RUN）；rejection `24276340-2e5a-4516-a7d0-20f92851754b`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/24276340-2e5a-4516-a7d0-20f92851754b/evidence.json)，无run级人工签署）；recovery `bdb53484-19b4-4363-a130-eee94761df54`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/bdb53484-19b4-4363-a130-eee94761df54/evidence.json)，无run级人工签署）；2026-09-26 stage-mode code suite及Web normal/rejection/recovery同run CLI见[审计](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md) | 历史 2026-09-09 验收范围为本地 ARM64；当前统一TestRun存储模式代码和三场景Web/CLI在独立PG验证通过；2026-10-01 V1.1全代码套件受控退出0，包含DC-06项目分页/导出生成客户端漂移检查，Market Data分钟API八操作及账户客户端仍有效；新增Research Artifact不可变过期时间/EXPIRED终态有隔离PG、Platform投影与完整V3.1套件证据，但未批准保留期/调度或物理清理；DC-06分页/导出另有匿名401、跨项目403的真实隔离HTTP/PG证据；活动API仍为`legacy`且未执行切换/回退窗口；本轮未新增人工签署 | 用户确认（本会话） / 2026-09-09；历史签署保留，新增范围未签署 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PARTIALLY_IMPLEMENTED（历史范围保留；2026-10-06代码套件与操作手册已验证；新增范围人工验收和Ubuntu未完成） | 历史用户确认PASS（2026-09-09）；新增范围人工验收NOT_RUN；Ubuntu NOT_RUN | `v1.2-market-data-1`；Qlib 0.9.6；历史平台Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`（结构化导出缺失，W9未恢复）；当前normal TestRun `890f3fab-e689-471b-8c45-97abd531d3d5`（[结构化证据包](../../../evidence/local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/evidence.json)，3/3断言PASS、manualConclusion NOT_RUN）；Artifact task `artifact-task-1788953766848`；隔离Web/API/CLI三场景代码回归PASS | Qlib为Mac ARM64上的linux/amd64仿真；真实市场数据、全量数据、Ubuntu x86_64及新增范围人工验收仍未验证 | 用户历史确认保留 / 2026-09-09；本轮不新增签署 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | PARTIALLY_IMPLEMENTED（历史代码/容器场景PASS保留；当前第7/8节交接清单未完成） | 历史用户Web确认PASS（2026-09-09）；本轮W1/W2新增范围NOT_RUN | `39c9b7c0-080d-45d7-83cf-b8865f6a4b42`、`d1540cb1-d085-40bf-860d-43031951bd55`、`5a817c7f-64c0-4c8d-a979-97b44fc9f6ed` | FakeBroker 为隔离模拟；历史三场景与E2E记录保留；真实券商、跨重启和新增范围复验/签署未完成 |
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | PARTIALLY_IMPLEMENTED（历史验收保留；Quant日线回测、固定/可配置A股费税模型、现行/历史费表日期约束、合成停牌限制、T+1卖出与结算有自动化隔离证据；完整交易所规则、日历、公司行动、Qlib一致性、完整范围人工验收未完成） | `pnpm verify:stage -- --stage V1.4 --suite code`退出0；最新隔离`pnpm test:e2e -- --stage V1.4`退出0，11个BacktestRun/Manifest/resultHash配对、6个Web Run由CLI同Run核验、浏览器4/4；人工结论NOT_RUN | 最新结构化业务结果仍为2026-10-02隔离E2E，报告/机器JSON原件保留于`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.{md,json}`，其SHA清单为该执行时的历史快照（`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.sha256`）；当前共享合同生成类型与Runner RoundIndex增量见[合同/Runner绑定审计](../../../evidence/audits/2026-10-02-w7-v33-runner-round-binding.md)、[JSON](../../../evidence/audits/2026-10-02-w7-v33-runner-round-binding.json)及此前W9共享源码SHA点时快照（仅代表当时版本）；费表依据与日期边界见[阶段规则范围](./04-daily-backtest.md) | 历史合成Fixture核对2023-08-25旧费率卖出、2023-08-28切换日拒绝；券商佣金仍需按账户设置，公开费率不代表券商报价。真实行情源调用0、Provider/Paper/Broker调用0；无来源授权未执行；自动PASS不替代人工签收或V1.4关闭 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | PARTIALLY_IMPLEMENTED（历史代码/容器与当前Compose持久卷重建证据保留；当前第2/7/8节待办未完成） | 历史用户Web与Ubuntu烟测确认PASS（2026-09-09）；当前W8目标主机明细/范围重验NOT_RUN | `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；运行时补充：[V1.5-NATS/Temporal 证据](../../evidence-v1.5-real-integration.md)、[阶段五审计](../../../evidence/audits/2026-09-23-phase-5-nats-temporal.md) | 历史签署保留；仍未验证宿主/磁盘灾难恢复、异机备份、生产HA，当前Ubuntu主机版本/架构/Commit/命令输出及完整手册待补 | Ubuntu历史人工签署保留；本轮新增范围未签署 |

## 2. 版本门禁

2026-09-23 状态复核：V1.1～V1.5 的阶段级历史自动验证和人工签署继续保留；阶段五已补充当前 Compose NATS/Temporal 持久卷容器重建 PASS。但版本级门禁清单仍有待逐项完成，且原始 Ubuntu 明细尚缺，因此版本总结维持 `NOT_RUN`，不改变用户既有签署。

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
