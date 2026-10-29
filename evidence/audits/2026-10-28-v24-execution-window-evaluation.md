# C5 Candidate A 执行窗口评估边界（2026-10-28）

接线前复核发现 `admitV24CandidateExecution` 只校验 acceptedAt 的本地时间，未校验实际 evaluatedAt 所在窗口及日期：目标在 09:31 接受后，窗口结束或隔日出现的新鲜快照可能错误得到 ELIGIBLE。现要求两个时刻在同一上海本地日期，且均在 09:31:00（含）至 09:35:00（不含）；否则 `PAUSED/EXECUTION_WINDOW_CLOSED`。此门禁本身既不授权也不下单，后续仍需独立 Mandate、风险、预留和账本检查。

`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v24-candidate-execution-gate.spec.ts tests/unit/v24-continuous-paper.test.ts`：2 文件 19 项通过；Platform typecheck、`git diff --check` 通过。注入时间验证 09:34:59 可在其他条件满足时通过、09:35:00 暂停、隔日同一时间的新快照暂停；原陈旧、未知及错误证券等边界继续通过。

此为单元验证，未变更既有版本化 Web 场景或其历史证据，尚未提供该新增边界的 Web/CLI 同 Run 证据。真实连续执行、真实来源与批准的活动 Mandate 仍未接通；C5 仍 PENDING，20 日观察和用户签收未完成。
