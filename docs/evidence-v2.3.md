# V2.3 自动化证据

状态：实现完成，待人工验收。

- Fixture：`fixtures/v2/v2.3/replay_bars.csv`，版本 `v2.3-replay-bars-1`，合成数据，仅用于确定性回放。
- 模式：`BACKTEST / MINUTE_BAR / FAKE`；seed `20260907`。
- API：`GET /api/v1/acceptance/v2/v2.3/preview`；场景 `normal`、`rejection`、`recovery`。
- 断言：`V2.3-REPLAY-ORDER-001`、`V2.3-EVENT-ORDER-002`、`V2.3-REPORT-003`、`V2.3-REJECTION-001`、`V2.3-RECOVERY-001`。
- 自动检查：`COREPACK_HOME="$PWD/.corepack" pnpm build`（0）；`COREPACK_HOME="$PWD/.corepack" pnpm test`（0）；平台 V2.3 单元测试 3/3（0）；Compose API normal `216251af-0c58-4d2f-90d5-96b51b9e28ec`、rejection `1e984bd5-418e-4bc5-93b9-25e3c1d8ec00`、recovery `d23466ba-c78d-425e-8ad9-d2f03dd874f2`（均 COMPLETED）；Web V2.3 E2E（0，1 passed）。人工验收前不代签。

已知限制：当前为小样本、进程内检查点和确定性 FakeBroker；尚未覆盖全量历史文件、逐笔队列、生产持久化检查点及真实券商。
