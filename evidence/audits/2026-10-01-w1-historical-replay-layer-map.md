# W1 Historical Replay分层现状映射

日期：2026-10-01。状态：架构文档复核完成，代码分层迁移未完成。

新增服务边界文档将`main.ts`内的HTTP、配置/身份装配、PostgreSQL DDL/查询、跨服务生成客户端协调和回放用例逐项映射到目标五层，明确保留已有领域模块及run锁、request hash、Bar屏障、UNKNOWN原订单查询等不变量。目录扫描仅验证目录和禁止依赖，不足以证明应用/端口/适配器已实际接线，因此没有把Historical Replay加入baseline分层PASS名单。

验证：`pnpm docs:check`通过（1998个本地Markdown链接）；Historical Replay构建通过；单测8文件/23项通过；`git diff --check`通过。未运行跨服务业务、采集、活动服务写入或交易。

后续实施：按服务设计第6节建立ports/adapters/application/bootstrap并迁移composition；执行适用V2.3 code与HTTP恢复回归，再由可验证行为决定是否纳入分层扫描。
