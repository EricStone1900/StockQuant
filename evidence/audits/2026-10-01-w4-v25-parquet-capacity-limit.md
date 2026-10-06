# W4/V2.5 Parquet 单文件容量边界复验

日期：2026-10-01（Asia/Shanghai）

先检查既有接口合同与实现：`services/market-data-adapter/src/market_data_adapter/parquet_to_jsonl.py` 的 `MAX_ROWS=100_000` 是显式单文件上限；超限由适配器拒绝，64 MiB文件上限仍独立生效。尝试把 500证券×60工作日×48根（1,440,000行）的单个合成Parquet接入现有HTTP容量流程，预览返回422 `PARQUET_PARSE_REJECTED`，竞争实例按预期返回429 `MINUTE_IMPORT_BUSY`。拒绝原因与合同一致，故没有放宽安全边界或将其记为缺陷/通过。此前已有仓储层1,440,000行发布、分页和分区证据，以及冻结归档1,440,000行HTTP导入证据；两者均不等于一个超出上限的Parquet文件通过接口。

随后在支持上限下重跑 `pnpm --filter @stockquant/market-data-service minute-parquet:container-capacity-smoke`，退出码0。Docker Desktop Linux/arm64镜像 `sha256:918df58eaa2f6be2bf222a3a4c69325ef491fb77fd051a4508846a2f5e04818b`，2 GiB/2 CPU/128 PID，两个Market Data实例与随机临时PostgreSQL。100,000行合成Zstd文件（500证券×200根×5日，289,616字节，SHA-256 `0c5abdfcc0f4939af34941c11a479743d3ed95ce5e58173aa63223037f11f1a5`）完整上传/预览/发布；持久行数与SHA吻合，预览/发布均100,000行，重复Finalize幂等。按1,000条分页完整读回100页、无重复键、值有效；单证券单日筛选40条/2页。双实例Preview/Finalize互斥和释放、损坏输入两次拒绝后取消均通过，坏输入未改动已发布行。上传31ms、预览4,863ms、Finalize 5,127ms、分页4,436ms；隔离数据库72,561,123字节，采样服务RSS峰值192,556 KiB。来源/模型/券商调用为0，Fixture `researchUseAllowed=false`。

脚本已精确清理随机测试库、容器、网络和镜像。此证据只覆盖100,000行/单文件正式边界下的受限Linux/arm64双实例切片；不证明Ubuntu x86_64、全市场生产负载、真实数据许可、真实PIT或阶段人工验收。1,440,000行单文件HTTP能力仍不支持；若产品需求确需该输入形态，应另立可分片/多文件导入合同与资源预算。
