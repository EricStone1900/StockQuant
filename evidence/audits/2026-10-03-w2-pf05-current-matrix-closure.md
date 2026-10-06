# W2 P-F05 当前工作树矩阵收口复核

日期：2026-10-03（Asia/Shanghai）。本审计仅更新 FakeBroker 自有模拟范围的工程证据，不覆盖2026-09-30旧矩阵和2026-10-02各增量审计。

## 当前结论

P-F05此前剩余的“独立外部模拟订单通过正式Web TestRun呈现差异”现有当前代码回归证据。`pnpm verify:stage -- --stage V2.4 --suite code`在2026-10-03当前工作树退出0，完整scope包含四个API场景（normal/rejection/recovery/external-reconciliation）、四个Web TestRun、CLI读取相同Run和隔离的PostgreSQL/HTTP/执行服务回归。外部差异Run为API `55dfc305-c31a-4b7b-8d31-1be02c5a021d`、Web `46d08bd9-4426-4928-b26a-ea2b8c3ec209`；Web案例在结果面板断言 `EXTERNAL_ORDER_MISSING_LOCALLY` 与 `fixture-external`，同一Web TestRun的CLI `--check-only`返回0。

同次回归的双服务FakeBroker/Portfolio PG烟测验证外部订单首次写入201、同观察重放200、变更同身份事实409、Historical Replay写身份403、owner namespace对账出现一条`EXTERNAL_ORDER_MISSING_LOCALLY`差异。该Run不是生产或券商数据。

至此，W2故障矩阵在仓库自有Paper/FakeBroker范围内的当前工程及自动验证子项可标记完成；P-F05这项历史`PARTIAL`记录保留为当时真实状态，不改写历史。本结论不把真实Broker接入列为任务（本项目明确禁用），也不等价于V2.4业务阶段/版本通过。

## 验证与边界

- 完整V2.4 code suite：PASS；Research Automation 203/203单测、Platform 169/169单测；4个API Run全部COMPLETED且各自同Run CLI退出0；4个Web Run退出0。
- Web/Paper用Fixture + FakeBroker；containerized readiness Linux/arm64、internal-only、LIVE和下单开关关闭、orders/fills/events/outbox为0。
- `activeServicesTouched=false`；原有13个活动容器未触碰；临时V2.4容器清理数为0残留；真实Broker与行情Provider调用均0。
- 源码清单 `2026-10-03-w2-v24-current-worktree-rerun.sources.sha256` 共10条，重算全部匹配。

详细权威结果见[机器报告](./2026-10-03-w2-v24-current-worktree-rerun.json)、[完整日志](./2026-10-03-w2-v24-current-worktree-rerun.log)、[Web/API逐Run证据](./2026-10-02-v24-paper-smoke-cb44b288483b470f81f49b2a30c8c649.json)及[源码Manifest](./2026-10-03-w2-v24-current-worktree-rerun.sources.sha256)。

V2.4仍因无来源授权/NO_TRADE、8/20历史归档且不再采集、无连续Paper O2、人工验收未签署和Ubuntu未完成而保持未通过。不得将隔离FakeBroker证据升级为真实Paper、真实券商或长期观察结论。
