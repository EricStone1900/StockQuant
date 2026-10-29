# C5 本地工程 P5 完成记录

日期：2026-10-29  
范围：`C5_LOCAL_ENGINEERING_V1`，本地合成Fixture、CN_A / PAPER / FAKE；不启用真实行情源、常驻调度或LIVE。

P5 专属Web纵切已在隔离环境完成。新增 Playwright 场景直接使用正式入口`/acceptance/v2/v2.4/c5-local`，创建Web TestRun `06e40938-b6aa-4116-adb6-ab6d8a0eba2c`，完成2024-01-04、05、08、09、10五个评估会话，六项断言全部PASS，动作序列为BUY、SELL、HOLD、HOLD、HOLD。首日先创建未激活Mandate，再尝试授权，服务返回409；证据确认该拒绝没有订单或Fill。其余会话逐个创建、明确激活、执行和暂停Mandate。首日授权Job被服务接受后关闭浏览器页，再创建新页打开相同路由；页面从localStorage恢复同一TestRun，后台Job继续并完成。

对相同Web TestRun执行`verify:stage -- --stage V2.4 --scenario c5-local-engineering --run 06e40938-b6aa-4116-adb6-ab6d8a0eba2c --check-only`，退出0、状态`COMPLETED`。同Run证据导出成功，路径为`evidence/local/V2.4/06e40938-b6aa-4116-adb6-ab6d8a0eba2c/`，Manifest SHA-256为`8e4232ac3a84331e7d70af32e5e43dadbdedc1fe3b7b3172219816f85701c1cc`。导出Bundle明确标记`humanAcceptance: NOT_RUN`。

完整隔离运行命令：

```sh
node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke
```

此命令最终退出0，机器报告为[2026-10-29-v24-paper-smoke-b95154f8d6aa48b6ae7c90ab1ad5dc38.json](./2026-10-29-v24-paper-smoke-b95154f8d6aa48b6ae7c90ab1ad5dc38.json)。报告SHA-256：`0027a5f114e406d01993e55c50700f08774bd997ff74336d94adda8e1102a2aa`。报告记录C5专属Web TestRun及其同Run CLI退出0；API侧同一C5后台链为TestRun `1bfd4003-dfc4-4c79-9950-bbfcbb97dff3`。原有V2.4 Web normal/rejection/recovery、external-reconciliation、crossday-settlement及candidate-binding六个浏览器运行均成功并分别由CLI核对同Run。只读核验前后的订单、Fill、账本、持仓、预留和Outbox计数相同；临时数据库、容器和镜像已移除，活动服务未触碰。

对应[Web/CLI场景报告](./2026-10-29-v24-paper-web-e2e-77769075-660f-4ac4-8b3f-70cc43d1f55c.json)记录六个既有V2.4场景均PASS：normal `33621b2b-ae78-46ab-ada6-9ea6b8f010ed`、rejection `35e1d4cf-b5aa-4a08-ac53-5c28de5bdac9`、recovery `0cbd5165-4fdb-4b44-bc86-b2cbb2ae8ab2`，另有external-reconciliation、crossday-settlement、candidate-binding；[专属导出包](./2026-10-29-v24-c5-local-export-06e40938/evidence.json)记录C5本地纵切六项业务断言PASS。P4报告和P4 30分钟实计时仍由[P4审计](./2026-10-29-c5-local-p4-progress.md)单独证明；本次P5 smoke未重复长时间计时。

本轮必要检查：`node --test scripts/evidence-export.test.mjs` 16/16 PASS；`pnpm --filter @stockquant/web typecheck`通过；`pnpm --filter @stockquant/platform-api-service build`、`pnpm --filter @stockquant/web build`通过；完整Smoke内服务构建及Web浏览器场景通过。Smoke故障恢复断言现在比较同一Job在注入前后的持久attempt值，并验证SIGKILL后继续重领、复用唯一目标，避免错误假定随机Worker时序必定从attempt 1开始。

已保留的失败历史：首轮容器化E2E发现测试误读C5汇总字段，已改为断言五个会话结果；后续报告筛选发现API C5 Run与Web C5 Run共用隔离数据库，已精确排除API Run；另有一次随机端口碰撞，检查确认无遗留监听/容器后重试。最后一次完整隔离Smoke通过。早期失败的业务断言均已以针对本地C5合同的方式修正并由最终Smoke复验；原始失败输出位于本次命令临时日志，不覆盖既有阶段失败/历史证据。

手册第8.7节现记录命令、动态Web端口和正式路由、Fixture版本/Hash、五日交互、拒绝与重开恢复、同Run CLI/导出、清理边界和预期结果，P5手册状态为`VERIFIED_EXECUTABLE`。P1–P5工程项完成；当前范围P6用户验收仍`NOT_RUN`，故C5保持`PENDING`。20个合格实际交易日独立延期，完整V2.4及V2仍不通过。
