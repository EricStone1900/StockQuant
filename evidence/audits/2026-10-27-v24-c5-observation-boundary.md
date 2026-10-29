# C5 候选持续链边界修正

日期：2026-10-27。范围：本地代码与单元测试；无真实来源请求、活动 Mandate、Paper 调度或订单。

现有实时处理器为 HOLD-only 观察，未接通 Candidate A 的日线、目标、权威授权、订单和日终链。此前把已存在的调度框架描述为后台链完成是不准确的。现仅修正两个阻止错误推进的边界：未接通候选链的 HOLD 日即使满足采样和对账质量也不计入新观察，事件记录原因；账户快照缺少可卖数量时按零处理，不由持仓推断可卖。

在 `services/platform-api-service` 执行 `pnpm exec vitest run tests/unit/v24-fixture-daily-target-worker.spec.ts tests/unit/v24-continuous-paper.test.ts tests/unit/v24-live-observation.spec.ts`：退出 0，3 文件 30 测试通过。仓库根目录执行 `pnpm --filter @stockquant/platform-api-service typecheck`、`pnpm docs:check` 和 `git diff --check`，均退出 0。未运行新 Web/CLI、跨服务 PostgreSQL 或真实时钟连续运行验收。

源码 SHA-256：`v24-live-observation.ts` 为 `a32d6dbb14fcbbc37a4f7f09c2cbdbcf42628893bdb5179b9a3c82619ba5b06a`；`v24-fixture-daily-target-worker.ts` 为 `80e060cef57a4b9856fc9c9145954605a3e2d03cda8e7fa4233471caa5fa8496`。测试为本机未提交工作树上的单元证据，不构成阶段验收。历史观察及旧签署保留，C5 继续 PENDING。
