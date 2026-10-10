# V1 当前 platform_api 数据库只读前置审计 A01

日期：2026-10-09。目标：`stockquant-v12` 项目中的 `platform_api` 数据库。仅用 `BEGIN READ ONLY` 查询聚合数量、表存在性及四个已知TestRun UUID的存在性；不读取Run的evidence/assertions正文，不修改数据库、不导出备份、不切换存储。

原始查询输出：[摘要日志A01](./2026-10-09-v1-active-db-preflight-a01.log)，SHA-256 `b41f81bedce7314b2502653308e6f0027726f0a6694a7867b555aff3e8941810`；[V1.1与非终态核对A02](./2026-10-09-v1-active-db-preflight-a02.log)，SHA-256 `7729331e69a5de85c75e8abb05b1a35432580c63e6992817f39152a24272ebdf`。当前容器、挂载及Artifact根目录观察见[活动容器审计](./2026-10-09-v1-active-container-inventory-a01.md)。

## 当前数据库事实

| 查询对象 | 当前结果 |
|---|---|
| legacy `test_runs` | 共59条：COMPLETED 53、FAILED 3、RUNNING 2、WAITING 1；非终态3条 |
| `acceptance_stage_runs` | 共288条：COMPLETED 262、FAILED 14、RUNNING 11、WAITING 1；全表非终态12条 |
| V1.1 stage记录 | 共44条：COMPLETED 38、FAILED 3、RUNNING 2、WAITING 1 |
| `public.qlib_fixture_artifacts` | 当前数据库中不存在该表 |
| 四个缺失UUID | V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`和V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`在legacy与stage表均无记录 |

旧Runbook中2026-10-01/02的49条legacy、44条V1.1 stage快照属于历史，不再代表当前活动数据库。当前legacy与V1.1 stage数量差15；此差值只代表计数差，不表示已确定具体缺失行或可直接迁移。迁移前必须完成逐行ID/字段/接受历史parity和冲突清单。

## 放行结论

迁移Runbook要求legacy中任何QUEUED/RUNNING/WAITING行先由操作负责人明确处置并留证。当前3条非终态令迁移前置未通过；12条stage非终态也需在实际维护窗口冻结写入并核对业务状态。当前运行Platform仍为`legacy`，容器Artifact根目录不存在且没有挂载Artifact卷；本数据库也没有独立Qlib Artifact引用表。没有检查容器本地以外的存储/外部备份，不能据此判断全部Artifact已丢失或不可恢复。

状态保持`NOT_READY / NOT_AUTHORIZED / NOT_DEPLOYED`。此轮未创建数据库副本或备份，未处置非终态Run，未重建/停止容器，也未恢复任何TestRun。四个历史TestRun仍缺原始结构化导出；其本地活动DB来源已再次核实为空，但离线/外部归档仍未查证。
