# P5 治理授权轮换与过期拒绝（2026-09-26）

扩展治理身份HTTP烟测，使用随机隔离PostgreSQL库及临时服务进程验证真实授权状态：

- 回放身份签发`BACKTEST`/`FAKE`授权，绑定account、namespace和命令Hash；篡改数量后验证返回403，原授权仍可用。
- 对同一授权并发验证两次，结果一个200、一个403。
- 发现同namespace签发不同命令时，旧实现更新Hash但保留原`authorization_id`，使旧持有者能继续使用该ID。已修复冲突更新同时轮换授权UUID、account、命令Hash、模式、状态和有效期；旧ID随后验证返回403。
- 直接在隔离测试库将独立授权过期，再通过HTTP验证返回403。
- 清理随机测试库后查询`pg_database`，确认无残留。

`pnpm test:service-auth:http`退出0，23项断言通过；Decision Governance 4/4单测、lint/build，以及Historical Replay、Quant Research构建通过。脚本语法、663条本地文档链接和`git diff --check`通过。

范围：只改进BACKTEST/FAKE replay授权生命周期；未实现Paper Mandate、风险/预留/订单链，也未创建订单或Fill。活动服务、正式数据库、观察计数及人工验收均未改变。

治理授权ID轮换变更后再次执行`pnpm verify:stage -- --stage V2.4 --suite code`，退出0。合同/Fixture基线、全仓构建/lint/typecheck、所有工作区单测、Market Data PostgreSQL集成22/22、运维测试94/94均通过。该套件仍只构成工程证据。
