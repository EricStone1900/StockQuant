# W8/W9 V3.4 本地预检

时间：2026-09-30 08:37Z（Asia/Shanghai）。本轮执行：

| 命令 | 结果 | 范围 |
|---|---|---|
| `pnpm verify:stage -- --stage V3.4 --suite code` | PASS，退出码 0 | baseline（文档、合同、Fixture）、全仓 build/lint/typecheck/unit、V3.4 preflight 单测；无业务 API、数据库、容器部署或行情源调用 |
| `pnpm verify:stage -- --stage V3.4 --scenario normal` | WAITING，退出码 2 | 只读版本/Ubuntu/流程前置检查；`testRunId=null`、`sideEffects=NONE` |

code suite 验证：167 JSON、108 schema、36 Fixture输入有效；合同生成客户端/兼容矩阵/OpenAPI 检查通过，Fixture Hash 19/19；全仓 build、lint、typecheck 通过。`pnpm test`包含各服务本地单元测试共449项（其中量化Worker 12项）且全部通过；另4项 V3.4 readiness 单测通过，总计453项测试无失败。首次普通沙箱执行在 Qlib Worker 绑定随机 loopback 端口时被拒；同一命令随后经受限权限重跑通过。该权限只用于本机隔离 worker 测试。

readiness 阻塞项：V1/V2/V3 `verify:version` 均为 INCOMPLETE/exit 2；未记录真实 Ubuntu 主机/发行版/x86_64资源与网络；V3.4业务TestRun、迁移/恢复编排及正式Web路由未实现；Ubuntu Paper观察及人工验收未运行。故此代码 PASS 仅属本地预检，不是 V3.4/Ubuntu 发布 PASS；未更改活动服务、数据库、卷或用户数据。

本次预检源码快照：[V3.4本地预检Manifest](./2026-09-30-v34-code-preflight-content-manifest.sha256)，覆盖4450个Git已跟踪及未忽略未跟踪文件，SHA-256为`061192d585226415fa0322769c22f60bdcbe0a386e92345f54f991ac8f89637c`；排除本清单与本审计文件。
