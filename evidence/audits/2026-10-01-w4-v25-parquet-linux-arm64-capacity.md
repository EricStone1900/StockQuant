# W4/V2.5 Linux/arm64 双实例 Parquet 容量复验

日期：2026-10-01（Asia/Shanghai）

执行 `pnpm --filter @stockquant/market-data-service minute-parquet:container-capacity-smoke`，退出码 0。Docker Desktop 上构建并运行 Market Data Linux/arm64 镜像（image ID `sha256:c2273b044e1ac0fb354dd3ccdea6031a2e1ca56e404651bd2a09a287fcaa82d1`），临时 PostgreSQL 和两个服务容器受 2 GiB、2 CPU、128 PID 限制。真实 HTTP 上传、预览、Finalize 将100,000行有效合成 Parquet 行持久化至5个按日分区；数据库行数/源 SHA 一致、重复Finalize幂等。上传125 ms、预览4,787 ms、Finalize 4,927 ms；数据库72,561,123字节；服务RSS峰值188,832 KiB。

两个独立服务进程并发预览与Finalize均验证恰有一个请求获准、另一个返回busy；锁释放后恢复操作可继续。损坏Parquet重试两次后取消，没有生成Rejected/Published导入或Bar，已有有效版本仍为100,000行。Fixture为500只证券×200根/证券×5个工作日，Zstd文件289,616字节，SHA-256 `0c5abdfcc0f4939af34941c11a479743d3ed95ce5e58173aa63223037f11f1a5`，研究用途未授权；来源、模型、券商调用均为0。

脚本创建并在退出路径精确清理了随机隔离镜像、网络、PostgreSQL和两个服务容器，另删除临时Fixture目录。运行平台是Mac Docker Desktop Linux/arm64，非Ubuntu实机，也不是全市场容量、长周期、真实源、PIT或生产服务观察证据。结果证明本约束下的100,000行/双进程切片，不应外推到更大负载。
