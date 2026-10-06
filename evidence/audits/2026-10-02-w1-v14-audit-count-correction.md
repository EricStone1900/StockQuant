# V1.4 隔离审计数量字段更正

2026-10-02。保留此前审计 `2026-10-02-w1-v14-quant-configurable-web-b8e877bba6beda93efc9` 原文件不变。该审计实际通过的隔离 PostgreSQL 查询断言了 `8:8:8`（BacktestRun、Manifest、结果Hash配对），但生成的 JSON 摘要把 `quantPersistence` 三个字段静态写成 6，故聚合字段与同一报告中的数据库断言相矛盾。

已修正审计Harness为从SQL结果动态生成数量，并在最终隔离运行中验证8/8/8。后续权威报告为 [`a832feee4e1399f6a400` 完整V1.4审计](2026-10-02-w1-v14-quant-configurable-web-a832feee4e1399f6a400.md)：状态PASS、8个Quant BacktestRun、8个Manifest、8个结果Hash配对；8个TestRun Bundle均与该最终审计Hash绑定。此前报告仅作为更正前历史记录保留，不作为最终数量证据。

修正后的实际工作区Hash为 `sha256:94abb12ad7e9cf1a91e2f8ed9591e2533dd98ee9a28e31b4491e402f16a555bc`。活动服务、行情源、Provider、Paper和Broker调用均为0；隔离资源已清理；人工验收仍NOT_RUN。
