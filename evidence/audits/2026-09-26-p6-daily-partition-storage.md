# P6 分钟数据每日物理分区与兼容回填（2026-09-26）

## 实现

- 新导入分钟行写入PostgreSQL `market_data_minute_import_bars_by_day` RANGE分区父表；分区按 `bar_start` 的Asia/Shanghai自然日建立，例如`market_data_minute_import_bars_20260911`。
- 子分区创建受事务级日期advisory lock保护；同批只创建涉及日期，分区和Bar与导入DataVersion在同一事务提交。
- 分页接口保留既有游标/证券过滤，并新增半开`fromBarStart`/`toBarStart`范围，PostgreSQL据范围执行分区裁剪。
- 旧的`market_data_minute_import_rows`保持不动，查询期间以ANTI-JOIN回退读取尚未迁移的行。新行只写分区表，不双写旧表。
- 新增最多10,000行一批的重试安全回填方法，以及显式CLI：默认PREVIEW；只有指定`MARKET_DATA_PARTITION_BACKFILL_DATABASE_URL`并传`--apply`才会写入。命令拒绝正式`market_data`库/服务身份；逐批提交，旧表数据保留供回滚及校对，不执行DROP/TRUNCATE。

## 验证

- 专用`market_data_test` PostgreSQL 集成22/22、服务单元测试49/49、构建通过。
- 新导入真实创建父表`relkind=p`及上海时区每日子表；并发同哈希依旧仅一次发布。半开日期范围页仅返回边界内Bar；对含2026-09-11和09-12两个分区的查询执行真实`EXPLAIN`，09-11范围只扫描对应日分区。
- 旧表两行保持可分页读取；回填批大小1将其迁入两个真实日期子表，重复运行插入0行，读取仍恰好返回2行。
- 自动化CLI smoke在专用库插入一条精确版本测试记录：PREVIEW报告pending=1且无写入；`--apply --batch-size=1`插入1；再次执行插入0；分区分页返回1。finally仅删除该精确测试版本。根集成入口已纳入此smoke。
- 修改后的`pnpm verify:stage -- --stage V2.2 --suite code`退出0：全仓build/lint/typecheck/unit、FakeBroker/Portfolio隔离数据库、契约、Python Adapter 58项、运维94项、Market Data PostgreSQL 22/22及分区回填CLI smoke均PASS。

## 边界

这是兼容迁移，不自动重写已有所有分钟数据，也不删除旧表。历史数据只有在DB所有者确认目标库并执行CLI的预览/应用后才批量复制；旧表保留，所以迁移期间会有历史行双份存储。活动/正式数据库未运行迁移。此验证不构成大规模容量、存储压缩、备份恢复或人工验收证据。
