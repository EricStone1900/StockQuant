# W2：Portfolio 版本化费用更正接收端

日期：2026-10-02。状态：Portfolio 接收端PASS；Trade Outbox/跨服务闭环NOT_RUN。

Portfolio Risk新增受服务身份保护的`POST /internal/v1/accounts/{accountId}/fills/{externalFillId}/fee-corrections`。只允许Trade Execution独立Bearer调用。共享Schema/OpenAPI/生成Portfolio客户端明确更正revision、前费用、修正费用、生效时间与证据引用。

数据库保留`recorded_fills.original_fee`作为不可变Fill语义并以`fee`保存最新费用；`fill_fee_corrections`保存按Fill/revision唯一约束的修订历史。账户及Fill行锁保护revision连续性与previousFee精确前置条件。一个事务更新最新费用/修订号、现金差额、BUY预留捕获额，插入`FEE_CORRECTION`账本分录和更正历史。差额为`previousFee-correctedFee`；费用增加即现金扣减。完全相同的版本重放幂等，修改同一版本或跳版冲突；原始Fill重投仍对比original_fee，不会被合法更正破坏幂等。

`resource-reservations.spec.ts`隔离PostgreSQL验证BUY成交fee由1→2→1连续更正，账号现金依次精确变化、两条不可变差额账本合计为-1、captured cash同步至2011、重复/冲突/跳版处理正确、原始Fill在更正后仍幂等。`service-auth-http-smoke.mjs`实际启动Portfolio HTTP服务，执行服务凭据可成功更正，平台身份403，重放及旧Fill重投幂等，现金为8998.0000，TestRun=`29eb1fd5-7d65-4026-817b-bf7e60ef2c3c`；3个PostgreSQL集成测试和5项单测通过。

`pnpm contracts:check`退出0，149 schemas、103兼容规则、Portfolio Account OpenAPI 6操作均通过生成/漂移检查。`pnpm --filter @stockquant/portfolio-risk-service typecheck`及`test`通过。普通沙箱回环`EPERM`和第一次烟测遗漏snapshot owner header的失败均保留在命令历史；受控隔离复跑通过。准确测试数据库账号/行由Smoke清理；没有连接活动服务或真实券商。

尚未由Trade模拟Broker报告产生`FEE_CORRECTION`持久Outbox，当前新路由不应被单独视为完整FakeBroker事件链。需要追加Trade端版本/证据校验、Outbox交付/重试/补偿、Trade→Portfolio隔离HTTP/PG链及Web/CLI同Run场景后，才可复判P-F05费用更正项。

逐文件SHA-256：[Manifest](2026-10-02-w2-portfolio-fee-correction.sha256)。
