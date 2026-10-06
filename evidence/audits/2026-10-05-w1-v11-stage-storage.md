# W1 / V1.1 stage-storage 隔离复验

- 日期：2026-10-05（Asia/Shanghai）
- 结果：PASS（仅指下列自动化代码与隔离集成验证）
- 完整 V1.1 代码套件：`pnpm verify:stage -- --stage V1.1 --suite code`，退出码 0。
- 隔离存储/Web 集成套件：`pnpm test:integration:v11-stage-storage`，退出码 0。
- Compose 项目：`sq-v11-stage-a401a1a8346c95b61bf7`。
- Stage-mode 临时 PostgreSQL、Platform API、Portfolio 服务和 Web 均在隔离 Compose 项目中运行。Playwright normal、rejection、recovery 共 3/3 通过；三个 Web TestRun ID 分别为 `7fe40eae-26c8-4856-b5f0-4470e67323e7`、`c6717f2b-898b-4190-96de-391052179c68`、`7c4a07e9-cd8a-4ee4-ad63-8d6dd709faaf`，每个均通过相同 ID 的 CLI `--check-only`只读核验。
- Recovery 仅重启脚本核验过的隔离 Portfolio 容器；脚本最终报告 `recoveryRestartTargetVerified=true`、`exactContainersAndVolumesRemoved=true`、`exactImagesRemoved=true`，且临时容器、卷、网络和镜像均已清理。
- 本次没有连接或修改活动服务，没有市场数据/provider请求，没有更改用户签署或观察计数。
- 边界：这不是活动 API 切换/回退演练、真实用户会话验收或 V1.1 人工验收。V1.1 与 V1 仍未整体通过。
- 构建依赖下载耗时约五分钟；只有速度警告，未影响最终结果。
