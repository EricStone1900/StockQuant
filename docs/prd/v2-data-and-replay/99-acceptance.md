# V2 免费数据、分钟回放与连续模拟：验收清单

当前结论：PARTIALLY_IMPLEMENTED。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过；V2.4历史实现范围已完成人工确认，V2.3历史回放/模拟撮合签署保留，但2026-09-27源码复核发现Qlib研究子能力被错误标记，当前阶段状态已回退为PARTIALLY_IMPLEMENTED并待重新验证。V2.4的20个实际交易日观察、V2.5分钟级长期门禁和DC-08A的20只证券稳定观察仍未完成。2026-09-24数据库正式日终记录为V2.4 8/20；DC-08A当前归档为4个稳定完整日、1个恢复后完整日（5/20），其人工验收门槛仍未完成。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V2.1 免费行情、新闻聚合与在线股票池](./01-free-data-and-news.md) | PASS（代码、Docker、统一场景） | PASS（用户确认并完成复验，2026-09-09） | `docs/evidence-v2.1.md`；复验 normal `dd1792f9-4947-472d-bd9c-2a0399224068`；rejection `9a0d9bb5-7106-4b95-b113-bea633aab576`；recovery `7419dbd9-d635-4ccb-993f-9d66e5f11865` | Sina 行情源超时；来源许可、长期观察待补充 | 用户确认（本会话） / 2026-09-09 |
| [V2.2 历史分钟数据导入与校验](./02-minute-data-import.md) | PASS（原代码、Docker、统一场景；2026-09-25新增持久Fixture导入/重启分页、分块CSV续传、真实Chromium→Vite→平台→市场服务→隔离PG和上传绑定TestRun/Web+CLI check-only，见后续证据） | PASS（用户确认并完成复验，2026-09-09；后续实现没有新增人工签署） | `docs/evidence-v2.2.md`；复验 normal `2d236506-042b-4e6c-a386-dfbb6553622f`；rejection `55417112-6ee9-4eeb-b252-1e0306048a0e`；recovery `d8c9540e-0ed2-4978-93f9-daaef6dc1e6f`；[P6持久分钟导入后续证据](../../../evidence/audits/2026-09-25-p6-persistent-minute-import.md)；[受限CSV小文件导入](../../../evidence/audits/2026-09-25-p6-csv-minute-import.md)；[可续传与上传TestRun审计](../../../evidence/audits/2026-09-25-p6-resumable-minute-upload.md) | 本地大文件CSV限64 MiB/100,000行，最终解析仍在内存；尚缺流式解析、Parquet、物理日期分区和生产容量证据；人工验收结论只涵盖原2026-09-09范围 | 用户确认（本会话） / 2026-09-09；后续工程复核 / 2026-09-25 |
| [V2.3 日频决策、分钟撮合与历史事件回放](./03-historical-minute-replay.md) | PARTIALLY_IMPLEMENTED（历史回放/模拟撮合自动验证保留；锁定容器内真实Qlib `LGBModel.fit/predict` 合成数据冒烟现已纳入code suite并通过；生产研究路由及独立验证未完成） | 历史用户确认保留（2026-09-19；仅覆盖当时的normal/rejection/recovery、同Run、Web E2E声明范围；新增研究子能力验收待执行） | 历史场景ID与Manifest保留；2026-09-27 Qlib冒烟、哈希和限制见[边界更正审计](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md) | 冒烟输入为120行确定性合成数据，不是市场数据或冻结研究Fixture；`modelValidation=NOT_RUN`，旧`/train`仍为Fixture摘要语义，生产研究路由、新研究Web/CLI同Run证据、真实市场数据与独立复算待完成；V2.4/V2.5观察门禁独立 | 历史用户人工确认 / 2026-09-19（保留）；当前研究能力待重新验收 |
| [V2.4 真实时钟下持续模拟交易](./04-continuous-paper-trading.md) | PARTIALLY_IMPLEMENTED；旧静态PASS已更正为WAITING/NOT_RUN；Web/API/CLI准备态同run、Platform会话代理、Trade Execution容器readiness均有隔离证据，未完成Paper交易场景 | 历史签署记录保留；当前Paper交易实现范围需重新验证及确认 | 历史记录 `docs/evidence-v2.4.md`；原 normal `755cb415-0f1d-433a-aaa4-6378d5e7f1cf`、rejection `ac6e5e4a-cdfc-4a54-9731-4f3bce0e0f52`、recovery `8bb6606e-96c0-4ca4-8deb-9df40c0bbbb9` 保留；[静态结果更正](../../../evidence/audits/2026-09-27-v24-no-fabricated-paper-evidence.md)；[隔离HTTP smoke](../../../evidence/audits/2026-09-27-v24-waiting-http-smoke.md)；[Web/API/CLI同run与契约审计](../../../evidence/audits/2026-09-27-v24-run-openapi.md)；[P5.5 readiness与容器审计](../../../evidence/audits/2026-09-27-p5-5-paper-readiness.md) | OD-007未决，真实采样→Mandate/risk/reservation→FakeBroker链未接通；20个实际交易日、来源长期稳定性/许可、全量容量及原生Ubuntu仍待验证 | 历史用户确认 / 2026-09-11（保留，不表示当前新范围已签署）；重验待完成 |
| [V2.5 历史数据扩容与 V2 验收](./05-data-scale-and-v2-acceptance.md) | PARTIALLY_IMPLEMENTED（20×60 Fixture 与 BaoStock 真实分钟切片、57,600 行/20/20 SHA-256/逐日窗口/真实归档回放通过；Mac 监控池 50/80/100 质量、5/100/500/5219 多年日线、归档和隔离恢复 5,219/5,219 SHA-256 通过；BaoStock 财务公告日字段已核验但行业 PIT/修订链不足；BaoStock 有界稳定性与恢复探针通过，真实交易时段长期稳定性仍待观察；Ubuntu 实机人工子项已确认通过） | PASS（用户人工验收确认，2026-09-20；页面、normal/rejection/recovery 场景和导出证据已复核） | `docs/evidence-v2.5.md`；DC-T23 `evidence/dc08a/historical-replay-2026-09-16.json`；normal `e033c817-d521-40a8-892c-3c5b8098ea4c`；rejection `17057748-135a-4337-a726-e654f97ed565`；recovery `d3fefb85-2fb9-42c2-9cc1-adefba08af77`；导出 Manifest `f2a8f76cfe03fb5f4a76988812d20c46ff1eca562dadb5027344bd277ff1f575` | 分钟级全量、真实交易时段长期限频/恢复稳定性、60日备用免费分钟源、带修订链的真实 PIT、容量长期稳定性和 V2.4 20 日观察待完成；Ubuntu 原始技术日志待补 | 用户人工确认 / 2026-09-20；技术复核 / 2026-09-20 |

最新复核（2026-09-17）：Docker 服务全部健康；DC-08A 目标20只订阅已完成48/48窗口、960/960根5分钟Bar，日终报告为`PASS`，开放缺口和待投递Outbox均为0，实际来源统计为Sina 960根。自动任务首次请求失败后受控重试完成切换；由于切换发生在收盘后，本次仅作为收盘后数据质量证据，不计作全天盘中观察日。V2.4 20个实际交易日观察、其余人工验收和真实盘中主源稳定性继续保持未完成。

2026-09-19 V2.3 技术收口证据：正式验收 `4db177da-6f2f-46c1-adb5-8e75f7a33309` 已执行 3 Bar 跨服务回放，3/3 Fill、3/3 账本提交屏障，checkpoint `cursor=3,eventSequence=15,ledgerVersion=4`；长任务 Web E2E 暂停/恢复通过（2/2）。证据 Manifest Hash：`54aba03f4885e63bcf4e154350e82acda01fd886b6644d66644be341bd778036`。

2026-09-19 V2.3 人工验收复核：用户确认按执行顺序重新完成 normal `ca0678f9-7c24-4f99-ad58-59054dfac2f9`、rejection `79f5af32-9ede-492d-94b2-3a554394a06f`、recovery `5a98fffc-50f4-4fb7-a90c-3a44ce9542b0`；三场景、Web E2E 2/2、code suite、同 run check-only 和证据导出均 PASS。fresh Manifest Hash：`f8329e91ea592a90cf8db8cc5b0228883383425262fa7b7eb0e6cf8ff61c772e`。本结论仅覆盖 V2.3 技术收口范围，不代表真实模型、LIVE 或 V2.4/V2.5 门禁。

2026-09-27 复核追加：保留上条历史用户签署，但当前V2.3研究能力状态改为PARTIALLY_IMPLEMENTED。量化Worker原先只计算Fixture open均值/重算摘要Hash，并未调用Qlib模型；相关返回字段已更正为Fixture-only，Qlib模型训练与独立模型验证NOT_RUN。完整更正与当前证据见[边界更正审计](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md)。

2026-09-23 TDX 候选源复核：新增可选 easy-tdx 适配器并锁定 Git commit
`4820b4a0496899ece0b8ca4d7f4d66a5159da7f8`。离线质量检查和适配器 48/48 单元测试通过；
真实只读探针对3只跨沪深证券返回144根5分钟Bar，服务器为 `121.37.207.165`，结果 Hash
为 `12ae2df345ae6939568b55a700ea8a2d24bc14bb7a32ab96354240441d2ff0ef`。该证据只证明候选
源的单日小样本可读性，正式来源仍为 `sina,baostock`；2个实际交易日、20只证券、持续限频、
窗口完整性及恢复观察继续为 `NOT_RUN`，不改变 V2.4 8/20 或 DC-08A 5/20 门禁。

## 2. 版本门禁

2026-09-24 运行快照：V2.4 `/api/v1/acceptance/v2/v2.4/observation-summary` 返回 `WAITING`、8/20、剩余12日；调度器 `RUNNING`，采样30分钟、Paper/FakeBroker。DC-08A 健康报告为 `HEALTHY`，20只订阅、调度器/执行器 `ENABLED`，当日日终为48/48运行、960/960根Bar、开放缺口0、待投递Outbox 0；BaoStock 与 Sina 当前均为 `CLOSED`。健康只代表至少一个来源可用和数据质量门禁通过，不表示 BaoStock 已完成长期盘中稳定性验收。2026-09-24 起日终计数还要求盘中采样完整、执行窗口存在且逐次行情新鲜。

自动化复核：a-20、dc-08a、dc-08a-2 为 ACTIVE；dc-08a 守卫配置 `UNTIL=2026-10-20T00:45:00Z`（北京时间 08:45）；a-20 与盘后任务无到期时间。已完成的一次性 dc-08a-20 和已迁移旧 stockquant 任务均 PAUSED。验证命令 `pnpm dc08a:verify-automation` PASS；详见[阶段六审计](../../../evidence/audits/2026-09-23-phase-6-status-and-automations.md)。

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
