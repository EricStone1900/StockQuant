# V1.5 真实 Temporal 验证证据

验证日期：2026-09-09

## 结果

- Temporal Server：`1.31.2`，真实 `temporalio/temporal:latest` 容器运行
- Temporal CLI：`1.8.3`
- 集群健康：PASS，`temporal operator cluster health` 返回 `SERVING`
- Namespace：PASS，`default` 与 `temporal-system` 均为 `Registered`
- Workflow 列表查询：PASS，default Namespace 可查询
- Server 重启：PASS，重启后 `default` Namespace 仍为 `Registered`（SQLite persistence）
- 真实业务 Workflow/Activity：NOT_RUN（仓库尚未配置 Temporal SDK Worker）
- Worker 重启恢复/Activity 重试：NOT_RUN
- 与 V1.5 业务服务接入：NOT_RUN

临时容器 `stockquant-v15-temporal` 已删除；未删除项目数据库、业务容器或数据卷。
