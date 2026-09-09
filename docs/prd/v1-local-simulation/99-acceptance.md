# V1 小数据本地模拟闭环：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PASS（自动验证） | PASS（用户确认） | normal `d5add8bf-ae44-48a8-b726-b4be34ab4278`；rejection `24276340-2e5a-4516-a7d0-20f92851754b`；recovery `bdb53484-19b4-4363-a130-eee94761df54` | 仅本地 ARM64；Artifact 存储、TS/Python 契约生成、正式账户详情页仍未实现 | 用户确认（本会话） / 2026-09-09 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PASS（开发者自动验证） | NOT_RUN | `v1.2-market-data-1`；Qlib 0.9.6；平台 run `5998252f-f60c-409d-9940-9ce4846e90fc`；Web E2E 2 passed | Qlib 为 Mac ARM64 上的 linux/amd64 仿真；真实模型调用、全量数据和真实 Ubuntu 仍未验证 | 待用户确认 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | NOT_RUN | NOT_RUN | 待填写 | 待填写 | 待填写 |
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | NOT_RUN | NOT_RUN | 待填写 | 待填写 | 待填写 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | NOT_RUN | NOT_RUN | 待填写 | 待填写 | 待填写 |

## 2. 版本门禁

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
