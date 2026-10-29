# V2.5 持久分钟上传队列审计

日期：2026-10-29  
范围：C6/V2.5 本地单源工程切片；仅使用合成 CSV，不访问行情源、不触发真实账户或策略。

## 结果

分钟文件上传现有持久完成任务队列。`POST .../finalize-queued` 持久化队列项并返回 `202`；Worker 以租约领取任务，上传完成状态与任务结果保存在 PostgreSQL。所有者可读取任务状态，其他所有者读取返回 `404`。排队任务可取消，失败任务可从重新开放的上传会话重试；当前运行中的任务不支持协作取消。

V2.2 大文件上传入口提交持久队列并显示任务状态；V2.5 验收页可从同一浏览器保存的上传会话读取、轮询或取消排队任务。小于 700KB 的 CSV 仍走同步兼容入口。V2.5 的查询 TestRun 与真实分钟导入同 Run CLI 链先前已单独通过[接线审计](./2026-10-29-v25-minute-import-run-integration.md)。

## 隔离 HTTP/PG 重启验证

命令：`pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke`  
退出码：`0`，结果：`PASS`。烟测以本机 `127.0.0.1` 服务和随机命名的临时 PostgreSQL 数据库运行，最终在清理逻辑中删除该数据库；不访问外部服务。

| 项目 | 结果 |
|---|---|
| 合成 CSV | 848,055 bytes，SHA-256 `8a1aa25c16e677629955cefc9f691d5282de1782cfe1b97a7a8ee074b68368b8`，16,000 rows，2 chunks |
| 上传会话跨服务重启续传 | PASS；接收的首块和后续块状态持久 |
| 缺少块时预览 | 拒绝 |
| 完成任务入队后服务重启 | PASS；队列状态持久，随后注入崩溃Worker的过期 `RUNNING` 租约，服务重启后由新Worker接管 |
| 过期租约接管 | PASS；上传 `16220785-6297-4a14-96d9-18299fd2d7eb` 的任务先置为 `attempt=1`、`lease_owner=crashed-worker`、租约已过期；新Worker第二次领取，终态 `COMPLETED` 且 `attempt=2` |
| 导入结果 | `COMPLETED` / `PUBLISHED`，16,000 rows；本次复核版本 `v2.2-import-8b8a487bc297` |
| PostgreSQL 结果读回 | PASS；16,000 条分区 Bar 持久，分页接口复核通过 |
| 解析失败 | 返回 422，上传恢复为 `OPEN`；已写入的暂存批次随事务回滚 |
| 排队任务取消 | PASS；上传变为 `CANCELLED`，任务终态持久化 |
| 错误所有者 | 上传不可见；任务状态返回 404 |
| 重复块/配额释放/完成后取消 | 幂等块通过；取消释放暂存配额；完成上传拒绝取消 |
| 隔离清理 | PASS；脚本结束时删除随机临时数据库 |

容量边界也在同一真实服务/隔离数据库中验证：测试数据库预置一条合成的`PUBLISHED`汇总记录，其`accepted=1,440,000`；再经`POST /v2/minute/csv/import`提交一条有效合成Bar。接口返回HTTP `429` / `MINUTE_STORAGE_QUOTA_EXCEEDED`，前后导入记录数相同。该做法验证真实PostgreSQL配额计量查询、事务门和HTTP映射，不插入百万条测试Bar；所有预置记录随临时数据库删除。

浏览器验证命令：`pnpm --filter @stockquant/web test:e2e tests/e2e/v22-csv-upload.spec.ts tests/e2e/v25-durable-minute-upload-queue.spec.ts`，结果 5/5 PASS；Web/Platform/Market Data 类型检查、Market Data 160 项单测、Platform API 442 项单测及合同/文档检查在本轮前序执行中通过。浏览器测试使用本地路由桩；真实数据库/HTTP 行为由上述隔离服务烟测覆盖。

## 限制和当前状态

- 队列已验证单一Worker的过期租约接管与进程重启接续；尚无显式长任务心跳或多主Worker长时间竞争测试。
- 排队中的任务可取消；运行中的任务不支持协作取消，Web 当前不提供该操作。
- V2.5 上传会话恢复依赖同一浏览器的 `localStorage`；跨设备检索任务尚未提供。
- 1,440,000 根 Bar 的全局发布上限仍为行数额度，不代表物理磁盘字节上限；隔离数据库验证了该计数门与HTTP拒绝，物理磁盘容量和保留周期仍未测。
- 本报告只覆盖分钟上传队列与对应单源本地工程路径，不构成 V2.5/V2 PASS。第二分钟源与60日覆盖仍为 `DEFERRED`；全市场分钟容量、长期稳定性、PIT、V2.4观察仍按原状态保留。

## 独立复核与所有者验收

2026-10-29复核未发现遗漏的本地单源工程退出项。复核发现初始重启证据只覆盖持久 `QUEUED` 任务，没有覆盖Worker领取后租约失效；烟测已增强为注入过期 `RUNNING` 租约、重启后断言接管尝试次数从1增至2，并重新通过。同期再次确认真实PG容量计数的HTTP 429及原子拒绝、错误owner 404、排队取消、解析失败事务回滚、160项Market Data单测、442项Platform单测、相关类型检查、Web定向E2E 5/5与文档链接检查全部通过。

候选源码文件清单及逐文件SHA-256见[来源指纹清单](./2026-10-29-v25-minute-upload-queue.sources.sha256)，包含本次同Run导出烟测脚本；独立复核后清单本身SHA-256：`438bfe196c5c1cc2ea6c71c91ad698330cb9e10524a24c9b14ab449fd2671d6c`。该指纹覆盖分钟队列、配额、生成合同、Platform/Web接线及定向测试文件；共享工作树不是独立提交，签收仅绑定该清单及本审计列出的运行证据。

项目所有者于2026-10-29回复“我以验收通过，你再帮我重新核查一遍，确保没有遗漏”。独立复核完成后，记录 `PASS（C6_LOCAL_SINGLE_SOURCE_ENGINEERING，仅本地单源工程切片）`。签收不扩展到第二来源/60日覆盖、全市场分钟容量、物理磁盘配额、长期稳定性、PIT、V2.4观察或V2.5/V2整版。

### 验收记录导出补核（2026-10-29）

独立复核发现，先前的V2.5持久导入查询Run已有Web断言与同Run CLI核对，但本次队列审计未保留该Run的正式证据导出包。已扩展隔离HTTP/PG烟测并重跑：Market Data、Platform API和Web生产构建通过；真实隔离Web/API/PG写入同一Run，`testRunId=39a256a1-0e6f-41d4-a852-1f7f4f649099`，6条分钟Bar持久化并读回，两个页面断言PASS；同Run CLI `--check-only`退出0，脱敏证据导出退出0，Manifest SHA-256为`bd513afde6fbaa85edba7d7888581b5dc2be322c9cec647ee4c22dd8376dcdd3`。导出内容记录观察门禁仍为`V2.4_20_TRADING_DAYS_PENDING`、`researchUseAllowed=false`，没有替代人工签名或扩大数据用途。关键JSON与Manifest已复制到[保留的导出证据包](./2026-10-29-v25-minute-import-evidence-export-39a256a1/)，隔离PostgreSQL容器和网络已验证清理。

该次运行同时绑定于更新后的源码指纹清单（包含此次Smoke入口）；见本文件旁的`.sources.sha256`，复核后清单Hash另行记录。完整V2.5/V2仍保持`PARTIALLY_IMPLEMENTED`。
