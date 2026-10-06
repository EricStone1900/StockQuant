# W1/V1.1 活动 TestRun 非终态只读复核

- 时间：2026-10-05 13:38Z
- 活动容器只读清单：13个既有`stockquant-v12-*`容器仍在运行；Platform API与PostgreSQL为healthy。本轮没有启动、停止或重启容器。
- 在活动`platform_api`数据库使用`BEGIN READ ONLY`查询，仅包含2026-10-02审计中已标记的三个精确UUID，并仅读取两个Run表的stage/status/created_at及其精确断言行数。
- `acceptance_stage_runs`和legacy `test_runs`均仍包含相同三项：`221157ba-dde4-4fe4-92ff-0bb942c066b4` normal/RUNNING（2026-09-15 14:42:58.67055Z）；`49a6dfa0-4c96-480f-9d64-7680fa61a626` normal/RUNNING（14:44:16.160814Z）；`fbb122dc-2543-4680-b3fb-bf474161ce45` recovery/WAITING（2026-09-16 11:57:56.055377Z）。两个RUNNING记录在本次精确断言查询中没有断言行；WAITING记录有1条断言。
- 与2026-10-02相比，状态和创建时间未变。没有读载荷以外字段、重跑场景、修改记录、运行迁移、改API配置或改变Acceptance/人工签署状态。
- 结论：历史非终态仍需操作负责人按Runbook决定；不能单凭状态推定为失败或成功。V1.1活动API切换仍不满足前置条件。

可重核SQL见同目录`.sql`文件；本审计SHA清单绑定报告、JSON、SQL和官方活动容器清单结果。
