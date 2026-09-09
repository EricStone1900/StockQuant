# V2.2 历史分钟数据导入与校验证据

验证日期：2026-09-09

- Fixture：`fixtures/v2/v2.2/minute_bars.csv`，6 行、2 只证券，SHA-256 `a1f0428bf02f834e84d3b398d32d45d4fa5b9f471cb98eb74cdc31b677a6fcb5`。
- 正常导入：`PUBLISHED`，接受 6 行，时间语义为 `barStart` 开端、`barEnd` 结束，Asia/Shanghai 偏移明确。
- 坏数据：`OHLC_INVALID`、`NON_TRADING_SESSION`、`DUPLICATE_CONFLICT` 均能定位到行，状态 `REJECTED`，不发布数据。
- 同输入幂等：重复 SHA 返回相同版本与 `idempotent: true`。
- 统一场景复验：normal `8bcf130e-ed3e-4552-9dd1-74dbbb85b9a0`；rejection `a8571fdf-1993-43e6-8eb5-99f9a56a2cef`；recovery `30f6f2ef-a6c8-4fe2-bead-d49f6934e0bb`，均 `COMPLETED` 且断言 PASS。
- Docker market-data/platform-api/web build：PASS；Web E2E：6 passed（V2.2 页面已加入验收入口）。
- 人工验收复验（2026-09-09）：normal `2d236506-042b-4e6c-a386-dfbb6553622f`、rejection `55417112-6ee9-4eeb-b252-1e0306048a0e`、recovery `d8c9540e-0ed2-4978-93f9-daaef6dc1e6f`，三项断言 PASS；全仓构建/单测 PASS；Web E2E 7 passed。

未覆盖：Parquet 实际上传、持久化分区数据库、跨进程断点续传、真实用户文件导入和分钟聚合与日线差异报告；这些属于后续增强范围，当前 Fixture 仅证明小样本导入和质量逻辑。
