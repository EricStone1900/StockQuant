# V2.3 自动化证据

状态：SUPERSEDED_BY_V2.3-2。该文件保留 2026-09-09 历史证据；当时的进程内预置结果不再作为完整历史回放、恢复或跨域执行的证明。

- Fixture：`fixtures/v2/v2.3/replay_bars.csv`，版本 `v2.3-replay-bars-1`，合成数据，仅用于确定性回放。
- 模式：`BACKTEST / MINUTE_BAR / FAKE`；seed `20260907`。
- API：`GET /api/v1/acceptance/v2/v2.3/preview`；场景 `normal`、`rejection`、`recovery`。
- 断言：`V2.3-REPLAY-ORDER-001`、`V2.3-EVENT-ORDER-002`、`V2.3-REPORT-003`、`V2.3-REJECTION-001`、`V2.3-RECOVERY-001`。
- 复验日期：2026-09-09（Asia/Shanghai）。健康检查 `/live`、`/ready` 和回放预览均通过。
- 本次 Compose API 复验：normal `5386f25e-378b-4537-9f5b-34276d659102`、rejection `0f0fca6f-3a62-4c0f-86c0-02d86e834d31`、recovery `a461ad2a-adc9-4762-95ff-8ab641a40525`；三者均 `COMPLETED` 且全部断言 `PASS`。
- 自动检查：`COREPACK_HOME="$PWD/.corepack" pnpm build`（0）；`COREPACK_HOME="$PWD/.corepack" pnpm test`（0，5 个服务测试文件、14 个平台测试通过）；Web 完整 E2E（0，8/8 通过）。
- 用户人工验收：用户于 2026-09-09 明确确认“V2.3 人工验收通过”；本次复验结果一致，结论 PASS。

已知限制：当前为小样本、确定性 FakeBroker；尚未覆盖全量历史文件、逐笔队列、执行/组合领域服务、生产 Worker 和跨域账本检查点。

2026-10-03 W4共享Artifact Store代码身份补强：V2.3 Qlib TestRun的精确代码指纹现在覆盖共享Artifact Store实现及回归测试；独立复算163项输入与持久TestRun中的`codeVersion`完全一致。完整V2.3 code suite退出0，TestRun `0e71363c-4b35-4098-a5ea-432982a3df92`，共享Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`，owner读200/异主403，同Run CLI只读与证据导出通过；Qlib/LightGBM真实引擎仍只在合成FIXTURE上，独立验证NOT_RUN。详情见[W4代码身份审计](../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.md)、[机器结果](../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.json)、[日志](../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.log)、[163输入清单](../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.sources.sha256)及[SHA-256](../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.sha256)。
