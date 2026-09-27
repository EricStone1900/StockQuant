# P6 Parquet 上传的 PostgreSQL 重启恢复（2026-09-26）

## 结果

执行`pnpm --filter @stockquant/market-data-service minute-parquet:container-db-restart-smoke`。脚本使用本地已缓存的PostgreSQL 16.9 Alpine镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，创建随机命名、只绑定`127.0.0.1`固定临时端口的一次性数据库容器和随机测试数据库；然后以真正的Market Data服务进程运行既有上传恢复流程。

确定性未压缩Parquet为6,914,068 bytes、100,000行、14个512 KiB块，SHA-256 `dad97fa47d9b377fa783db11197deeda5e2fb71b0caabe24b2d05e39fee2eae2`。数据库重启前上传首块并重复上传一次，重复块幂等。显式重启PostgreSQL容器后，随机测试数据库内上传状态仍记录首块的524,288 bytes及块索引0；重启Market Data进程后该状态同样可读取。缺块Preview仍返回409；继续上传剩余13块后，Preview及Finalize接受100,000行，完成状态在第二次Market Data进程重启后保持不变。

TestRun/上传标识`5b1566ea-e23a-4ef6-8d01-8de2b287513a`，最终导入版本`v2.2-import-dcc7af13124b`；源Hash核对相同，数据库行数100,000，`researchUseAllowed=false`。数据库容器内Cluster的PG数据目录在重启期间保留；这是PostgreSQL同一测试容器重启和应用进程重启证据，不模拟卷删除、容器重建/换主机、磁盘损坏、故障转移或RPO/RTO。

## 清理与重现

结束后脚本删除精确随机PostgreSQL容器；该容器内唯一的随机测试数据库因此一并销毁。容器清点无`sq-md-parquet-pg-restart-*`或诊断PostgreSQL容器，临时Parquet目录已清除；活动`stockquant-v12-*`容器未重启，Market Data、PostgreSQL、Platform API和Trade Execution仍healthy。测试没有访问外部数据、模型或券商。

```sh
pnpm --filter @stockquant/market-data-service minute-parquet:container-db-restart-smoke
```

新入口要求本机已缓存`postgres:16.9-alpine`，强制`--pull never`。容器只绑定回环并使用仅用于隔离测试容器的trust认证；不得复用此设置运行生产数据库。

这一结果补充“PG进程/容器重启后持久分块可续传”，不表示活动数据库恢复、备份恢复、宿主故障恢复或P6/V2.2完成。
