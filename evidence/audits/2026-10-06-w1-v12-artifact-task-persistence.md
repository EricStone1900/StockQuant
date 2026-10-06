# W1/V1.2 Artifact task 持久状态审计

时间：2026-10-06 18:03 Asia/Shanghai。此审计记录当前工作树的一项工程切片，不代表 V1.2 阶段通过。

Market Data Artifact task 记录从进程内 Map 改为 PostgreSQL `market_data_artifact_tasks` 表。Bearer 保护的创建、查询和取消路由在无数据库时均 fail closed；取消用 `WHERE status='RUNNING'` 条件更新，重复取消会回读相同的 `CANCELLED` 记录。OpenAPI/schema和合同检查器覆盖三个操作。

验证结果：Market Data typecheck、build、合同检查通过；单元测试 18 个文件/71 项通过；服务身份 HTTP smoke 通过（所有新端点匿名请求401，合法服务身份但无数据库503）；隔离 PostgreSQL 集成25/25通过，其中新Repository实例读取原任务、取消持久化、重复取消幂等、未知任务返回空均通过。另有真正的HTTP+PostgreSQL进程重启smoke通过：创建202、读200、取消/重复取消均为CANCELLED，停止并重启服务后同一记录仍可读；匿名操作401、缺失Task404。该重启smoke现已加入V1.2完整代码套件；2026-10-06本轮完整`pnpm verify:stage -- --stage V1.2 --suite code`退出0，并验证三场景Web/API/CLI、Qlib及隔离清理。容器、网络清理并核实，活动服务未连接。普通沙箱 HTTP loopback 与 Docker socket 访问均因 EPERM 失败，均保留记录；最终 smoke 使用受控本机 loopback，PG使用隔离临时容器。

**限制：**本实现创建状态为 RUNNING 的记录，但没有任务执行器、工作进度/失败状态、Artifact数据写入联动、原子发布事务或进程崩溃恢复。故其只证明状态记录持久化，不能证明取消后没有半成品发布，也不能满足 V1.2 的 Artifact 原子发布/取消验收。

机器摘要见同名 JSON；被审计输入的精确 SHA-256 见同名 `.sha256`。
