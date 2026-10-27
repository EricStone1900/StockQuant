# V2.1 C2 DAILY_BAR 收盘后自动调度审计

日期：2026-10-20（Asia/Shanghai）  
结论：固定 Fixture 范围的收盘后自动调度工程子项 PASS；真实每日来源验证 NOT_RUN；C2-B、C2-C、C2 与 V2.1 保持 IN_PROGRESS。

## 实现

- Market Data schema v18 在 v17 Monitor Outbox 之后新增按完整 market/owner/account/namespace/TestRun 作用域登记的日线调度，并持久化最后触发交易日；未知日历、休市及收盘前不会触发。
- Asia/Shanghai 15:00 后由独立后台 scheduler 每 30 秒检查；策略默认关闭，Web 显式为当前 TestRun 注册/取消。登记要求当前在线池与冻结 Fixture 的两只证券完全一致，运行时也再次过滤不匹配的 scope。
- scheduler 先通过耐重试的 scoped Fixture 队列提交，再记最后触发日期。队列幂等及触发日期共同保证重复轮询/进程重启不重复排程；DAILY_BAR Worker 继续负责校验 Fixture、租约恢复和结果提交。策略/订单消费者仍关闭且未实现。
- 当前 Fixture 仅为 `2026-10-16`。该日期之外 scheduler 返回 `NO_FIXTURE_FOR_SESSION`，不会伪造每日数据或调用真实来源。自动化实现不证明真实日线源许可、可用性或每日持续运行。

## 验证

| 检查 | 结果 |
|---|---|
| Market Data 单测 | PASS，26 文件 / 126 项；包含收盘前、休市、禁用、无匹配 Fixture 日期、成功入队及重复 tick |
| Market Data / Platform API / Web `typecheck` | PASS |
| 隔离 PostgreSQL `sampling:http-restart-smoke` | PASS；schema v15–v18顺序迁移；持久化 scope 启停；注入 2026-10-16 收盘后时钟后排入1个任务，重复 tick 返回 `ALREADY_SCHEDULED`，Worker 将其完成为 `COMPLETED_FIXTURE`；重启恢复及独立scope验证仍通过。真实行情请求0，临时容器/网络已清理 |
| V2.1 C2 Playwright `v21-c2-observation.spec.ts` | PASS，1/1；覆盖 Web 显式启停、版本递增和固定 Fixture 标注 |
| `pnpm contracts:check` | PASS；355 JSON（232 schemas、73 fixtures），生成器漂移/兼容检查通过 |
| `pnpm docs:check` / `git diff --check` | PASS；Markdown 本地链接 14,026 个，失败0；V1编号结构无重复；diff check clean |

本项只补固定 Fixture 的调度工程切片。完整真实 Compose Web→Platform→Market Data→PostgreSQL 同Run验收、真实DAILY_BAR来源/持续交易日运行、同Run CLI核对、完整操作手册与当前范围人工验收仍未完成。没有修改用户人工签署。

## 代码快照

仓库基线：`45bce40bf1ae44785f70a6ffeedcaaed1acba61a`；共享工作树另有既存的未提交文件。

- `services/market-data-service/src/application/cn-a-share-calendar.ts`: `fca203b0d33b09a672c6306de8dd435b7cba779aa85ca9889950bdf5284c7b82`
- `services/market-data-service/src/application/daily-bar-close-scheduler.ts`: `bd08da11497201bc30eca816396232181a1b52d5350d5df05e73fe1d9199b31b`
- `services/market-data-service/src/adapters/postgres-daily-bar-completion-repository.ts`: `1bd66bcfe0653ce514dd03ef452a910cce9723492fe064379081d4c750358f65`
- `services/market-data-service/src/adapters/postgres-sampling-policy-repository.ts`: `a2163ae7c2b6808501f8fa086613aa34637a7dfccc62ac35d310461cf5d9ea30`
- `services/market-data-service/src/adapters/postgres-schema-migrations.ts`: `aeec5c0ecf244c1cc5ab4b2206d4e48226c2848e7aaddfcf257835c2e198e702`
- `services/market-data-service/src/bootstrap/main.ts`: `e52ad87f29165691e327a4b817c79a1f270cb96c075dee646a91217b4bb1f39e`
- `services/platform-api-service/src/bootstrap/app.module.ts`: `709384bf624f3a708bd890c39934bcc8e8bc6be0bea455ab7025b5ff31d7f5f5`
- `apps/web/src/main.tsx`: `17e759dcd085e4a95e72bd81637e64cfe21df2d96ac59b2361fc328db5585ab4`
- `packages/contracts/openapi/market-data-calendar.v1.json`: `92e3f92740a4c5d3edd14edf426e99ac277efb0e9b97a4c329174ac2c763297e`
- `scripts/generate-v21-market-data-client.mjs`: `c7b35aa3cc44377d0fbc6f8e188f2ea40167ef5f31d16b754acf1f884955e0f1`
- `services/market-data-service/scripts/sampling-http-restart-smoke.mjs`: `911d5a251e40899a551677845a29a67d821eb494317330f8714a4807d8902a1d`
- `services/market-data-service/tests/unit/daily-bar-close-scheduler.spec.ts`: `5e1920abd0f5e6a0643344a2cf6b8725fc4e07d81999903e91feed1a58690f68`
- `apps/web/tests/e2e/v21-c2-observation.spec.ts`: `c5ebebadc9fc356244470c917b183dcbf13887732f59398a4dd4491d469246f4`

## 后续

C2-B 收盘后 DAILY_BAR Fixture 调度切片完成。队列下一步为策略/订单消费者边界与 C2-E 同Run验收；策略、订单执行仍受 OD-007/C5 门禁约束。真实来源能力与许可仍由 OD-008 阻塞；C2 不得据此标完成。
