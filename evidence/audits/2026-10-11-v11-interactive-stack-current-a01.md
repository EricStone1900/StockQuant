# V1.1 当前工作树交互栈复验

日期：2026-10-11（Asia/Shanghai）

执行`pnpm stack:up -- --stage V1.1`，在linux/arm64 Docker Desktop隔离栈启动Web、Platform API、Portfolio与PostgreSQL。Dockerfile `docker/dockerfile:1.7` frontend元数据解析及镜像构建通过。Harness输出`READY`，随机项目为`sq-v11-stack-57c17c2dfc2780620ed7`，Web URL为`http://127.0.0.1:55450/acceptance/v1/v1.1`，API URL为`http://127.0.0.1:55449`；模式为`PAPER/FAKE`，LIVE写入关闭。

对实际动态URL做只读运行时核验：Web返回HTTP 200、`text/html`；`GET /api/v1/session`返回HTTP 200，绑定`acceptance-owner-1`/`LOCAL_DEVELOPMENT`，响应设置`HttpOnly sq_session`。验证脚本只输出cookie存在性与HttpOnly属性，不读取、保存或输出会话值。

随后精确执行`pnpm stack:down -- --project sq-v11-stack-57c17c2dfc2780620ed7`，退出0，状态`STOPPED_AND_PURGED`，容器、专属PostgreSQL卷、网络、项目镜像和凭据文件均已移除；未触碰活动Compose项目。

证据：

- 启动：[原始日志](2026-10-11-v11-interactive-stack-up-current-a01.log)、[退出码](2026-10-11-v11-interactive-stack-up-current-a01.exit.txt)、[SHA-256](2026-10-11-v11-interactive-stack-up-current-a01.log.sha256)
- 清理：[原始日志](2026-10-11-v11-interactive-stack-down-current-a01.log)、[退出码](2026-10-11-v11-interactive-stack-down-current-a01.exit.txt)、[SHA-256](2026-10-11-v11-interactive-stack-down-current-a01.log.sha256)
- 当前树Web/API/CLI：[完整E2E日志](2026-10-11-v11-current-tree-web-e2e-a01.log)、[退出码](2026-10-11-v11-current-tree-web-e2e-a01.exit.txt)、[SHA-256](2026-10-11-v11-current-tree-web-e2e-a01.log.sha256)

这关闭的是当前Mac ARM64隔离交互启动、动态URL/session观察和随机资源清理复验。Ubuntu主机操作手册、活动存储切换/回退、旧非终态Run处置、当前新增范围人工验收仍开放；三条E2E Run的人工结论仍为`NOT_RUN`。
