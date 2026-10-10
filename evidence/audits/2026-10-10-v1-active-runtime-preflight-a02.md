# V1 活动存储运行时前置复核 A02

日期：2026-10-10（Asia/Shanghai）。范围：只读检查`stockquant-v12` Docker Compose 容器/卷元数据，以及`platform_api`数据库中的状态聚合、非终态Run标识和四个缺失UUID存在性。未读取Run正文、Artifact文件或凭据；未创建备份，未停止、重启、删除或修改容器/数据库/卷/网络。

机器报告：[JSON](./2026-10-10-v1-active-runtime-preflight-a02.json)，SHA-256 `2c51bf95c95d1befed7150b24de1132ba886d521d65798c9f90daa84bdfbf7f4`。

## 运行配置事实

- Docker中`stockquant-v12` 13个容器仍在运行。Platform API、PostgreSQL、Research Automation及Market Data显示healthy；Temporal/NATS无Docker healthcheck。平台API绑定127.0.0.1:3000，PostgreSQL绑定127.0.0.1:5433。
- Platform API的Compose项目仍指向仓库`infra/compose/docker-compose.yml`，镜像ID为`sha256:77c1521a431b7012b8a18815e5924d962e20cd1b5dbd6a975e47a97f18c71513`；运行配置`STOCKQUANT_V11_RUN_STORAGE=legacy`，实际挂载为空。
- PostgreSQL使用`stockquant-v12_postgres-v11`卷；Research Automation挂载`stockquant-v12_research-artifacts-v1`至`/var/lib/stockquant/research-artifacts`。同卷没有挂载至Platform API。NATS与Temporal各自挂载`stockquant-v12_nats-jetstream-v1`和`stockquant-v12_temporal-dev-state-v1`。
- 此项再次确认A01的Compose/运行配置漂移。Artifact目录/字节未检查，不能判断其内容或PostgreSQL引用是否完整；不应按Compose声明假定实际Platform卷挂载。

## 数据库只读结果

在`BEGIN READ ONLY`事务中，legacy `test_runs`共60条：COMPLETED 54、FAILED 3、RUNNING 2、WAITING 1。V1.1 stage表仍44条：COMPLETED 38、FAILED 3、RUNNING 2、WAITING 1；`acceptance_stage_runs`全表288条，其中非终态12条。`public.qlib_fixture_artifacts`仍不存在。四个缺失UUID在legacy和stage表均无记录；这只表示当前活动库未找到，不能证明离线/外部备份不存在。

仍待操作负责人逐项处置的三条legacy非终态Run：

| 阶段 | 场景 | 状态 | TestRun ID | 创建时间（UTC） |
|---|---|---|---|---|
| V1.1 | normal | RUNNING | `221157ba-dde4-4fe4-92ff-0bb942c066b4` | 2026-09-15 14:42:58.67055 |
| V1.1 | normal | RUNNING | `49a6dfa0-4c96-480f-9d64-7680fa61a626` | 2026-09-15 14:44:16.160814 |
| V1.1 | recovery | WAITING | `fbb122dc-2543-4680-b3fb-bf474161ce45` | 2026-09-16 11:57:56.055377 |

与A01相比legacy总数从59变为60，已完成行从53变为54；V1.1 stage计数和三个非终态Run未变。该变化说明快照会继续变化，正式维护前需重做最新逐行Parity，不可把历史数量当作迁移输入。

首次UUID存在性查询误用了不存在的`test_runs.id`列，READ ONLY事务报错回滚；经`information_schema.columns`确认两表字段为`test_run_id`后重跑成功。错误只读探针不构成数据库写入。

## 结论

状态维持`NOT_READY / NOT_AUTHORIZED / NOT_DEPLOYED`。活动Platform仍走legacy；Artifact卷挂载漂移、三个非终态Run、四个历史结构化导出缺失以及目标实例确认/维护窗口尚未解决。此审计不授权处置Run、补挂载、备份、切换或清理任何活动资源。
