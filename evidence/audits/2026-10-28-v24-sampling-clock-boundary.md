# V2.4 采样时钟边界修正（2026-10-28）

连续调度器此前对所有事件都更新 `lastSampleAt`，包括启动恢复检查、执行窗口和日终；这些事件可能掩盖缺失采样窗口，也会影响读取该字段的 V3.3 连续性预检。现仅在 `SAMPLING_SLOT` 的处理成功返回后更新，其他事件保留上一次采样槽时间；`tickCount` 仍计全部已处理事件。处理抛错时不更新采样时间。该字段代表采样槽处理时刻，来源是否可用及样本质量仍由独立证据判断，不单凭时间认定行情成功。

`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v24-continuous-paper.test.ts tests/unit/v24-live-observation.spec.ts tests/unit/v33-paper-continuity.spec.ts`：3 文件、34 项通过；Platform typecheck 与 `git diff --check` 通过。注入时钟验证 09:30 采样、09:30:30 恢复、09:31 执行后仍保留 09:30，10:00 采样读取原时刻；15:10 日终不写采样时间。

这是确定性单元验证，不是实际交易日观察或完整连续链验收。修正前已持久化的历史 `lastSampleAt` 缺少事件类型，不能据此追溯判定为有效采样；本次不篡改历史记录。Candidate A 连续治理/执行/日终链、正式来源授权范围、20 个合格交易日和当前用户签收仍未完成，C5 为 PENDING。
