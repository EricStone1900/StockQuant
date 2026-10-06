# W1/V1.2 Artifact task 原子发布与恢复审计

时间：2026-10-06 18:39 Asia/Shanghai。状态：工程切片通过；V1.2新范围人工验收、Ubuntu实机和V1正式版本门禁仍未完成。

## 行为

Market Data Artifact task采用`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`状态机。worker以带过期时间的PostgreSQL租约认领任务并递增fence。发布事务锁定任务行、插入不可变产物字节与SHA-256、更新`COMPLETED`并一次性提交。取消也锁定/更新同一任务记录；取消先提交则没有产物，发布先提交则任务保持`COMPLETED`。worker租约过期后可被接管，旧fence发布返回当前记录且不写产物。已有Artifact内容若与重试内容不同，事务拒绝覆盖。

当前执行器只加载固定Fixture `v1.2-market-data-1`，产物字节储存在同一PostgreSQL数据库。它不证明大型产物、对象存储、扩展worker容量或生产Web任务管理体验。

## 本轮验证

- `pnpm --filter @stockquant/market-data-service typecheck`与`build`：PASS。
- Market Data单元测试：19个文件、74项PASS，其中执行器验证成功SHA发布、Fixture失败写入FAILED及空队列。
- Market Data PostgreSQL集成：28/28 PASS。隔离数据库验证事务内Artifact字节/哈希/COMPLETED状态一致、取消与发布竞态只有完整COMPLETED或无产物CANCELLED、过期租约接管后fence从1到2且旧worker不能发布、幂等取消及重启持久状态。
- Artifact HTTP/PG重启smoke：PASS。取消任务跨进程重启仍为CANCELLED且无产物；另一个QUEUED任务在服务重启启用worker后完成，产物与`fixtures/v1/v1.2/cn_daily.csv`逐字节相同、SHA-256为`2d799e0fc18dbb8d312c394ad61afbe009570bc4a5e9cec0b43231d669a66f78`。匿名创建/取消为401，缺失task为404；本次外部来源请求0。
- 完整`pnpm verify:stage -- --stage V1.2 --suite code`：退出0。baseline、contracts、全仓unit、隔离PG集成、服务身份、锁定Qlib和Web/API/CLI normal/rejection/recovery-probe同Run均通过。Web/CLI TestRun UUID：`967eab4b-6704-4599-9ecb-99032ffc58ff`、`7ac561df-3d83-4a0b-bcf0-21c06a93da22`、`4165ed6a-8fee-42e2-91c4-77cdec657c98`。专属容器、卷、网络及镜像清理核验通过；活动服务未连接。

完整套件运行于随机一次性PostgreSQL和Compose项目。另一次开发者独立运行`pnpm test:integration:market-data`时，该便捷入口默认连接本机`market_data_test`数据库；首次执行被历史pending alert outbox行触发一个无关全局计数断言失败。测试断言已改为只计算本次alert UUID，并在结束后清理精确测试UUID。第二次完整代码套件通过。已通过只读查询识别并仅删除失败尝试创建的精确未投递行`alert_id=ba1c0acb-7428-46e6-b5ec-e04401ba9639`、`alert_key=alert-1791282818503`；其他数据和历史行未修改。该直接运行不是最终集成证据，最终证据来自完整代码套件的一次性数据库运行。

普通沙箱访问本机数据库曾返回`EPERM`；受控套件使用受限随机测试容器。普通受限调用的失败未作为PASS覆盖。

## 未完成边界

V1.2阶段当前范围仍需用户实际验收；未在PRD里预填签署。Ubuntu x86_64交付、Web侧任务查询/进度体验、对象存储/大产物容量、真实Qlib市场数据和V1版本级其他阶段/历史Run门禁仍未完成。NO_TRADE、数据源授权NONE保持不变；本轮没有行情、Paper或Broker请求。

机器报告见同名JSON；源码、合同、阶段文档、计划和机器报告当前哈希见同名`.sha256`。
