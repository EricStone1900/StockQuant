# W4 V2.5 当前最终代码场景与回归结果

日期：2026-10-01（Asia/Shanghai）

本审计覆盖当前工作树最后一次V2.5场景引擎变更：资源计时现从合成Fixture生成开始覆盖到规模、回归、切分、分区和缓存计算结束；RSS在场景运行后测量。Platform API运行镜像ID为 `sha256:77c1521a431b7012b8a18815e5924d962e20cd1b5dbd6a975e47a97f18c71513`，`/ready`报告FAKE模式。

## 先前证据更正

更早创建的Run `4b370296-b2f1-41c5-80ab-96677a9b580c`、`4907c01c-6aea-46c8-9a1f-8d25580a944f`、`bb4ea149-3d83-4591-a0ca-c9b6bd2a2458`来自硬编码actual值的旧实现。Run和导出保留作历史，但已从行为证据中撤销。第一轮动态Fixture Run `599eca31-41cb-4494-aa6d-f591bdc5d5f1`、`5872d881-c61c-4505-a2aa-84e01d37d08f`、`cf8d64f0-8272-4f2a-8704-f0363516aee8`又因资源计时未覆盖Fixture生成，被最后一轮当前镜像Run替代。各历史记录未覆盖或删除。

## 最终代码Run

命令：

- `pnpm verify:stage -- --stage V2.5 --scenario normal --seed 20261001`
- `pnpm verify:stage -- --stage V2.5 --scenario rejection --seed 20261001`
- `pnpm verify:stage -- --stage V2.5 --scenario recovery --seed 20261001`

| 场景 | 当前代码TestRun | 断言 | 同Run `--check-only` | 脱敏导出Manifest |
|---|---|---:|---|---|
| normal | `70240b6d-ea36-4ae2-b3b0-fca24b754cd4` | 6/6 PASS | exit 0 | [Manifest](../local/V2.5/70240b6d-ea36-4ae2-b3b0-fca24b754cd4/manifest.sha256)，Hash `5f466561294454b312236521cb2beb573f506706db13c3975773482563652caf` |
| rejection | `455146c8-122f-44fa-8913-713b196cd1e5` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/455146c8-122f-44fa-8913-713b196cd1e5/manifest.sha256)，Hash `acc1288afa562267286340015d1a0b74ce6f547f3f2ad539646aee650c906773` |
| recovery | `b5979c90-27fa-4ef9-9777-094359df2a1c` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/b5979c90-27fa-4ef9-9777-094359df2a1c/manifest.sha256)，Hash `08b0c3d2d0fa1dfc09c05264bfb471a4d3cbebe29cc764ad5f367456965b0161` |

normal实际生成1,200行合成数据，比较300行基线与扩容数据中的相同300行Hash一致；时间切片顺序、60行证券分区、DataVersion缓存键均从执行结果计算。计量结果RSS 205 MiB、全阶段耗时0.005秒，预算1024 MiB/120秒；架构是linux/amd64仿真。rejection实际运行进程内准入模型、DataVersion Map查找与预算发布守卫，结果4准入/1拒绝、跨版本未命中、超限不发布。recovery从内存检查点640行续至1,200个唯一行键，无重复；这些不是生产队列或数据库持久操作。

所有Run返回同一实现明确标记：`dataMode=FIXTURE`、`evidenceMode=IN_MEMORY_SYNTHETIC_FIXTURE`/`IN_MEMORY_SCENARIO_POLICY`、`productionQueueValidation=NOT_RUN`、`durableImportRecovery=NOT_RUN`、`modelTraining=NOT_RUN`、`marketPIT=NOT_RUN`、`durableMarketDataQuery=NOT_RUN`。数据版本 `v2.5-acceptance-synthetic-fixture-v2` 与BaoStock历史档案`v2.5-cn-minute-20x60-v1`分离。

## 自动回归

- `pnpm verify:stage -- --stage V2.5 --suite code`：exit 0。契约/Fixture、全仓build/lint/typecheck/unit、Market Data PostgreSQL集成22/22及阶段代码检查通过。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.5`：exit 0，页面测试1/1通过。页面用例只验证扩容与恢复证据展示。
- V1/V2/V3证据引用审计和三版总门禁另见最新W9报告。

## 尚未关闭的门禁

用户确认`NO_TRADE`且暂无线源授权，因此不启动新来源采集或真实市场研究。此处Fixture验证不能满足真实Qlib业务路由/独立复算、历史证券池与真实PIT、真实分钟容量档位和生产数据库导入/分页/缓存/队列/配额/取消/持久恢复、长期来源稳定与60日备用源、V2.4观察或用户对新增研究范围的人工验收。V2.5与V2版本继续保持未完成。
