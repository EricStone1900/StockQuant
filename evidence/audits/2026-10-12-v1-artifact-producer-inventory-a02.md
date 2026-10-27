# V1 Artifact 生产者与引用者当前源码复核 A02

日期：2026-10-12（Asia/Shanghai）。范围：当前工作树中已知 V1 产物生产、引用、读取、发布 fencing 及清理入口。此为静态源码复核；没有连接活动服务、读取活动数据库/Artifact 卷或执行清理。

## 当前边界

| 产物 | 字节/元数据权威 | 可核验的生产与消费边界 | 对 V1 交付的影响 |
|---|---|---|---|
| V1.2 Qlib Fixture 模型/预测 | Platform 的 `qlib_fixture_artifacts` 行保存 owner、TestRun、状态、哈希及期限；新内容字节放入共享 `research-artifacts-v1` 内容目录，旧 JSONB 仍兼容读取。 | 仅在 owner/TestRun 匹配且状态可读时返回，读取重新计算 SHA；发布与取消竞争由 `PUBLISHING_ARTIFACT` fencing 保护。 | 固定生产/读取/取消发布路径有测试；尚无覆盖所有 producer 的统一引用权威，也未授权统一过期/物理回收。 |
| V1.4 回测报告与 Manifest | Quant PostgreSQL 持有 BacktestRun、结果和 Manifest；Platform TestRun 投影含 `BACKTEST_REPORT` 引用。 | Platform 仅投影已完成且断言通过的同 Run 报告；独立集成测试覆盖报告发布与取消竞争。 | 属于数据库与跨服务引用配对恢复问题，不能仅扫描共享文件目录证明其完整。 |
| V1.2 Market Data Fixture 数据集 | Market Data PostgreSQL 的 `market_data_collection_artifacts` 与 `market_data_artifact_rows`。 | 按项目/版本与采集 Run 读取；这是关系型数据集，不是共享文件存储中的通用 Artifact。 | 不受共享内容目录回收器覆盖；其数据库留存和恢复仍需按 Market Data 所有权处理。 |
| V1.1/V1.3/V1.5 TestRun 导出与交易事实 | Platform 持有 TestRun/evidence 投影；Portfolio、Trade、Governance、Temporal/NATS 等各自持有业务账本与事件。导出包是复制的证据产物。 | 导出引用不能替代各域权威事实；订单、Fill、现金、持仓、授权及工作流状态为受保护业务数据。 | 关闭 TestRun、导出或 Artifact 过期均不授权删除这些业务事实。 |
| V3.1 Research Automation | 与 Qlib 共用默认内容目录；Research PostgreSQL 持有自己的 ArtifactRef 和 Runner 状态。 | Runner 发布以租约/fencing 与引用事务为界；其引用并不由 Platform Qlib 元数据完整表示。 | V1 与 V3.1 共享物理目录，任何未来回收都必须先统一跨 owner 引用快照及并发发布边界。 |

## 清理代码的准确解释

内容存储包提供经常规文件、路径和 SHA 校验的 `remove` 原语；该 API 本身不是保留政策。Research Automation 的 `rollbackUnreferencedArtifact` 只用于失败发布回滚：读引用失败时保留字节，确认已有引用时保留，仅确认无引用才移除本次暂存内容。另有 V3.1 专用、显式 age gate 的孤儿核对/隔离工具，会把候选移动到隔离目录并要求刷新引用快照；它不是 V1 全局过期任务，也不执行销毁。当前未发现 OD-013 驱动的 V1 定时过期转换/物理删除调度器。

因此，本复核不把“没有定时删除器”写成“没有任何删除原语”，也不把 V3.1 隔离工具当成 V1 保留或清理政策。OD-013 仍 OPEN；其未决安全行为继续禁止默认 `expiresAt`、自动过期转换和物理清理。OD-014 的已结算现金决定与 Artifact 生命周期无关。

## 当前源码与测试锚点

- Qlib 存储/装配/生产/取消 fencing：`services/platform-api-service/src/adapters/postgres-qlib-fixture-artifact-repository.ts`、`services/platform-api-service/src/bootstrap/app.module.ts`、`services/platform-api-service/src/application/v12-acceptance.ts`、`services/platform-api-service/src/adapters/postgres-stage-run-repository.ts`；发布竞争测试为 `services/platform-api-service/tests/integration/v12-run-lifecycle.spec.ts`，字节存取测试为 `services/platform-api-service/tests/unit/qlib-artifact-content-store.spec.ts`。
- V1.4 报告引用：`services/platform-api-service/src/application/v14-backtest-run.ts`、`services/platform-api-service/src/application/v14-report-artifact-ref.ts`、`services/quant-research-service/src/adapters/postgres-v14-backtest-repository.ts`；发布竞争测试为 `services/platform-api-service/tests/integration/v14-report-publication-fencing.spec.ts`。
- Market Data 数据集：`services/market-data-service/src/adapters/postgres-collection-run-repository.ts`、`services/market-data-service/src/adapters/postgres-artifact-delivery-repository.ts`；发布测试为 `services/market-data-service/tests/unit/artifact-task-executor.spec.ts`。
- 跨版本共享内容目录与 V3.1 例外：`packages/artifact-content-store/index.mjs`、`services/research-automation-service/src/bootstrap/main.ts`、`services/research-automation-service/src/application/v31-artifact-publication-cleanup.ts`、`services/research-automation-service/src/application/v31-artifact-reconcile.ts`。

## 源码 SHA-256

下列哈希供本次静态复核重现；它们不是已部署二进制或活动卷的身份凭据。

| 文件 | SHA-256 |
|---|---|
| `services/platform-api-service/src/bootstrap/app.module.ts` | `36b1bd7db6a853b6258ded3853b6f10b0bc934f1e125a3551edab5a0f858aaec` |
| `services/platform-api-service/src/adapters/postgres-qlib-fixture-artifact-repository.ts` | `2ee1134bcefbc81e02a89877f8aebcb4e4f5e3c820250181a3f3590a1c9581ef` |
| `services/platform-api-service/src/application/v12-acceptance.ts` | `7dfb84c4d2c985be274b63a31cf7e2b1e1af576af26f2784c883c36daa0b9f74` |
| `services/platform-api-service/src/adapters/postgres-stage-run-repository.ts` | `b28d9c3a3ce1f4e7dcafb8c98964a75ab85a77c8b5059d0533d2ea31d693a437` |
| `services/platform-api-service/src/application/v14-backtest-run.ts` | `6a99bf45998d7d0b121bf9881ee5d6ffdb754d0d3a29ff72a094903c81b72403` |
| `services/platform-api-service/src/application/v14-report-artifact-ref.ts` | `4c1ce4a2725e5df0f48e84ea0ab614832eca88ad62b285f33335492728c9da7f` |
| `services/quant-research-service/src/adapters/postgres-v14-backtest-repository.ts` | `46ec90b4cb61a643555ee96443afa9378710b3177e0a0fa3bbd39da6a9776f7c` |
| `services/market-data-service/src/adapters/postgres-collection-run-repository.ts` | `74723e9df6a9d4c54902b80f4efda15b7efc583dfb1b428df815f278a9f25bbe` |
| `services/market-data-service/src/adapters/postgres-artifact-delivery-repository.ts` | `f039547934c3c421d3957764387a907b2a63335c2517dc10c39f4f6bf3328369` |
| `services/research-automation-service/src/bootstrap/main.ts` | `3b09a6b4cad736f3626703e5091f9c8c709679161deca0f6fb910348477f4077` |
| `services/platform-api-service/tests/integration/v12-run-lifecycle.spec.ts` | `8f20d6e0552f94e0c3fb0147f4fa6095d1682cbe5e7a822ad4d66a9355032731` |
| `services/platform-api-service/tests/integration/v14-report-publication-fencing.spec.ts` | `a081c55cdc7fcc148b5944c611fdcb8bf745221a88b5bf151eaf0ad18a97a088` |
| `services/platform-api-service/tests/unit/qlib-artifact-content-store.spec.ts` | `89ded945afffbf3cc493b29ddbba7428e3ce41ed24c443e5fe05de5c7c0e9243` |
| `services/market-data-service/tests/unit/artifact-task-executor.spec.ts` | `a027a1ec3e9057e1eb0115e35a240dd79a829bc28c015481eccc643488ffebce` |
| `packages/artifact-content-store/index.mjs` | `ec35eebb70121495b11878b40aebec88e0f5075cd89866f5102678dba581ba70` |

## 结论

本复核刷新了 A01 中四个已变化源码的哈希，确认现有测试覆盖若干原子发布/读取路径，并识别到共享文件目录、独立数据库 Artifact 与关系型数据集三种权威形态。跨 producer/owner 的权威引用枚举、统一保留决定、活动部署迁移/恢复及完整并发回收证明仍缺。`V1.1-S2-L20` 保持 `OPEN`，test mapping 为 `PARTIAL`；本记录不执行任何运行时变更或清理。
