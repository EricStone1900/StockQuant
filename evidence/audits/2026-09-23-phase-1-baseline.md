# StockQuant 阶段一基线

采集时间：2026-09-23 19:03（Asia/Shanghai）  
仓库：`main` / `eb463bdb7039a78620157d6baa1db402a5b59d44`（`chore: finalize observation and source readiness evidence`）  
范围：只读核验 Git、验收文档、Docker 运行状态、Codex 自动化配置、市场数据 API 和 PostgreSQL 观察记录。未修改服务配置、定时任务、业务数据或历史验收记录；未输出环境变量/凭据。

## 当前仓库与版本门禁

- 开始时 `git status --short` 为空，`git diff --check` 通过；分支为 `main`。
- V1 验收页仍为 `NOT_RUN`，版本级门禁未全部勾选，模板保留待填字段。各子阶段的历史 PASS 不代表版本门禁全部通过。
- V2 验收页标记 `PARTIALLY_IMPLEMENTED`，但开头仍记有过时的 V2.4 6/20 和 DC-08A 2 稳定日＋1 恢复日。
- V3 验收页为 `NOT_RUN`。V3.1 代码/隔离 Smoke 进展不能当成真实研究闭环验收。
- 实际研究服务 `/ready`：`brokerMode=FAKE`、Runner 和模型网关均 `NOT_CONFIGURED`、出站策略 `DENY`、预检 `BLOCKED`、模型调用 `NOT_RUN`。缺少真实隔离 Runner、模型网关启用、两个凭据及出站目标许可。

## 运行服务快照

共发现 13 个 Compose 容器处于 running。启用了健康检查的服务均显示 healthy；NATS、Temporal 和 Web 未配置 Docker healthcheck。当前镜像摘要如下（同一镜像内多服务摘要相同）：

| 镜像 | Image ID 摘要 |
|---|---|
| decision-governance-service | `sha256:2d9523ff812af3b3b5798fe23d1657e2d093990c92e7a0aa597bf25314cc755c` |
| historical-replay-worker | `sha256:a10b9c2c1262d0c8d15e511e81c36c03d24e7fe1190c37458048aa9b7ddd733f` |
| market-data-service | `sha256:d38b15a871e3528465c2556fd55b306bb5152e70219b98c90af58fe58dfc49c5` |
| platform-api-service | `sha256:6e985df90991d51eb1fe3ab10f1cc7303e0d76397ec4bf7e03c457f101a7aaec` |
| portfolio-risk-service | `sha256:04c5a69dc1c71eed8b7109f2a6b400479aaa2a3193bab29288fed1688b53f90d` |
| postgres `16.9-alpine` | `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2` |
| qlib-worker | `sha256:4135861adbf3617ae1b2e578caf7d2eb3f3835e0f5f42cf257b7a0d7b6991094` |
| quant-research-service | `sha256:456e4adee46e4c9d1ac4cd73f5d707f709c745c18562fdf304b34049f06eaaa4` |
| research-automation-service | `sha256:6f2193dee9c46901b3d30b89ddaa83a2a98d45c1b191aef617bdfa00fd4c5770` |
| trade-execution-service | `sha256:846a83f10d8e4098bb430709fa1d58f7c54fd8171251e74185ed19cefa8427d3` |
| web | `sha256:d50949054a23decda29c6fb1c4d0138e8a63f1e0379f8d19d2e17973e2a64df2` |
| NATS `2.10-alpine` | `sha256:dcadf8f23b60edaaafbe901db7773e2c07947f269c475d8d33d3b46a18b0a7f9` |
| Temporal `latest` | `sha256:6a84517bc49b4b5a18177a8abcd4f127c3e3c00f425238ec3636e0e13dc906a7` |

## 定时任务与市场数据

- `StockQuant A股持续观察与数据采集巡检`（`a-20`）：ACTIVE heartbeat，工作日 08:00–17:45 每 15 分钟。
- `DC-08A 启用守卫`（`dc-08a`）：ACTIVE，工作日 08:45；配置 UNTIL 为 2026-10-20。
- `DC-08A 日终质量告警`（`dc-08a-2`）：ACTIVE，工作日 15:20。
- `DC-08A 切换20只证券` 与旧版独立巡检均 PAUSED。
- 市场数据调度器与执行器 ENABLED，持久化为 POSTGRES；运行时报告 `FIXTURE_PLAN_ONLY`。最近成功 Tick 为 `2026-09-23T11:02:50.496Z`，下一触发 `2026-09-24T01:37:00.000Z`（北京时间 09:37）。
- 活动订阅 `dc08a-20260917-20-v1`，20 只证券。2026-09-23 数据库核对：COMPLETED 48/48、960 根 Bar；API 质量为 0 个开放缺口、0 个待投递 Outbox。存档日终报告同样为 PASS。
- 来源配置顺序为 `sina,baostock`。Sina 熔断 CLOSED、失败 0；BaoStock 熔断 OPEN、失败 92、最后错误 `EMPTY_RESULT`；Eastmoney DISABLED。当前采集可用不代表 BaoStock 已恢复。
- DC-08A 存档汇总为稳定完整日 3 天、恢复后完整日 1 天、总计 4/20，状态 WAITING。此为当前汇总脚本计算结果，后续阶段二需修正并复核其快照合并口径。

## Paper 最终观察

PostgreSQL `platform_api` 中 `v24_scheduler_state` 为 RUNNING，采样间隔 30 分钟，执行窗口 `09:31-09:35`；最近记录采样 `2026-09-23 15:10:00.151 +08`，下次 `2026-09-24 09:30 +08`。

`v24_observation_day_finalizations` 有效记录为 **7/20**：9 月 15、16、17、18、21、22、23 日通过；9 月 19 日未计入。文档页仍写 6/20，后续应根据此 DB 最终表和既有签署更新状态说明，并保留旧历史。

## 阶段一未决项与后续入口

1. 先在阶段二修正观察汇总中后续缺口仍保留 PASS 的问题，再重新计算历史归档。
2. 阶段三处理实验预算预留覆盖、UNKNOWN 状态保护和 Runner 宿主挂载边界；本阶段没有运行危险挂载。
3. 阶段四澄清 Sina 优先情况下 BaoStock 如何独立恢复探测。
4. 阶段五复核 NATS/Temporal 的持久卷和 Temporal `latest` 标签，制定保留现有状态的迁移与重建恢复方案。基线未验证重启恢复，也未执行任何迁移。
5. 阶段六更新 V1/V2/V3 验收页、进度和健康接口状态，检查自动化 ACTIVE/PAUSED/到期规则。
6. 阶段七的真实模型闭环处于门禁阻塞；完成安全和运行边界后，再配置隔离 Runner、凭据、出站域名及调用预算。

阶段一产物不表示以上缺陷已修复或版本门禁已通过。数据库查询、HTTP 检查和容器信息均为 2026-09-23 当次快照；运行状态之后可能变化。
