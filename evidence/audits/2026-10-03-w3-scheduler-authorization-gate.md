# W3 调度器来源授权门禁补充审计

2026-10-03。只读现场发现 Market Data readiness 同时报 Scheduler/Executor `ENABLED`，独立启用采集计划数为0，Source Authorization未批准。源码显示Executor已按精确分钟源授权 fail-closed，但Scheduler只检查启用环境开关，可能在无授权时仍生成不能执行的collection run。

修复将Scheduler worker的创建条件绑定到与Executor相同的精确来源集合授权：用途开关必须为`true`，授权引用和数据版本非空，且所有配置的source ID均在允许列表。隔离Harness主动将Scheduler和Executor请求开关都设为`1`、授权设为`false`，实际`/ready`返回两者均`DISABLED`且来源`NOT_AUTHORIZED`；不调用Provider、不操作活动服务。

Market Data单测71/71、typecheck、24/24 PostgreSQL integration及完整`pnpm verify:stage -- --stage V2.4 --suite code`均通过；4个API和4个Web运行均使用同Run CLI核对。来源请求/Provider调用均为0，Harness确认活动服务未连接、5个临时数据库快照导出、临时PostgreSQL容器/网络及临时Web容器/镜像均清理。原始完整V2.4运行报告见[smoke JSON](2026-10-03-v24-paper-smoke-67355b57a2fc47c6b610025cfff9ae9e.json)。

失败尝试保留：[首次基线失败日志](2026-10-03-w3-scheduler-authorization-gate-first-attempt.log)记录了新增审计链接目标尚未创建时docs:check停止；[第二次尝试日志](2026-10-03-w3-scheduler-authorization-gate-second-attempt.log)记录历史V2.4源码Manifest与当前源文件Hash不一致导致版本审计停止。旧V2.4源Manifest文件仍保留作历史快照，阶段文档已注明其源版本过期，当前修订由本次审计和sources manifest核验。

本修复尚未部署至活动服务；NO_TRADE、来源授权NONE、O1/O2未新增观察日均保持。此工程门禁不代表真实数据授权或V2.4业务/人工验收通过。
