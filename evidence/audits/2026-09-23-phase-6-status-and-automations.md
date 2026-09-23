# 阶段六：验收状态、健康快照与自动化规则复核

日期：2026-09-23（Asia/Shanghai）  
范围：只读读取运行健康、V2.4 最终观察汇总、DC-08A 归档快照及 Codex 自动化配置；更新 V1/V2/V3 验收状态和 V2 数据采集进度。没有启动/暂停/改期自动化，没有写业务数据库，也没有改变用户签署。

## 当前运行与观察状态

- `pnpm v24:preflight` 退出 0，5 项全部 PASS：platform API、market-data 服务、V2.4 scheduler、A 股日历、报价新鲜度。Paper scheduler 为 `RUNNING`，采样间隔 30 分钟、窗口 `09:31-09:35`、FakeBroker，下一采样 `2026-09-24T01:30:00Z`（北京时间 09:30）。采集服务使用 PostgreSQL，调度器/执行器 `ENABLED`，活动集合为冻结的 20 只证券。
- 只读 `GET /api/v1/acceptance/v2/v2.4/observation-summary` 返回 `WAITING`，目标 20 日、有效 `7/20`、剩余 13 日。有效日期为 2026-09-15～18、2026-09-21～23；9 月 19 日的日终记录未计数。9 月 23 日记录对应 TestRun `753fdfc2-fec2-4591-bd9e-c43c1d74e116`，复核时未修改。
- `pnpm dc08a:supervise -- --check-only` 退出 0、状态 `HEALTHY`、`actions=[]`；没有触发服务重启或其他修复动作。
- 通过只读健康接口另存 [dc08a-health-v3 快照](./2026-09-23-phase-6-health-report.json)：捕获时间 `2026-09-23T12:10:00.025Z`，总体 `HEALTHY`、活动订阅 `dc08a-20260917-20-v1`、20 只证券、缺口 0、待投递 Outbox 0，下一触发 `2026-09-24T01:37:00Z`。Sina 熔断 `CLOSED`、失败 0；BaoStock `OPEN`、失败 92、最后错误 `EMPTY_RESULT`；Eastmoney `DISABLED`。`HEALTHY` 指至少一个可用来源和其他健康门禁通过，不表示 BaoStock 已恢复。
- 以当前归档观测文件重算并另存[观察汇总](./2026-09-23-phase-6-observation-summary.json)：稳定完整日 3（9/18、9/22、9/23），恢复后完整日 1（9/21），总观察日 4/20、剩余 16、`WAITING`。它是 DC-08A 当前订阅口径，与 V2.4 数据库 7/20 的长期观察口径不同。

## 自动化 ACTIVE / PAUSED / 到期

配置来自 `~/.codex/automations/*/automation.toml`，并以 `pnpm dc08a:verify-automation` 校验。此命令退出 0、状态 `PASS`。

| ID | 状态 | 计划 | 到期规则 |
|---|---|---|---|
| `a-20` | ACTIVE | 工作日 08:00–17:45，每 15 分钟；运行监控、收盘检查、健康和观察汇总 | 无 UNTIL/COUNT，持续任务 |
| `dc-08a` | ACTIVE | 工作日 08:45 启用守卫 | `UNTIL=2026-10-20T00:45:00Z`，即北京时间 2026-10-20 08:45 |
| `dc-08a-2` | ACTIVE | 工作日 15:20 日终质量告警 | DTSTART 2026-09-14，无 UNTIL，持续循环 |
| `dc-08a-20` | PAUSED | 已完成的一次性切换守卫，RRULE COUNT=1 | 保持暂停，避免重复切换 |
| `stockquant` | PAUSED | 已迁移到 `a-20` 的旧巡检 | 保持暂停，避免重复启动独立任务 |

未发现状态与用途冲突；当前 `pnpm dc08a:verify-automation` 之前没有检查日终任务是否为 ACTIVE，也没有验证启用守卫的精确到期日。本阶段已扩展该脚本输出五项配置摘要并校验这些状态/日期，防止后续意外漂移。没有修改任何自动化状态或调度时间。

## 版本验收结论

- V1 总结保持 `NOT_RUN`：既有各阶段自动测试和用户人工签署原样保留；版本级门禁仍未全部完成，Ubuntu 原始技术明细仍缺。阶段五当前 Compose 持久卷重建证据作为补充 PASS，不改变版本签署。
- V2 总结保持 `PARTIALLY_IMPLEMENTED`：V2.4 20 个实际交易日门槛为 7/20；V2.5 分钟级长期稳定性、备用免费源/真实 PIT 等门槛仍未完成；DC-08A 独立观察为 4/20。自动任务正常不等于观察门禁通过。
- V3 总结保持 `NOT_RUN`：V3.1 前置代码、镜像与受限 Smoke 属于准备证据；真实 RD-Agent/模型调用、Runner API 接入、预算实际调用链、Provider 精确域名许可和真实 Ubuntu 仍未完成，OD-009 和用户验收不关闭。
- 整体长期产品 R0–R3 与真实券商保持 `NOT_RUN`；没有把 `brokerMode=FAKE` 的模拟运行表述成真实交易能力。

## 已执行验证

- `pnpm v24:preflight`：5/5 PASS，退出 0。
- `pnpm dc08a:supervise -- --check-only`：HEALTHY、无动作，退出 0。
- DC-08A 健康报告：HEALTHY；原文件未覆盖，专用快照已归档。
- `pnpm dc08a:verify-automation`：PASS；覆盖五个自动化的状态、周期、一次性规则和到期时间。
- `pnpm docs:check`、`git diff --check` 等文档/工作区检查见本阶段交付验证记录。

真实来源收盘后状态、每个后续交易日的新增观察以及自动任务实际每次运行成功仍是会变化的运行事实，需继续由现存自动化按日记录；本次配置审核不能代替未来任务运行证据。

## 追加复核：版本门禁与 UNTIL 语义

补跑 `pnpm verify:version -- --version V1|V2|V3`：三版均输出 `INCOMPLETE`、退出码2；V1 因 V1.1 仍是部分实现，V2 因 V2.4/V2.5 门禁未完，V3 因所有阶段仍 NOT_RUN。三版的验收行与阶段行均匹配，没有缺失或意外阶段；退出码2是预期的“门禁未完成”，不是脚本故障，也不能记作 PASS。

Codex 配置文件中的 `UNTIL` 明确给出 dc-08a 守卫的最后计划时间；截至本次检查它仍在未来。公开的 [OpenAI Developers Codex 自动化介绍](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)只描述自动化用于后台例行任务，并未说明 RRULE `UNTIL` 到达后，自动化资源的 `status` 是否会自动变成 `PAUSED`。因此本记录只确认到期规则配置，不承诺到期后的状态迁移；到期日后需再从 Codex 自动化卡片/API 核查实际状态，如仍为 ACTIVE，应确认其不再触发并按需要显式暂停。
