# W9 当前版本与历史 TestRun 证据门禁

日期：2026-10-05（Asia/Shanghai）

`pnpm baseline:check`退出0：Markdown链接3830/0失败；229 JSON、159 Schema、39 Fixture校验无失败；Contracts生成/兼容、8个服务分层扫描及26项版本/证据门禁治理测试通过。

三个正式版本门禁均维持未完成，退出码2是预期的 fail-closed 结果：

| 版本 | 结果 | 阶段审计 | 证据引用 / Manifest / Manifest条目 |
|---|---|---:|---:|
| V1 | INCOMPLETE | PASS，5阶段 | 91 / 12 / 33 |
| V2 | INCOMPLETE | PASS，5阶段 | 286 / 49 / 124 |
| V3 | INCOMPLETE | PASS，4阶段 | 300 / 56 / 122 |

`pnpm audit:legacy-testruns`扫描290个本地结构化证据JSON，发现16个未解决的V1/V2精确TestRun关联，精确载荷匹配为0。历史导出可用性审计已确认当前活动Platform数据库/API不能提供这些旧Run；本轮没有伪造、重建或更改导出、签名、Acceptance状态。

本轮只读检查发现官方导出命令需当前本地会话Cookie；本环境没有该Cookie，故精确API导出请求未发出（不是新的HTTP 404结论）。历史API 404及活动数据库精确ID缺失的依据继续使用2026-10-02既有审计。若需恢复历史Run，仍需原始导出或包含精确记录且获准使用的历史数据库备份。

V1/V2/V3的版本状态、当前`NO_TRADE`、数据源授权`NONE`、O1/O2归档观察8/20、Ubuntu实机门禁和用户人工签署均未改变。门禁结果只证明文档结构、引用Hash与规则检查，不证明业务完成。
