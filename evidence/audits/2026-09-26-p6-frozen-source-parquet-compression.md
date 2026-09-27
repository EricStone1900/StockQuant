# P6 冻结 BaoStock 分钟归档的 Parquet 编码测量（2026-09-26）

## 范围与来源

使用仓库中冻结的数据目录`data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1`。该归档Manifest标记`source=baostock`、`sourceMode=READ_ONLY`、`status=COMPLETED`，含500证券×60交易日×48根5分钟Bar，共1,440,000行。脚本逐文件核对500个源CSV的SHA-256、Manifest行数及列结构；Manifest SHA-256为`59e677807518ff37a4571494b66738b71f86fe9da270468e4e7ef3719cee90e3`，按证券代码与各文件Hash构造的数据集指纹为`3be6eca02e1db987229cca71112792f98b6a9a2306a6424a452530b9c5e5f265`。

此实验只把冻结CSV的九列原始字符串序列写成本地Parquet，再读回逐值比较；不是BaoStock提供的Parquet格式或供应商线上编码耗时。源Manifest没有明确许可证条款，本证据将许可保持`UNCONFIRMED`、`researchUseAllowed=false`，不支持研究策略或实盘结论。

## 文件体积与完整性结果

每份文件使用PyArrow 18.1.0、row group 65,536行、启用字典编码；所有格式共22个row group，并读回与源Arrow表逐列逐值相等。

| 文件 | bytes | 相对无压缩Parquet | CSV/Parquet体积比 | 写入 ms | 读回 ms | SHA-256 |
|---|---:|---:|---:|---:|---:|---|
| CSV源归档 | 127,914,445 | — | — | — | — | Manifest逐文件核对 |
| Parquet无压缩 | 46,147,572 | 1.000× | 2.772× | 376 | 258 | `119a7f5a3e910465c931d5a01556d3e48d9949835f19778ab8ab64f3b6f62f71` |
| Parquet Snappy | 27,715,267 | 1.665× | 4.615× | 426 | 29 | `228acf7d14b0b93a722779c5d1439e0677ad9dbe46057583e914acb6a8b00f07` |
| Parquet ZSTD | 21,325,068 | 2.164× | 5.998× | 465 | 28 | `b7fed7ce782f02df7413b12a25eb98fd89d3c4ddd2bade01ec686e7a17eb9ba3` |

源CSV读取和Hash核验耗时570ms；Python macOS ARM64/Arrow工具环境。Parquet产物位于随机系统临时目录，由`TemporaryDirectory`自动删除。冻结归档和活动容器未改动。时间为本机一次运行观测，不能外推服务端HTTP、Linux/Ubuntu、冷热缓存、网络或不同row-group/列选择。

## 重现

```sh
services/market-data-adapter/.venv/bin/python scripts/benchmark-frozen-baostock-parquet.py
```

脚本要求冻结500证券归档，验证每个源文件的manifest SHA/行数和安全相对路径；之后生成NONE/SNAPPY/ZSTD三种临时文件、做精确Arrow读回验证并打印Manifest Hash、数据集指纹、体积、Hash和单次耗时。执行不联网、不访问PostgreSQL、不调用模型或券商，也不触碰活动采集进程。

此测量补充真实冻结样本内容上的编码体积敏感度；它不解除数据许可门禁，也不代替Parquet HTTP导入的受限容器/跨实例压力、真实数据生产源输入、共享PostgreSQL容量余量或Ubuntu验证。P6与V2.2仍未完成。
