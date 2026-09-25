# P3.8 V2.1/V2.2 Web 同 run 验收

日期：2026-09-25（Asia/Shanghai）。

## 改动

- V2.1 Web 将当前 `testRunId` 保存为 `stockquant:v21:testRunId`，刷新后按原 stage API 读取运行、断言和证据。
- V2.2 Web 将当前 `testRunId` 保存为 `stockquant:v22:testRunId`，刷新后按原 stage API 读取运行、断言和证据。
- 两个页面增加可核验的 TestRun ID 和状态展示；读取失败会清理失效 ID并显示错误，不会伪造完成状态。

## 验证

- Web typecheck、全仓 build 通过；Web 镜像已重建并部署。
- 浏览器 V2.1 normal：`testRunId=1dfc2593-f66b-45b8-91c8-74cb538be2c8`，点击运行后为 `COMPLETED`；刷新后 ID 相同，状态仍为 `COMPLETED`。
- 浏览器 V2.2 recovery：`testRunId=7e13e857-f263-4069-b8e4-aff5bacdd3f9`，点击运行后为 `COMPLETED`；刷新后 ID 相同，状态仍为 `COMPLETED`，幂等断言保持 PASS。
- `pnpm verify:stage -- --stage V2.1 --run 1dfc2593-f66b-45b8-91c8-74cb538be2c8 --check-only`：退出 0。
- `pnpm verify:stage -- --stage V2.2 --run 7e13e857-f263-4069-b8e4-aff5bacdd3f9 --check-only`：退出 0。
- Web 验收期间 `pnpm v24:preflight` 全部 PASS，连续 Paper 调度仍为 `RUNNING / PAPER / FAKE`。

## 状态与边界

P3.8 的 Web 持久 TestRun 和 CLI 同 run 复核完成。用户人工验收仍未签署；V2.1/V2.2 的真实来源许可、长期观察和版本门禁继续按原计划独立管理。
