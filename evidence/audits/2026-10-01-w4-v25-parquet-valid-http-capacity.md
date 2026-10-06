# W4/V2.5 有效 Parquet HTTP 导入容量复验

日期：2026-10-01（Asia/Shanghai）

执行 `pnpm --filter @stockquant/market-data-service minute-parquet:capacity-http-smoke`，退出码 0。实际 Market Data HTTP 上传、预览、Finalize 与 PostgreSQL 日分区写入在随机隔离库完成 100,000 行合成有效 5 分钟 Bar（500 只证券×200 Bar、5 个工作日）。Zstd Parquet Fixture 为 289,616 字节、SHA-256 `0c5abdfcc0f4939af34941c11a479743d3ed95ce5e58173aa63223037f11f1a5`；单块上传34 ms、预览1,407 ms、Finalize 3,861 ms。预览只保留100行显示样本，数据库读回核实100,000行、5日、Hash匹配、DataVersion隔离；数据库大小72,626,659字节，服务峰值RSS 256,576 KiB。相同上传重试幂等。

同一次隔离运行还拒绝损坏Parquet两次，随后取消该上传；未产生错误导入或Bar，已成功导入的100,000行保持不变。临时数据库为`sq_md_parquet_fe193bd828264644a60b042d9578167a`，脚本结束时以`DROP DATABASE ... WITH (FORCE)`清理并断言数据库不存在。环境是Mac arm64本机进程，未运行容器/Ubuntu；外部数据源、模型和券商调用均为0。研究许可标记为`UNCONFIRMED`、`researchUseAllowed=false`。

该结果证明这一合成规模下的有效Parquet端到端HTTP/数据库路径可用，不能外推到全市场多年容量、连续分钟数据完整性、生产队列跨进程竞争（本次仅1个服务进程）、来源稳定性、真实研究许可、PIT或Ubuntu验收。
