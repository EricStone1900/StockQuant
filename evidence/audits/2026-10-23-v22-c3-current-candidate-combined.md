# V2.2 / C3 当前候选统一场景与恢复复验

日期：2026-10-23。范围仅为 V2.2 分钟导入/校验软件闭环；使用合成或本地冻结输入、隔离 PostgreSQL 和 Fake 模式，不连接外部行情源。自动通过不代表行情事实或来源许可；项目所有者随后已对绑定此候选的本地软件闭环完成人工验收，见[人工验收记录](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)。

## 当前候选统一 TestRun

执行入口：`pnpm verify:stage -- --stage V2.2 --suite code`，最终退出码 0。完整套件包括 contracts/fixtures、服务单元与集成检查、Market Data HTTP/PG smoke、Chromium Web smoke、CLI 同 Run 核验和证据导出。一次性容器、网络和随机测试数据库按 wrapper 清理，最终 `activeServices=NOT_CONNECTED`。

正式 V2.2 页上传后，将两个独立 DataVersion 纳入同一 `uploaded-csv` TestRun。数据版本共享 RAW/市场/频率/时区/单位语义，副本通过独立来源元数据发布，不复用同一 DataVersion：

- TestRun：`75300ba9-0807-48f5-80dc-a6cadce18b2c`
- Evidence Manifest SHA-256：`b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`
- TestRun 证据：[evidence.json](../local/V2.2/75300ba9-0807-48f5-80dc-a6cadce18b2c/evidence.json)，[manifest.sha256](../local/V2.2/75300ba9-0807-48f5-80dc-a6cadce18b2c/manifest.sha256)
- 上传 DataVersion：`v2.2-import-ad146f08ab3f`；比较版本：`v2.2-import-61d52db62602`
- 本次完整套件实际动态地址：Web `http://127.0.0.1:49180/acceptance/v2/v2.2`、Platform `http://127.0.0.1:49179`、Market Data `http://127.0.0.1:49178`。smoke结束后服务已退出；后续复跑时以新日志端口为准。
- 同 Run CLI `--check-only` 退出码 0；TestRun assertions：
  - `V2.2-CSV-UPLOAD-001` PASS
  - `V2.2-CANDIDATE-QUERY-001` PASS
  - `V2.2-CANDIDATE-COVERAGE-001` PASS
  - `V2.2-CANDIDATE-COMPARE-001` PASS
  - `V2.2-CANDIDATE-AGGREGATE-001` PASS

分钟/日线聚合读取指定证券和交易日的 160 根合成 Bar，六项 OHLCV/成交额与操作者输入精确匹配。参考值保留 `OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED`，聚合不判定覆盖完整性。独立覆盖报告为 `INCOMPLETE`：期望240根、有效160根、未知80根、已知缺失0根；对应覆盖分类断言PASS表示报告被正确生成/记录，不表示数据完整。匿名详情/Bar读取返回 401，跨用户读取返回 403。V2.2 其余 normal、rejection、recovery Web TestRun 及同 Run CLI/导出亦通过。

## 当前候选恢复复验

| 路径 | 结果 | 固定证据 |
|---|---|---|
| `pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke` | PASS；16,000 行、848,055 字节；服务重启后续传；持久 `FINALIZING` 在第二次服务重启后恢复发布；缺块拒绝、解析失败回滚、异主拒绝、重复块幂等和取消释放配额均通过。 | upload `a79f0b69-43b7-49ca-985a-de2dcce884ca`；SHA-256 `8a1aa25c16e677629955cefc9f691d5282de1782cfe1b97a7a8ee074b68368b8`；DataVersion `v2.2-import-0214ead759d9`。 |
| `pnpm --filter @stockquant/market-data-service minute-parquet:container-db-restart-smoke` | PASS；100,000 行、6,914,068 字节、14 块；PostgreSQL容器重启后已提交块保留，后续服务重启仍完成同一版本；研究用途关闭。 | upload `d89566e0-0b09-4a8b-a1c8-27b82ce49aca`；SHA-256 `dad97fa47d9b377fa783db11197deeda5e2fb71b0caabe24b2d05e39fee2eae2`；DataVersion `v2.2-import-6fc65079b9ef`；镜像 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。 |

两条脚本均精确清理测试容器/网络/数据库。完整阶段 code suite 最终退出 0；其中初次执行发现 PostgreSQL 分页集成测试仍期待旧 Bar 结构，已将输入预期更新为明确的 `UNKNOWN/null` 上下文，并以一次性 PostgreSQL 重跑该文件 30/30 通过，再执行完整套件通过。

## 仍待完成

- 权威逐 Bar 交易状态、停牌和涨跌停价来源事实；没有来源时合同继续保存 `UNKNOWN/null`。
- 历史输入来源许可及`HISTORICAL_RESEARCH`仍关闭；本次没有正向历史研究回放。
- 参考日线由 smoke 操作者提供，未独立核验，不能作为外部行情事实。
- 当前TestRun中`researchUseAllowed=true`对应本地生成的合成CSV，不代表任何外部历史来源获得授权；外部来源请求数为0。

因此 C3/V2.2 的当前本地软件路径、恢复复验及项目所有者人工验收均有候选绑定证据；阶段结论仍为 `PARTIALLY_IMPLEMENTED`，待处理事实/用途限制项及正向历史研究回放门禁。
