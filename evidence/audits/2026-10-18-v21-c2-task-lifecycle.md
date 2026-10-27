# V2.1 C2-B 持久采样任务生命周期增量

日期：2026-10-18。该增量实现并验证持久任务生命周期存储，不代表调度 Worker 已接入运行，也不代表C2完成。

## 实现

- Market Data schema v10新增`market_data_sampling_task_runs`，以快照task ID关联任务结果，记录`QUEUED`、`CLAIMED`、`RETRY_WAIT`、`BLOCKED_SOURCE_AUTHORIZATION`、`COMPLETED`、`FAILED`状态、尝试次数、最大尝试数、租约、下次重试时点和错误原因。
- PostgreSQL `FOR UPDATE SKIP LOCKED`事务领取，支持多worker领取不同任务；租约超时后可重领。重试次数限制1–10（默认3），超过上限转`FAILED`。只有当前持有且未过期租约的worker能提交重试或终态；否则拒绝。
- 新表对任务ID配置`ON DELETE/UPDATE CASCADE`，与此前任务scope迁移兼容。
- 新增`SamplingTaskWorker`单任务应用循环和服务启动轮询：注入Clock、Worker身份、生命周期端口和执行端口；成功/来源授权阻断写终态，执行异常进入有限重试；空队列不执行。仅已持久化采样任务会入队，`/ready`报告Worker状态，最近任务接口返回持久执行状态。
- 当前执行器只将既有同步生成的`COMPLETED_FIXTURE`/`BLOCKED_SOURCE_AUTHORIZATION`结果映射为队列终态；Fixture解析/快照写入仍在HTTP请求中同步完成。因此后台轮询和重启恢复已接通，但快照业务执行本身尚未搬进Worker，也没有Provider port。

## 验证

- `pnpm --filter @stockquant/market-data-service typecheck` PASS。
- `pnpm --filter @stockquant/market-data-service test` PASS：22个文件、100项；新增Worker空队列、成功、授权阻断、重试和终态失败确定性用例。
- `pnpm --filter @stockquant/market-data-service test:schema-migrations` PASS：隔离PostgreSQL迁移v1–v10、并发worker领取互不重复、过期租约接管、有限重试最终失败、授权阻断终态、状态重启读取、旧v6任务身份升级；临时容器/网络已清理。
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` PASS：真实Market Data HTTP进程重启后后台Worker读取持久队列，Fixture生命周期恢复为`COMPLETED`、真实源任务稳定为`BLOCKED_SOURCE_AUTHORIZATION`，`externalRequests=0`，临时容器/网络已清理。
- Market Data、Platform API、Web typecheck及`pnpm contracts:check` PASS；C2定向Playwright 1/1 PASS；`pnpm docs:check`与`git diff --check` PASS。

## 未完成

- C2-B仍需把固定时钟的调度决策、scope/≤100池、Fixture解析/观测写入接入Worker；Provider实现仅在OD-008用途授权后执行，且Fixture/Provider复用同一应用流程。
- 监控/日线/策略/执行消费者、有效报价的source/时间/质量持久化仍未实现；所有策略保持disabled，OD-008来源授权为NONE，外部Provider请求保持0。

## 2026-10-18 后续：后台业务执行接线

修正前一版本只将同步终态映射进队列的边界：采样HTTP现在仅校验请求身份/时点、冻结scope与策略版本、持久化`QUEUED`快照任务并入队，不读取Fixture文件或写入行情观测。Worker领取后读取冻结Manifest及样本文件，验证版本、SHA-256、市场/日历、计划时点和已保存scope，再以幂等`completeFixture`持久化观测。REAL任务由同一Worker在OD-008未授权时写入`BLOCKED_SOURCE_AUTHORIZATION`，不会请求Provider。任务输入损坏、时间或scope不匹配会有限重试并最终写FAILED任务状态；schema v11扩大任务状态约束。Web提交后有界读取最新任务，以展示Worker结果。

本轮验证：

- Market Data单元：23个文件、102项PASS；新Fixture解析测试覆盖冻结Hash、时点和scope。
- Market Data、Platform API、Web typecheck PASS；`pnpm contracts:check` PASS，生成Schema含QUEUED/FAILED状态。
- 隔离PostgreSQL迁移测试PASS：v1–v11升级/重启、并发claim、过期租约接管、有界重试和失败拒绝；临时容器/网络清理完成。
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` PASS：HTTP返回QUEUED，Worker完成Fixture两条观测，服务重启后可读；错误时点Fixture终止为FAILED；REAL任务终止为BLOCKED_SOURCE_AUTHORIZATION；外部请求0；隔离容器/网络清理完成。
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts` PASS，1/1；`git diff --check` PASS。

该增量只完成C2-B的本地Fixture后台执行业务子项。真实Provider统一执行接口与行情source/时间/质量记录、监控/收盘日线/策略/执行消费者、C2-E完整同Run normal/rejection/recovery及CLI check-only、OD-008来源授权和人工验收仍未完成；C2和V2.1维持IN_PROGRESS/PARTIALLY_IMPLEMENTED。

## 2026-10-18 后续：观测来源与时间质量

- Worker现在按注入Clock在每条观测上记录`sourceId`、`dataMode`、`observedAt`、`ingestedAt`、`availableAt`、`ageSeconds`及`freshness`；冻结样本保留原始source time，处理时间来自Worker执行Clock。
- 超过任务20/30分钟新鲜度阈值时，`freshness`和业务`status`均为`STALE`；缺少观察时间时保留null、年龄为null、状态为`UNKNOWN`。两种情况都不会以`READY`进入后续消费者。Web展示来源、三类时间、状态和年龄。
- schema v12为历史快照补齐显式来源和时间状态。只有任务明确为Fixture且保存了Fixture版本时才生成`fixture:<version>`来源引用；旧观察时间可以保留，无法证明的入库/可用时间留空，旧`READY`降为`UNKNOWN`。迁移不伪造历史到达时间。
- 单测23文件/103项、Market Data/Platform/Web typecheck、`pnpm contracts:check`、v1–v12隔离PostgreSQL迁移（包含v6历史观测回填断言）、HTTP重启烟测、V2.1定向Playwright 1/1均PASS；外部请求为0，隔离PostgreSQL资源清理完成。

该增量只完成Fixture观测的本地来源与时间质量字段。真实Provider与真实源时间可信度、监控/daily-bar/strategy/order消费者、C2-E完整同Run CLI、OD-008及人工验收仍未完成，C2保持IN_PROGRESS。
