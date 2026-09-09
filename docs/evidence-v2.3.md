# V2.3 自动化证据

状态：实现完成，待人工验收。

- Fixture：`fixtures/v2/v2.3/replay_bars.csv`，版本 `v2.3-replay-bars-1`，合成数据，仅用于确定性回放。
- 模式：`BACKTEST / MINUTE_BAR / FAKE`；seed `20260907`。
- API：`GET /api/v1/acceptance/v2/v2.3/preview`；场景 `normal`、`rejection`、`recovery`。
- 断言：`V2.3-REPLAY-ORDER-001`、`V2.3-EVENT-ORDER-002`、`V2.3-REPORT-003`、`V2.3-REJECTION-001`、`V2.3-RECOVERY-001`。
- 复验日期：2026-09-09（Asia/Shanghai）。健康检查 `/live`、`/ready` 和回放预览均通过。
- 本次 Compose API 复验：normal `5386f25e-378b-4537-9f5b-34276d659102`、rejection `0f0fca6f-3a62-4c0f-86c0-02d86e834d31`、recovery `a461ad2a-adc9-4762-95ff-8ab641a40525`；三者均 `COMPLETED` 且全部断言 `PASS`。
- 自动检查：`COREPACK_HOME="$PWD/.corepack" pnpm build`（0）；`COREPACK_HOME="$PWD/.corepack" pnpm test`（0，5 个服务测试文件、14 个平台测试通过）；Web 完整 E2E（0，8/8 通过）。
- 用户人工验收：用户于 2026-09-09 明确确认“V2.3 人工验收通过”；本次复验结果一致，结论 PASS。

已知限制：当前为小样本、进程内检查点和确定性 FakeBroker；尚未覆盖全量历史文件、逐笔队列、生产持久化检查点及真实券商。
