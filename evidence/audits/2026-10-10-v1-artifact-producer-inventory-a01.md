# V1 Artifact 生产者当前源码盘点 A01

日期：2026-10-10（Asia/Shanghai）。范围：当前工作树源码；核对 V1.1–V1.5 实际动态产物、持久化位置、权威引用和读/发布入口。此为静态源码追踪，不代表活动实例/卷的完整盘点、运行时数据校验、OD-013所有者决定或物理清理授权。

## V1内实际动态产物与持久化边界

| 来源/版本 | 产物字节与权威存储 | 关联与发布/读取约束 | OD-013分类/未完成项 |
|---|---|---|---|
| V1.2 Qlib模型/预测 | Platform `PostgresQlibFixtureArtifactRepository`把规范化Payload按SHA写入共享`QlibArtifactContentStore`，新行payload置NULL；表行保存artifactId、TestRun、owner、mediaType、SHA、status及expiresAt。历史JSONB payload仍兼容读取。[装配](../../services/platform-api-service/src/bootstrap/app.module.ts#L127)；[存储/Hash](../../services/platform-api-service/src/adapters/postgres-qlib-fixture-artifact-repository.ts#L92) | TestRun/owner复合读取，仅PUBLISHED/RETAINED；取出内容后重新计算Hash。Qlib工作流先保存PENDING，只有Run仍RUNNING且非取消才发布；失败会隐藏引用。[工作流](../../services/platform-api-service/src/application/v12-acceptance.ts#L240) | V1共享文件卷的实际字节生产者。OD-013必须核对新文件、旧JSONB、Platform metadata、Run/导出引用及活动读写；保留期限、统一引用权威与活动卷配对恢复未完成。 |
| V1.4 Quant回测结果/Manifest | Quant `research_backtest_runs.result_payload`和`research_backtest_manifests.manifest_payload`同事务写PostgreSQL并各存SHA；不是共享内容目录对象。[保存/读取](../../services/quant-research-service/src/adapters/postgres-v14-backtest-repository.ts#L15) | Platform仅当同Run返回、Quant COMPLETED且所有断言PASS时创建`BACKTEST_REPORT` ArtifactRef，并将完整报告payload投影到Platform TestRun evidence；取消/失败无发布引用。[投影](../../services/platform-api-service/src/application/v14-backtest-run.ts#L83)、[读取校验](../../services/platform-api-service/src/application/v14-report-artifact-ref.ts#L17) | 是数据库报告和Manifest引用。灾备须配对Quant BacktestRun、Manifest与Platform TestRun；当前同输入Paper完整账本对照/规则对照仍开放。 |
| V1.1/V1.3/V1.5 TestRun | Platform TestRun/evidence JSONB保存运行状态与证据投影；订单、Fill、持仓/现金、授权、Mandate、Outbox、NATS/Temporal分别由领域服务/基础设施持有。 | Evidence Export按调用者选定的Run读取并导出Manifest，不拥有原服务字节。关闭Run、过期某个Artifact或导出证据均不授权删除业务账本/工作流事实。[Stage Run持久化](../../services/platform-api-service/src/adapters/postgres-stage-run-repository.ts) | 受保护业务事实/引用；不视为OD-013可清理文件。必须按服务恢复且保持幂等。V1.5四卷隔离恢复不能证明活动宿主/异地恢复或V1.1–V1.4生产产物齐全。 |
| V1.2 Market Data采集Dataset | `market_data_collection_artifacts`元数据及`market_data_artifact_rows`分行JSONB，属于Market Data PostgreSQL关系型数据，不在共享内容寻址卷。[完成发布](../../services/market-data-service/src/adapters/postgres-collection-run-repository.ts#L195) | projectId/dataVersion分页与scope由Market Data服务控制；以采集Run、row_count和SHA发布。Artifact名称不意味着通用文件对象。 | 不纳入共享文件清理；其数据集保留/项目授权政策另需明确。若要迁移到blob需独立合同和恢复测试。 |

## 非V1范围的共享卷消费者/生产者

Research Automation Runner使用同一`research-artifacts-v1`默认内容目录，提供V3.1 Runner INPUT/OUTPUT、fencing和引用记录；Runner输出路径会先验证租约，再发布字节并事务提交引用，失败回滚只移除无引用新字节。[生产入口](../../services/research-automation-service/src/bootstrap/main.ts#L404)。这是V3.1生产路径，不能并入V1能力或将其字节全视为V1保留对象。共享目录中的物理删除必须同时检查Research与Platform metadata以及活动任务；目前没有获批的统一回收器。

## 核对范围与限制

- 对`platform-api-service`、`quant-research-service`、`market-data-service`和`research-automation-service`源码搜索并核对上述具体持久化/发布调用点；V1.3与V1.5没有发现独立通用Artifact字节生产器，其订单/Fill/账本/授权/事件属于业务事实，不归类为可删Artifact。
- `evidence/local`导出包是用户显式选择的目录产物，由Export工具生成；导出Manifest绑定来源Run与字节Hash，但不是共享Artifact服务的权威副本。
- 本次没有连接活动服务、读取活动卷、扫描完整数据库引用、运行清理器或修改任何保留策略；没有修改OD-013状态。
- 复核后，OD-013决策包的V1分类与当前源码边界一致；仍需所有者明确研究产物保留/保护类别/物理清理政策，并需实现跨所有者引用权威与隔离竞争测试后，才能讨论活动部署。

## 源码SHA-256

| 文件 | SHA-256 |
|---|---|
| `services/platform-api-service/src/bootstrap/app.module.ts` | `dc45d87119989e7e36a67f5c6661b1bc6e91553dafeb4e6123f7fbc6b967e4e9` |
| `services/platform-api-service/src/adapters/postgres-qlib-fixture-artifact-repository.ts` | `2ee1134bcefbc81e02a89877f8aebcb4e4f5e3c820250181a3f3590a1c9581ef` |
| `services/platform-api-service/src/application/v12-acceptance.ts` | `bdfe6b16f782c0303b77cbf0d44e1fe7497ad7ef698edfe9500826cce8906619` |
| `services/platform-api-service/src/application/v14-backtest-run.ts` | `6a99bf45998d7d0b121bf9881ee5d6ffdb754d0d3a29ff72a094903c81b72403` |
| `services/platform-api-service/src/application/v14-report-artifact-ref.ts` | `4c1ce4a2725e5df0f48e84ea0ab614832eca88ad62b285f33335492728c9da7f` |
| `services/platform-api-service/src/adapters/postgres-stage-run-repository.ts` | `883a0ed78e082d05f34cc560eafedcbd2e2316699da8ed4d9ae881fd49b4d1cd` |
| `services/quant-research-service/src/adapters/postgres-v14-backtest-repository.ts` | `46ec90b4cb61a643555ee96443afa9378710b3177e0a0fa3bbd39da6a9776f7c` |
| `services/market-data-service/src/adapters/postgres-collection-run-repository.ts` | `74723e9df6a9d4c54902b80f4efda15b7efc583dfb1b428df815f278a9f25bbe` |
| `services/market-data-service/src/adapters/postgres-artifact-delivery-repository.ts` | `f039547934c3c421d3957764387a907b2a63335c2517dc10c39f4f6bf3328369` |
| `services/research-automation-service/src/bootstrap/main.ts` | `3b09a6b4cad736f3626703e5091f9c8c709679161deca0f6fb910348477f4077` |
