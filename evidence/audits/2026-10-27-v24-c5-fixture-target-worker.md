# C5 隔离 Fixture 目标后台任务

日期：2026-10-27。新增通过生成客户端读取 Market Data 日历及两日完成事实、Portfolio 账户的 Fixture 协调器工厂；网络请求使用各服务既有身份，目标仍强制 PAUSED 且无订单。目标前检查账户 owner/account/namespace/TestRun、CN_A、PAPER/FAKE 和 CNY。

新增 `v24_fixture_target_jobs` 和 Worker：只接受既有 owner-scoped、运行中或等待中的 V2.4 candidate-binding TestRun，数据源必须是 `fixture:`，同 Run 相同输入幂等、不同输入冲突；最长三次领取，过期租约由新 Worker 接管，旧 Worker 的 attempt/owner 被拒绝。最终领取后若目标已经提交且来源、版本、时刻、作用域和暂停状态匹配，过期租约恢复为 COMPLETED；否则失败关闭。已取消 TestRun 不领取。`STOCKQUANT_V24_FIXTURE_TARGET_WORKER_ENABLED` 默认 false，默认启动不会消费队列；当前没有外部任务创建路由，也没有真实来源或自动订单能力。

验证：Platform 单元测试 77 文件、417 测试通过；生成客户端注入 HTTP 桩校验了请求路径、作用域、内部 Bearer、所有请求为 GET；应用分层与 typecheck 通过。通过 `node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service exec vitest run tests/integration/v24-fixture-daily-coordinator-postgres.spec.ts`，2 项真实隔离 PostgreSQL 测试通过，覆盖租约接管、旧 Worker 拒绝、最后一次领取目标已写入的恢复、输入不一致失败、取消不领取和重新连接读回；临时容器/网络已清理核实，活动服务未连接。数据、日历和服务响应为合成或测试替身；没有验证实际多服务 HTTP、容器化 Web、CLI 同 Run、浏览器关闭或真实进程崩溃。

工作树 SHA-256：队列 `9ccdf3d383879b3482ca95715cf79ad2739bbbfdb45b2cede97fb1c4d1156d2f`；客户端工厂 `f0907db0d0a5be7d7a7b90b9c9966bf1890ba515ab360369ea95375654d6fedc`；Worker `c5859c209801b5b44e1d65b9fa9bfab54c4243214ccc86a308114b2eb3594998`；端口 `b88d404bbb9fcb2a6a657f22380e93b531b674b4e7fd822e7b0c7542cd0f1032`；PG测试 `784d8e28e1b0d091bc6a84c7f9b3f229c14e9982db6b817896a1aee2dc2180a4`。PostgreSQL 镜像 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。

实际可复现的两日冻结日线、持久任务创建及 Web/CLI 场景、真实多服务/进程故障测试仍需补齐；Candidate A 权威授权、连续执行、日终对账和20日观察均未完成，C5仍 PENDING。
