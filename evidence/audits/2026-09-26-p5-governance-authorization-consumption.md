# P5 治理授权命令绑定与单次消费（2026-09-26）

扩展`pnpm test:service-auth:http`中的 Decision Governance 隔离HTTP场景。Smoke使用随机隔离PostgreSQL数据库和临时凭据/loopback端口，以真实服务进程运行，不调用活动数据库或交易服务。

在已有身份/scope拒绝断言之后，回放身份申请一条`BACKTEST`+`FAKE`授权，授权绑定账户、唯一namespace及规范命令。随后以改动过的数量校验同一授权，得到403；这次失败没有消耗原授权。接着两个并发请求使用完全一致的授权ID、账户和命令，结果严格为一个200与一个403，证明并发下只可消费一次。执行结束后，smoke执行`DROP DATABASE ... WITH (FORCE)`并查询`pg_database`确认随机库行数为0。

`pnpm test:service-auth:http`通过，19项路由/状态断言全部通过；构建 Decision Governance、Historical Replay、Quant Research服务通过。此次验证仅覆盖BACKTEST/FAKE的一次性授权和调用者边界，不代表Paper Mandate、行情/风控评估、资源预留接线或Paper下单授权；没有创建订单、Fill或Paper授权。活动容器及正式观察未改变。
