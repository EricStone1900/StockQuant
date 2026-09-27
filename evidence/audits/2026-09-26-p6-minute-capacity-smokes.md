# P6 每日分区分钟导入容量 smoke（2026-09-26）

## 可复跑命令

仓库根目录运行；默认100,000行，也支持1,440,000行冻结规模档位：

```bash
STOCKQUANT_PARTITION_SMOKE_ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres \
  pnpm --filter @stockquant/market-data-service minute-partition:capacity-smoke

STOCKQUANT_PARTITION_SMOKE_ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres \
STOCKQUANT_PARTITION_SMOKE_ROWS=1440000 \
  pnpm --filter @stockquant/market-data-service minute-partition:capacity-smoke
```

脚本只允许精确的本机PostgreSQL管理端点。每次生成随机数据库名`sq_md_partition_load_<uuid>`，创建后运行真实PostgreSQL迁移、导入、计数、分页和`EXPLAIN`，之后`DROP DATABASE ... WITH (FORCE)`并查询`pg_database`确认已删除。无订单/券商/外部调用。

## 负载和结果

确定性合成5分钟Bar；500只证券、每日48条，交易日历排除周末，从2026-01-05开始。每1,000 Bar写入一批，使用真实`MinuteImportRepository.publishStream`临时表、最终分区表和事务发布。

| 行数 | 覆盖 | 提交耗时 | 吞吐 | Node峰值RSS | DB尺寸增量 | 日分区 |
|---:|---|---:|---:|---:|---:|---:|
| 100,000 | 500证券×200条，跨5个交易日 | 2,467 ms | 40,535 rows/s | 116,416 KiB | 62,644,224 bytes | 5 |
| 1,440,000 | 500证券×60日×48条 | 39,224 ms | 36,712 rows/s | 213,264 KiB | 899,104,768 bytes | 60 |

运行架构为macOS arm64宿主及Docker PostgreSQL 16.9。两档均精确核对PUBLISHED行数，按证券/单Bar范围分页成功，`EXPLAIN`只访问目标日期分区主键Bitmap索引。1.44M运行时另一次只读`docker stats`采样显示PostgreSQL约357.6 MiB / 1 GiB、CPU约102%；这是单时点采样，不能当容器峰值。数据库删除由烟测后置断言确认。

数据库增量包含JSONB、索引、表和索引页，约624～649 bytes/Bar；它不是压缩后对象存储成本。Node maxRSS是进程绝对峰值，不是新增占用或数据库容器峰值。

## 边界

负载数据是合成的，精确保留500×60×48行数与日期分区形状，不是冻结的BaoStock归档内容，也没有调用CSV/Parquet解码、HTTP上传、续传、重复键质量审查或License流。该结果验证仓储层在本机小样本容器限制下能发布1.44M行，不证明历史数据逐字节正确、Ubuntu/生产资源表现、持续长跑、并发隔离或备份恢复。V2.2整体观察与人工验收门槛保持未完成。
