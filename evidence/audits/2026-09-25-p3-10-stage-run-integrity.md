# P3.10 TestRun 写入完整性

日期：2026-09-25（Asia/Shanghai）。基线 commit：`c40c49c828a3ed16de50852a03898ea351cacab2`。状态：DONE（隔离库工程验证）；未改变任何阶段或版本的人工验收状态。

## 问题与改动

`PostgresStageRunRepository.save` 原先按 `test_run_id` 冲突更新状态、断言和证据，却没有比较阶段、场景、版本、owner、namespace、seed，也允许覆盖已经 `COMPLETED`、`FAILED` 或 `CANCELLED` 的结果。这会使同一运行 ID 的证据失去稳定含义。

现用一条 PostgreSQL `INSERT ... ON CONFLICT ... WHERE` 原子比较运行身份；身份变化或终态内容变化返回 409。完全相同的终态重试可读取原结果，并保留 `created_at`/`completed_at`。重复 namespace 的数据库唯一约束也映射为 409。非终态仍可更新运行进度。

## 验证

| 命令 | 结果 |
|---|---|
| `pnpm --filter @stockquant/platform-api-service typecheck` | 退出 0 |
| `pnpm --filter @stockquant/platform-api-service test` | 退出 0；35/35 单测通过 |
| `pnpm test:integration:platform` | 退出 0；连接独立 `platform_api_test`，V1.2～V1.5 运行重连后仍可读取，跨 owner 查询为空；11 类冲突返回 409，相同终态重试时间戳不变；测试行按 ID 清理 |
| `PLATFORM_API_TEST_DATABASE_URL=postgresql://platform_api@127.0.0.1:5433/platform_api node scripts/test-persistence.mjs`（服务目录） | 预期退出 2；正式库连接在访问前被拒绝 |

第一次未授权本机端口的隔离库测试因 `connect EPERM 127.0.0.1:5433` 退出 1；在允许连接本机隔离测试库的执行环境中重跑后通过。这个失败是工具网络权限限制，不是业务断言失败。

## 范围与后续

保护覆盖 `PostgresStageRunRepository.save` 的调用者。V2.4 观察流程在 `postgres-v24-observation-repository.ts` 中直接写 `acceptance_stage_runs`，其日终修订/失效逻辑有专属语义；本次没有改动正在运行的观察链，也不声称全表不可修订。后续需要为观察修订保留原证据并追加新版本，再统一写入边界与测试。历史运行迁移、完整 OpenAPI/客户端覆盖、Web/人工验收仍按 P3 计划推进。
