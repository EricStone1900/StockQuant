# W1 Historical Replay层边界迁移与回归

日期：2026-10-01。范围：只重组服务内部依赖，不改变业务契约、数据库所有权、FakeBroker调用语义或活动部署。

`ReplayRunRepository`定义持久化与run-lock端口，`ReplayPortfolioClient`、`ReplayTradeExecutionClient`和`ReplayGovernanceAndResearchClient`定义下游边界。`PostgresReplayRunRepository`收纳DDL、迁移兼容语句、状态转移、advisory lock、运行读写与检查点/结果保存；`application/replay-coordinator.ts`协调单Bar/多Bar执行、暂停/取消检查、Bar屏障及UNKNOWN原单恢复；`bootstrap/main.ts`装配PostgreSQL和生成客户端并承载HTTP服务，稳定`src/main.ts`入口保留。baseline加入Historical Replay五层扫描。

新增UNKNOWN恢复断言：恢复只按已有orderId查询；状态仍UNKNOWN时返回`MANUAL_REVIEW_REQUIRED`且不再次执行。验证：Worker build通过；9个测试文件/25项测试通过；Historical Replay分层扫描PASS；完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，其中包括契约、全仓lint/typecheck/unit、isolated Qlib真实Fixture组件、服务身份HTTP smoke（14项未授权路由探测，以及持久化run读取投影断言（200、TestRun ID匹配、requestHash不对外返回））及Qlib Fixture TestRun HTTP链；临时DB、网络、容器、镜像和内容目录均清理PASS。`pnpm docs:check`及`git diff --check`通过。

边界：代码suite及生成Fixture TestRun不等于V2.3 normal/rejection/recovery新TestRun、独立研究验证、真实市场数据/PIT授权或新增人工签署；没有调用外部Provider/行情源、没有启动交易，也没有切换活动服务。V2.3与总版本状态不因本次内部重构升级。
