# V1 小数据本地模拟闭环：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PASS（自动验证） | PASS（用户确认） | normal `d5add8bf-ae44-48a8-b726-b4be34ab4278`；rejection `24276340-2e5a-4516-a7d0-20f92851754b`；recovery `bdb53484-19b4-4363-a130-eee94761df54` | 仅本地 ARM64；Artifact 存储、TS/Python 契约生成、正式账户详情页仍未实现 | 用户确认（本会话） / 2026-09-09 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PASS（自动验证） | PASS（用户确认） | `v1.2-market-data-1`；Qlib 0.9.6；平台 run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；Artifact task `artifact-task-1788953766848`；Web E2E 2 passed | Qlib 为 Mac ARM64 上的 linux/amd64 仿真；真实模型调用、全量数据和真实 Ubuntu 仍未验证 | 用户确认（本会话） / 2026-09-09 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | PASS（代码/容器场景） | PASS（用户已完成人工 Web 验收，2026-09-09） | `39c9b7c0-080d-45d7-83cf-b8865f6a4b42`、`d1540cb1-d085-40bf-860d-43031951bd55`、`5a817c7f-64c0-4c8d-a979-97b44fc9f6ed` | 重建 Docker 栈；`pnpm verify:stage -- --stage V1.3 --suite code`；三场景及 `check-only` 均 PASS；`pnpm test:e2e`：3 passed | FakeBroker 为隔离模拟；真实券商、持久化跨重启和真实 NATS 未在本切片验证 |
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | PASS（代码/容器场景） | PASS（用户已完成人工 Web 验收，2026-09-09） | `78a5c084-abdb-4e50-b451-9787d85b0c1c`、`82b1d78a-00f1-4f61-b069-29b94e7aab95`、`538be4e9-1ece-4c95-a8d3-c5c45e3947c4` | 重建 Docker 栈；代码套件 PASS；三场景及 `check-only` 均 PASS；`pnpm test:e2e`：4 passed | 当前为小样本合成日线 Fixture；真实全量 A 股数据、真实券商和跨重启回测持久化未验证 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | PASS（代码/容器场景） | PASS（用户已完成人工 Web 与 Ubuntu 烟测验收，2026-09-09） | `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c` | V1.5 代码回归 PASS；真实 JetStream→Temporal SDK Worker→Activity PASS；既有 Web E2E：5 passed | Temporal Worker 重启恢复、业务正式进程接入和长周期观察未验证 |

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
