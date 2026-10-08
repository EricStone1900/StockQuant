# V1.5 Web/CLI E2E 当前执行记录

日期：2026-10-07（Asia/Shanghai）

## 结论

本轮 V1.5 Web/CLI/结构化证据 E2E 未通过，不能更新为 PASS。前两轮隔离构建启动成功，浏览器走到 same-run CLI 与证据导出边界时分别发现固定旧证据目录冲突、临时工作目录脚本路径错误；均已按原验收要求修复。第三轮构建在 Docker build 阶段的 `pnpm install --frozen-lockfile` 停在 309 个依赖中的最后一个包，持续约四分钟无进展后中断，未到达浏览器断言。

## 修复和验证

- `scripts/e2e-stage-command.mjs` 将 V1.5 命令路由到独立 Compose harness；对应单测 7/7 通过。
- V1.5 Web 文案保持业务 `WAITING/NOT_RUN`，移除把准备运行描述成已完成业务验收的假象。
- 浏览器场景预期为 normal/rejection/recovery 三个 TestRun 均 WAITING；同 Run CLI `--check-only` 应退出 2；导出包不得覆盖历史证据。
- E2E 导出现在写入每次运行单独的系统临时目录，避免污染仓库或覆盖已有证据；导出脚本使用仓库绝对路径。
- Web TypeScript typecheck 通过；容器化 V1.5 code suite exit 0，Quant Worker Python 边界测试在固定摘要、网络隔离容器中 14/14 通过；Markdown 链接检查 4965 项通过。
- `node scripts/verify-version.mjs --version V1` 仍退出 2/INCOMPLETE；原始历史 TestRun 导出缺失和人工/阶段门禁未完成继续阻断。

## 边界

此 E2E 只检查当前尚未接线的等待状态是否在 Web、CLI 和证据中被如实表示，不证明 V1.5 业务工作流。三次 Harness 均使用随机 Compose 项目名与随机凭据、LIVE=false、FakeBroker；两次完整退出已确认项目容器、卷和网络清理成功。第三次中断后按精确 Compose 项目标签复核，容器、卷、网络均为零；并删除了由本次 Harness 创建的唯一临时证据目录。

隔离运行产生的既有证据目录保留原样；本记录不删除或覆盖失败记录。业务工作流、60 个 CN/US 虚拟交易日、权威账本核验、故障/备份恢复、目标架构和人工验收仍未完成。
