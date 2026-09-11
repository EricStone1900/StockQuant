# V2 免费数据、分钟回放与连续模拟：验收清单

当前结论：PARTIALLY_IMPLEMENTED。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过；V2.3、V2.4 已完成人工确认，但 V2.4 的 20 个实际交易日观察仍未完成。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V2.1 免费行情、新闻聚合与在线股票池](./01-free-data-and-news.md) | PASS（代码、Docker、统一场景） | PASS（用户确认并完成复验，2026-09-09） | `docs/evidence-v2.1.md`；复验 normal `dd1792f9-4947-472d-bd9c-2a0399224068`；rejection `9a0d9bb5-7106-4b95-b113-bea633aab576`；recovery `7419dbd9-d635-4ccb-993f-9d66e5f11865` | Sina 行情源超时；来源许可、长期观察待补充 | 用户确认（本会话） / 2026-09-09 |
| [V2.2 历史分钟数据导入与校验](./02-minute-data-import.md) | PASS（代码、Docker、统一场景） | PASS（用户确认并完成复验，2026-09-09） | `docs/evidence-v2.2.md`；复验 normal `2d236506-042b-4e6c-a386-dfbb6553622f`；rejection `55417112-6ee9-4eeb-b252-1e0306048a0e`；recovery `d8c9540e-0ed2-4978-93f9-daaef6dc1e6f` | Parquet、持久化分区和真实用户文件导入未覆盖 | 用户确认（本会话） / 2026-09-09 |
| [V2.3 日频决策、分钟撮合与历史事件回放](./03-historical-minute-replay.md) | PARTIALLY_IMPLEMENTED（Fixture 回放、持久 TestRun、独立 Worker、多 Bar 检查点、Qlib 训练与独立验证、候选精确版本登记/显式审批/数据库持久化、治理授权、费用、基础订单状态转换、成交事务外盒、后台重试扫描、UNKNOWN 安全恢复与 Saga 状态机） | PASS（用户人工验收确认，2026-09-11；normal/rejection/recovery、同 Run 核对、代码套件和 Web E2E 均复核通过） | `docs/evidence-v2.3-2.md`；normal `6522c574-fc20-472b-8eba-1a0b59024d9c`；rejection `3d361eb3-e1cd-4517-9de8-5eccb88776dc`；recovery `49b5dc51-1a1d-40ad-9100-d290c423f386`；Manifest `02293ca437201a36096a7e04631f5be837869a49f9bb9be490f4b64a9995002a` | 激活保持 `DISABLED_UNTIL_MANDATE`；尚未接入真实模型训练、完整研究运行时或 LIVE 激活 | 用户人工确认 / 2026-09-11；技术复核 / 2026-09-11 |
| [V2.4 真实时钟下持续模拟交易](./04-continuous-paper-trading.md) | PARTIALLY_IMPLEMENTED（持续 Paper 场景、快照新鲜度、重复调度幂等、断网恢复和日终对账切片） | PASS（用户人工验收确认，2026-09-11；实现范围） | `docs/evidence-v2.4.md`；normal `755cb415-0f1d-433a-aaa4-6378d5e7f1cf`；rejection `ac6e5e4a-cdfc-4a54-9731-4f3bce0e0f52`；recovery `8bb6606e-96c0-4ca4-8deb-9df40c0bbbb9`；Manifest `5e7bf52c19d4167846673ca581216337af3f03133a9cd1392ed1c55e140d0842` | 20 个实际交易日观察尚未完成，真实来源长期稳定性/许可和全量容量待验证 | 用户人工确认 / 2026-09-11；技术复核 / 2026-09-11 |
| [V2.5 历史数据扩容与 V2 验收](./05-data-scale-and-v2-acceptance.md) | PARTIALLY_IMPLEMENTED（20×60 小规模扩容、回归/PIT/缓存/资源/恢复切片；Mac 监控池 50/80/100 数量与有效时间戳质量通过；BaoStock 已筛选 5,219 个已上市 A 股并完成 5/100/500 标的 2019～2024 日线分档、断点恢复和幂等验证；全量启动后因源端吞吐受控停止） | NOT_RUN（待用户人工验收） | `docs/evidence-v2.5.md`；normal `fe37c045-962f-40be-84b1-36d33df08184`；rejection `9996f785-fd7c-4912-b839-c6e0389f4c9f`；recovery `0727a1c4-ed36-4ae8-9a94-543d287cdc68`；Manifest `2b82e57e7c54a04b9628adbf39ad856274d68c90093c8a4ed119b93b9c3b690e` | 全市场多年真实导入/存储容量、真实 Ubuntu、真实 PIT、容量长期稳定性和 V2.4 20 日观察待完成 | 技术复核 / 2026-09-11 |

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
