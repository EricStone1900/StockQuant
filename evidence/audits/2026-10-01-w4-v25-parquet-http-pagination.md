# W4/V2.5 Parquet HTTP 分页读取容量增量

日期：2026-10-01（Asia/Shanghai）

在既有100,000行合成Parquet导入容量烟测中增加真实HTTP分页读回断言，复用相同锁定输入（500只证券×200根5分钟Bar×5个交易日，Parquet/Zstd，289,616字节，SHA-256 `0c5abdfcc0f4939af34941c11a479743d3ed95ce5e58173aa63223037f11f1a5`）。没有调用行情源、模型或券商。

Mac Docker Desktop Linux/arm64隔离套件命令`pnpm verify:stage -- --stage V2.5 --suite code`退出0；套件调用`minute-parquet:container-capacity-smoke`，构建镜像ID `sha256:4db373500516153dc9e8ca9326955e2b105af1bc746fbd917ea5515f49bf4858`，在2 GiB、2 CPU、128 PID限制下使用隔离PostgreSQL及Market Data服务实例。HTTP查询页大小1,000，游标递增读取100页共100,000行，逐行值有限且证券/Bar起始时间组合唯一；按一只证券和一天过滤返回40行、2页。完整读回耗时4,600 ms。上传28 ms、预览4,877 ms、Finalize 5,048 ms；数据库72,561,123字节，服务峰值RSS 202,612 KiB。此前同一套件中的双实例背压、Finalize幂等、损坏输入拒绝/取消断言也通过。

该目标脚本在退出时清理随机隔离数据库、容器、网络与镜像，验证结果为PASS。数据为合成输入且标记`UNCONFIRMED`/`researchUseAllowed=false`。证据只覆盖受限Linux/arm64的10万行HTTP分页及既有导入切片；不能替代Ubuntu x86_64、全市场分钟容量、生产长时运行、来源许可、真实PIT或阶段人工验收。
