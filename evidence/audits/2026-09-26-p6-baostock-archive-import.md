# P6 冻结 BaoStock 5m 归档 HTTP→PostgreSQL 导入（2026-09-26）

## 可复跑入口

前置：本地 Compose PostgreSQL 在 `127.0.0.1:5433` 可用；仓库忽略目录中存在冻结只读归档 `data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1`，含Manifest及500个源文件。

```bash
pnpm --filter @stockquant/market-data-service minute-archive:http-smoke
```

Smoke 只接受精确本机PostgreSQL管理端点，为单次运行生成随机隔离库，启动真实编译后的Market Data HTTP服务，逐个上传源CSV至 `/v2/minute/csv/import`，独立核对持久化后再执行 `DROP DATABASE ... WITH (FORCE)`；结尾查询 `pg_database`确认随机库已删除。没有外部、模型、订单或券商调用。

并发参数已扩展为`STOCKQUANT_ARCHIVE_SMOKE_CONCURRENCY`，默认1，允许1～8个有界worker。并发请求遇到HTTP 429时按服务响应的`Retry-After`等待并重试；单文件最多120次退避，禁止无限循环。

## 实测结果

- 冻结Manifest为`source=baostock`、`sourceMode=READ_ONLY`、`frequency=5m`、500只证券、60个交易日、共1,440,000行。500个文件每个2880行、最大289,495 bytes；导入前逐文件SHA-256与原Manifest一致。
- 500次HTTP导入均返回PUBLISHED，原文件Hash、接受行数和频率与Manifest逐文件一致；源代码`sh.600259`等规范为标准`600259.SH`形式。
- 来源时间戳是BaoStock紧凑`YYYYMMDDHHmmssSSS`且语义为BAR_END。按上海时间回退5分钟建立barStart；例如源09:35映射成09:30–09:35。时间频率不对齐会拒绝。源许可未知，因此每份记录均持久保存`licenseVerification=UNCONFIRMED`、`researchUseAllowed=false`。
- 独立数据库核对为1,440,000行、500个PUBLISHED导入、60个日分区；首条源OHLCV与持久Bar完全相同。总耗时199,629 ms，端到端约7,213 rows/s，数据库大小962,810,339 bytes。
- 随机隔离数据库成功删除，烟测退出0。

## 范围

上面的首次测量是串行冻结原始CSV→Market Data服务HTTP→真实PostgreSQL每日分区导入基线；它未经过平台API/登录Web/TestRun，也没有使用分块续传路径，单个归档文件均低于700 KB。双worker有界并发实测见下节。未经许可审查的数据不可用于研究/模型运行；两次实测都不能视作V2.2人工验收、数据来源许可通过、多副本/Ubuntu生产容量或备份恢复结论。

## 有界并发全量重跑（2026-09-26）

执行`STOCKQUANT_ARCHIVE_SMOKE_CONCURRENCY=2 pnpm --filter @stockquant/market-data-service minute-archive:http-smoke`，命令先构建当前 Market Data 服务，再对完整500个冻结文件逐个重验源Hash和行数，通过两个HTTP worker导入随机隔离PostgreSQL。结果PASS：500/500文件、1,440,000/1,440,000行、500个PUBLISHED、60个每日分区、首条源OHLCV完全匹配、数据库962,114,019 bytes。约79,246 ms，18,171 rows/s；574次HTTP请求中74次得到429，均尊重Retry-After后成功重试，实测峰值客户端HTTP并发2。许可仍为UNCONFIRMED、研究用途false，外部/券商调用0。

这一全量重跑端到端吞吐与早先串行79～82秒实测接近；单实例admission gate仍把导入写入串行化，增加客户端并发主要验证可靠限流和恢复，不证明并行加速、多Market Data副本扩容、共享PG容量或Ubuntu表现。随机数据库由脚本`finally`删除并经库内查询确认。历史串行实测保留，不覆盖。

## 改动后复验

随后执行`pnpm verify:stage -- --stage V2.2 --suite code`，退出0：全仓build/lint/typecheck/单测、契约76 JSON/41 schemas/27契约fixtures/30消费者规则、冻结Fixture Hash、Market Data 51单测/22隔离PG集成、58 Python Adapter测试和94项运维测试通过。当前源码Vite页面再运行`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e -- --stage V2.2`，4/4通过，包含小文件1m预览/导入流程、大文件续传关页恢复及5m+BAR_END+BaoStock `code`/`time`字段映射。首次默认E2E URL命中旧8080页面，重定向至当前5173页面后全通过；这不代表旧8080活动Web已部署。

## 双服务跨实例全量重试（2026-09-26）

执行`STOCKQUANT_ARCHIVE_SMOKE_CONCURRENCY=2 STOCKQUANT_ARCHIVE_SMOKE_INSTANCES=2 pnpm --filter @stockquant/market-data-service minute-archive:http-smoke`。Smoke启动两个独立本机Market Data HTTP进程，共享一个随机隔离PostgreSQL数据库；两个导入worker轮转请求目标服务。500/500源文件重新核对Hash及行数并全部PUBLISHED，持久层共1,440,000行、500个导入版本、60个日分区，首条源OHLCV精确匹配。共573次HTTP请求、73次429；两服务分别收到287/286次请求、返回49/24次429，并分别发布263/237个版本。峰值客户端并发2，耗时78,196 ms，18,415 rows/s，数据库962,384,355 bytes。重试均按`Retry-After`并成功；脚本最终删除随机库，随后查询确认该库不存在。V12活动服务检查仍healthy。

这证明本机两个服务进程对共享PG session advisory lock的竞争、退避和全量完成行为有效。总耗时与单实例双worker测试接近，锁仍串行化重型导入，所以没有测得吞吐提升；结果不代表跨主机/容器资源余量、原生Ubuntu、生产共享PG持续负载或备份恢复。许可状态仍为`UNCONFIRMED`、研究使用禁止，外部/券商调用为0。
