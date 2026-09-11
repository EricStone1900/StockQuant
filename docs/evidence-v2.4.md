# V2.4 持续 Paper 技术复核证据

验证日期：2026-09-11（Asia/Shanghai）。范围为容器化平台 API、Web 验收页和确定性持续 Paper 场景；所有订单均为 `PAPER + FAKE`，未连接真实券商或 LIVE 账户。

- normal：`testRunId=a947f7d0-8b55-43ac-a522-e8007fa38ff1`，`COMPLETED`，退出码 0；使用新鲜 `SNAPSHOT`，无信号时 `HOLD`，日终对账 `PASS`。
- rejection：`testRunId=6d432a9e-4a64-4059-b902-e824be0e92f3`，`COMPLETED`，退出码 0；`STALE_SNAPSHOT` 和 `DUPLICATE_SCHEDULE` 均被拒绝，place 次数为 0。
- recovery：`testRunId=97383867-73a3-41da-897d-a59efa84b5dc`，`COMPLETED`，退出码 0；故障序列为 `SOURCE_DISCONNECTED → WINDOW_MISSED → ACCOUNT_RECONCILED → SOURCE_RECOVERED → RE_EVALUATED`，错过窗口未补旧单。
- 代码套件：`pnpm verify:stage -- --stage V2.4 --suite code`，退出码 0。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.4`，1/1 通过，退出码 0。
- 同 Run 只读核对：normal 使用 `--check-only`，退出码 0；未创建新订单、成交或模型调用。
- 证据导出：目录 `evidence/local/V2.4/a947f7d0-8b55-43ac-a522-e8007fa38ff1`，Manifest SHA-256 `6a3e1db59f2d6e9b34e9f0e331295bb3ad4a9e5b27669895277d0bcae05d09c1`。
- 20 个实际交易日观察：`NOT_RUN`；当前仅完成确定性运行和单日故障/恢复演练，未用加速 Fixture 冒充观察期。
- 持久化复核：normal `testRunId=260a9677-5f0f-4ed0-94f2-00174f4e9f99` 在重启 `platform-api-service` 后仍返回 `V2.4/COMPLETED`，证明 TestRun 已写入共享验收数据库；运行证据包含 `PAPER`、`LIVE_SOURCE_SMOKE` 和 `FAKE` 标记。
- SystemClock 调度器：容器接口依次返回 `STOPPED → RUNNING → Tick → STOPPED`；启动时 `tickCount=1`，手动 Tick 后为 `2`，采样间隔 30 分钟、执行窗口 `09:31-09:35`，`mode=PAPER`、`brokerMode=FAKE`。

已知限制：持续调度目前是验收用确定性切片，真实交易日观察、长期来源许可/稳定性和全量容量仍待完成；`LIVE` 激活始终关闭。
