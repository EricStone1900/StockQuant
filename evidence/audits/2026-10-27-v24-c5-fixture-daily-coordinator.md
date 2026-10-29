# C5 两日 Fixture 目标协调子项

日期：2026-10-27。新增隔离应用协调器：以运行时刻读取同 owner/account/namespace/TestRun、来源、版本的两日完成事实，逐日检查同一日历版本和前两日/目标日连续交易日，再将与冻结候选输入一致的日线和完成身份写入不可变 Fixture 目标。未知日历、跨范围、未来可用、缺日、不同价格或账户不匹配均拒绝写入。Mandate 固定保持 PENDING，目标为 PAUSED 且无订单身份；未知可卖数量为0。

验证：Platform 单元测试 `pnpm --filter @stockquant/platform-api-service test` 75 文件、414 测试通过；最后收紧日历允许状态后，`pnpm exec vitest run tests/unit/v24-fixture-daily-coordinator.spec.ts` 4 项和 Platform typecheck 通过。隔离 PostgreSQL 通过 `node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service exec vitest run tests/integration/v24-fixture-daily-coordinator-postgres.spec.ts`；日线任务及目标使用同一临时数据库的独立表、合成数据和测试日历，验证幂等及新连接读回，容器/网络清理核实，活动服务未连接。首次及日历收紧后重跑均 PASS。测试未调用实际 Market Data HTTP、未运行真实日历服务或 Web/CLI。

工作树 SHA-256：协调器 `7203c0043b7a1f47941376a58390a0dd50f7c8735107c1f887555dbecefc1ead`；目标生成 `43dedcceaeadd0b871ef68e0ac765c3354d84764dc7f88b87cf9c7bb22b17372`；目标接口 `349d28f93e0e6dbb51e213db78cb2dd4d928e48ef2375e7be14220ba3d6ff759`；PG测试 `e299f92745a2c1bee47fd9a2eda0a8b522319b1e27ebea18ebe30f05ac340d94`。PostgreSQL 镜像 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。

此组件尚未接入运行时定时器、实际服务客户端或正式验收场景；PENDING Mandate 不证明活动授权。后台执行、恢复、Web/CLI同Run、用户签署和20日观察均未完成，C5继续 PENDING。
