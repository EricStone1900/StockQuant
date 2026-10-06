# O1/O2 活动运行态只读复核（2026-10-03 09:25Z）

仅运行项目的Health、启用订阅数和归档观察汇总命令。无外部Provider请求、未触发任务/采集、未修改订阅、配置、账本或活动服务。

- `pnpm dc08a:health-report`：exit 1 / `UNHEALTHY`，因为`nextExecutionAt=null`且`nextTriggerRecorded=false`。市场日历为CLOSED；最近tick为09:25:23Z，1.283秒前；`lastSubmitted=0`、open gaps=0、pending outbox=0。Health/readiness仍显示Scheduler/Executor ENABLED，配置订阅ID `dc08a-20260917-20-v1`；然而独立`pnpm dc08a:active-subscription -- --field enabled-count`为0。保留此readiness/订阅差异，未对活动服务部署或重启。
- `pnpm dc08a:observation-summary`：exit 2 / WAITING，7个完整日+1个恢复日=8/20，剩余12个；最新合格日2026-09-30，48/48运行完成，零缺口/待投递。10月3日周六及无有效采集日均不计观察。
- O1/O2前置：`NO_TRADE`且source authorization `NONE`。本次无行情/Provider调用，不增加有效观察日。

原始派生快照见[Health](../dc08a/health-report.json)与[Observation Summary](../dc08a/observation-summary.json)。SHA-256清单覆盖此说明及两份派生快照；机器结论见[JSON](2026-10-03-o1-o2-runtime-readonly-0925z.json)。
