# V2.1 C2-C DAILY_BAR 持久队列与 Worker 增量

日期：2026-10-19（Asia/Shanghai）  
结论：**固定合成 DAILY_BAR 任务已异步入队、后台校验和持久完成；C2-C 尚未完成。**

## 实现

- Market Data schema v15保存完成结果，v16新增`market_data_daily_bar_completion_jobs`持久任务队列；原v1–v14迁移链保持不变，后置迁移使用同一advisory lock并支持并发/重复启动。
- `POST /v2/daily-bars/fixture/complete`只提交owner/account/namespace/TestRun scope，要求已有同scope在线池且证券覆盖与冻结Fixture完全匹配；请求立即返回QUEUED，不在HTTP请求中解析/写入日线结果。重放同一scope/Fixture版本/Hash返回同一task。
- 后台Worker领取持久任务并取得有期限租约，重读Manifest和Fixture文件、校验SHA及日线语义；写结果与将任务置为COMPLETED在同一事务中提交。进程退出后，租约过期任务可重新领取；错误按3次默认上限和5秒默认间隔重试，超过上限置FAILED。
- `GET /v2/daily-bars/completions/latest`按scope返回最新task及可空completion。Platform从已认证用户构造owner并经既有服务Bearer代理；Web显示任务状态/尝试次数，随后读取结果。Fixture限定于`v2.1-daily-bars-1`，不调用外部行情、模型或订单。

## 固定输入

- Fixture：`fixtures/v2/v2.1-daily-bar-completion/bars.json`
- Manifest：`fixtures/v2/v2.1-daily-bar-completion/manifest.json`
- 版本：`v2.1-daily-bars-1`；SHA-256：`b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4`
- 交易日：`2026-10-16`；证券：`600000.SH`、`000001.SZ`（共2条）

## 验证

- `pnpm --filter @stockquant/market-data-service test`：PASS，25个文件/124项。
- `pnpm --filter @stockquant/market-data-service typecheck`：PASS；Market Data build PASS。
- `pnpm contracts:check`：PASS；JSON检查346文件、224个schema、73个Fixture，契约兼容及生成器漂移检查通过。
- `pnpm --filter @stockquant/market-data-service test:schema-migrations`：PASS。验证并发后置迁移/重复启动、任务重复入队幂等、租约到期接管（attempt 1→2）、重试等待、attempt上限失败、最后一次尝试Worker崩溃后过期租约收敛为FAILED、结果同事务完成、重建Repository读回和owner/TestRun隔离；未知版本拒绝。脚本确认隔离容器和网络已清理。
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`：PASS。HTTP返回QUEUED，Worker完成两根Fixture日线；同请求重放幂等；非法scope和Fixture/在线池覆盖不匹配被拒绝；Market Data进程重启后task/completion可读，其他TestRun无结果；`externalRequests=0`。隔离容器和网络已清理。
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts`：PASS，1/1；页面显示QUEUED到COMPLETED及`1/3`尝试次数，并可读到结果。此浏览器用例Mock Platform API，不替代前述真实服务/PG HTTP烟测。
- Web、Platform API、Market Data TypeScript typecheck在本轮检查通过；`pnpm docs:check`及`git diff --check`通过。Market Data分层检查发现既有的`src/application/v21-snapshot-sampling-fixture.ts`→adapter依赖违规；本次新增Worker的application层只依赖application queue port，此既有问题不在本次改动中。

## 未完成和验收边界

Monitor质量结果仍只有纯领域投影，尚无持久化/API及实际消费；DAILY_BAR尚无收盘后自动调度或REAL来源，来源许可/能力未验证。没有完成C2-C完整同TestRun Web/CLI场景、操作手册实测或新增范围人工验收。故C2-C继续`IN_PROGRESS`，版本验收不得标PASS。所有外部来源调用为0，LIVE/真实券商和订单路径未触发，人工验收仍为NOT_RUN。
