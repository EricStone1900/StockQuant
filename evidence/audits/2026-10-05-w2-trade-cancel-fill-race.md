# W2 撤单与迟到成交竞态复验（2026-10-05）

执行 `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`，Trade Execution 构建与隔离 PostgreSQL 持久化集成均退出 0。测试使用固定 PostgreSQL 镜像 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，随机容器 `sq-test-postgres-646a72f4c31e38dd`，仅绑定临时 loopback 端口；Harness 验证容器清理，活动服务未连接，FakeBroker 模式。

本次复验确认：较晚的撤单确认先到时不会跳过缺失的较早成交序号；补齐序号后按顺序应用成交与撤单，撤单确认后迟到成交被隔离；累计数量转增量、回退/超量拒绝、无变化报告无新成交和重复回放幂等均通过。资源预留等全部部分成交投递后才释放。费用更正验证顺序版本、幂等重放、持久投递屏障及原始 Fill 不可变；重连可读到终态撤单与既有部分成交。

机器断言见同名 JSON。范围仍是隔离 FakeBroker/数据库，不替代真实 Paper、活动部署、用户验收或观察门禁。
