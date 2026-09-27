# P6 Parquet 10 万行 HTTP 容量验证（2026-09-26）

## 结果

新增可重复的 Market Data Parquet HTTP 容量 smoke，完整经过随机隔离 PostgreSQL、真实本地 Market Data 进程、分块上传、PyArrow 解析、预览、Finalization 原子发布。100,000 行确定性合成 5 分钟数据通过；同一 upload 重复 Finalize 幂等返回。该输入仅 289,616 bytes，属于高压缩合成数据，不能据此推算真实行情文件压缩比或市场规模吞吐。

## 固定输入与观测

- 输入由 `services/market-data-service/scripts/generate-parquet-capacity-fixture.py` 临时生成：500 只合成证券、5 个交易日、每证券每日 40 根 5 分钟线，共100,000行。
- SHA-256：`0c5abdfcc0f4939af34941c11a479743d3ed95ce5e58173aa63223037f11f1a5`；源文件289,616 bytes，单个小于512 KiB的末块上传。容量smoke现与服务合同统一使用512 KiB分块大小。
- Market Data `preview`：100,000 总行、100,000 accepted、0 errors；展示仅保留100条且标记截断。最终复验耗时1,335ms。
- `finalize`：100,000条发布，最终复验耗时3,602ms；完整源SHA与持久化记录一致。重复 finalize 返回同版本且 `idempotent=true`。
- PostgreSQL：100,000 行、5个日分区日，最终隔离数据库大小72,626,659 bytes。独立检查首条证券、时间和OHLC值；Manifest `researchUseAllowed=false`。
- Market Data 进程峰值RSS：258,160 KiB。宿主 macOS arm64；不是Docker或Ubuntu测量。
- 没有外部数据、模型或券商调用。最终测试库`sq_md_parquet_6491d8b841fd46659d5e63bb0d63fd14`在finally清理中DROP并查询确认不存在；生成文件及目录同步删除。

同次隔离服务中上传确定性损坏输入：Parquet Preview 两次均返回`PARQUET_PARSE_REJECTED`（依照服务的1秒429忙闸门等待后重试），随后取消为`CANCELLED`。数据库没有对应导入记录；前述有效版本仍恰好100,000行，未受影响。解析失败发生在Import创建之前，因此没有伪造一个REJECTED导入记录。

## Linux/ARM64 容器复验

- 从当前工作树构建镜像：`sha256:74063f3866fcc975b8c41dfd8e7ee7dae25cabe90b4e76e5dfef12d657b39b0d`。Docker Desktop Linux/ARM64；容器限制2 GiB内存、2 CPU、128 PID。
- 在单独随机Docker network中启动一次性`postgres:16.9-alpine`，本地临时端口只绑定127.0.0.1。Market Data容器只连接该临时数据库；输入Hash、100,000发布行、5日、幂等、损坏输入两次拒绝/取消且无部分导入均通过。
- 容器内Preview 1,950ms、Finalize 4,012ms；隔离DB 72,561,123 bytes；每100ms读取服务进程`/proc/1/status`所得RSS观察峰值178,995 KiB（采样观察值，不是cgroup历史峰值）。输入 SHA 与 macOS 相同。
- 运行结束移除精确命名的应用/PG容器、网络与临时构建镜像；隔离PG内的随机测试数据库由HTTP smoke创建并DROP。清理后无`sq-md-parquet-*`容器、测试网络或临时镜像，活动`stockquant-v12-*`容器仍健康且未重启。
- 首次执行在容器解析阶段发现最终Docker runtime层虽安装PyArrow，却漏复制`parquet_to_jsonl.py` helper。Dockerfile现从锁定的Adapter源码阶段复制该helper到Node运行层所需路径；本次成功的镜像验证了修复。此前只在容器里直接调用Adapter模块的测试未覆盖HTTP子进程文件路径。

## 重现与回归

- `pnpm --filter @stockquant/market-data-service minute-parquet:capacity-http-smoke`：PASS（随机本地 HTTP/PG 数据库）。
- `pnpm --filter @stockquant/market-data-service test`：13 files / 57 tests PASS。
- `UV_CACHE_DIR=/private/tmp/stockquant-uv-cache uv run --directory services/market-data-adapter --locked pytest -q`：58 PASS。
- `pnpm contracts:check`、`pnpm fixtures:check`、Node smoke 脚本语法和 Market Data TypeScript build：PASS。
- `pnpm --filter @stockquant/market-data-service minute-parquet:container-capacity-smoke`：PASS；从当前Dockerfile构建ARM64镜像，并覆盖同一正向/坏样本HTTP恢复链及容器资源限制。
- 修正Dockerfile和新增容器smoke后，完整`pnpm verify:stage -- --stage V2.2 --suite code`退出0：全仓build/lint/typecheck和单测通过、Trade Execution/Portfolio隔离PG持久化与鉴权/Outbox恢复通过、Python Adapter 58/58、运维94/94、Market Data隔离PG集成22/22、合同与Fixture检查通过。沙箱首次尝试因无权连接本机PG按合同退出2；同一命令在批准的本机隔离测试环境重跑通过。
- `pnpm --filter @stockquant/market-data-service minute-parquet:upload-restart-smoke`：PASS；14个持久分块的进程重启续传详见下节。
- `pnpm --filter @stockquant/market-data-service minute-parquet:compression-sensitivity-smoke`：见本审计补充结果；同一行集比较Zstandard、Snappy与无压缩的文件体积及完整HTTP时间。

脚本还没有把临时输入作为冻结数据或策略研究 Fixture；无需新增 Fixture manifest。许可为 UNCONFIRMED，研究用途保持关闭。

## Parquet 上传进程重启续传

使用未压缩模式生成6,914,068 bytes/100,000行输入，分为14个512 KiB块，SHA-256为`dad97fa47d9b377fa783db11197deeda5e2fb71b0caabe24b2d05e39fee2eae2`。真实Market Data HTTP进程持久化首块后停止；重启后数据库状态恢复出首块字节数和索引，缺块预览返回409。重复上传首块幂等，错误owner读取拒绝；补齐剩余13块后Preview接受100,000行且无错误，Finalize按Hash发布100,000行。第二次重启后同一upload仍为COMPLETED且版本一致。随机测试数据库经脚本DROP并查询确认不存在，生成文件清除；许可UNCONFIRMED、研究用途false。验证服务进程重启与块级断点续传，不覆盖主机掉电、容器重建或PostgreSQL故障恢复。

## Parquet 编码体积与处理时间敏感度

固定同一个确定性100,000行数据集，只更改Parquet压缩编码；每个case经相同本机Market Data HTTP Preview/Finalize链和独立随机PG库，结束后删除文件与数据库。

| 编码 | Parquet bytes | 对未压缩体积比 | 上传 ms | Preview ms | Finalize ms | 100ms采样RSS峰值 KiB |
|---|---:|---:|---:|---:|---:|---:|
| Zstandard | 289,616 | 23.87× | 38 | 1,351 | 3,592 | 270,384 |
| Snappy | 731,589 | 9.45× | 51 | 1,309 | 3,578 | 254,096 |
| 无压缩 | 6,914,068 | 1.00× | 242 | 1,438 | 3,615 | 306,944 |

所有编码均发布并核对100,000行和源Hash。各独立数据库最终总大小分别为72,626,659、72,790,499及73,028,067 bytes；它们包括数据库基础开销、Schema、索引与导入元数据，不应将差异解释为Parquet编码导致的PG业务数据空间差异。较大的未压缩输入显著增加传输体积/上传时间，而在本机实验中Preview/Finalize变化较小。该样本值高度可压缩且字段重复度高，不能外推到真实源、不同row group、压缩等级、网络带宽或共享PG生产成本。比较入口为`pnpm --filter @stockquant/market-data-service minute-parquet:compression-sensitivity-smoke`。

## 范围

此项关闭“Parquet无10万行HTTP发布容量实测”、坏样本拒绝/取消恢复、单Market Data容器资源限制下正向导入、服务进程级分块续传，以及两只受限Market Data Linux/ARM64容器连接同一隔离PostgreSQL时的Preview/Finalize跨进程闸门验证；未完成主机掉电/容器重建/PostgreSQL故障恢复、真实压缩率敏感度、共享PostgreSQL生产成本余量、原生Ubuntu和人工验收。它与现有1.44M行CSV/直接仓储层容量及Docker CSV坏数据测试的证据边界不同；不据此宣告P6或V2.2完成。

## Linux/ARM64 双实例跨进程并发复验（2026-09-26）

- 命令：`pnpm --filter @stockquant/market-data-service minute-parquet:container-capacity-smoke`。由脚本构建当前工作树镜像`sha256:648ba43fbf97caf6e0d020be1175ad2a434538bf8d29589fb3921467097b0d35`，并在随机隔离网络、一次性PostgreSQL与两只独立Market Data容器中执行；每只容器限制2GiB RAM、2 CPU、128 PID。
- 使用相同100,000行、289,616-byte Zstandard输入（SHA-256与上文一致），完整HTTP分块上传耗时32ms；Preview竞争及释放后重试共4,773ms，Finalize竞争及释放后幂等重试共5,008ms。两只服务实例同时Preview/Finalize时，各自恰有一个请求获准，另一请求均为429、`Retry-After: 1`、`MINUTE_IMPORT_BUSY`；等待锁释放后另一实例可继续，重复Finalize返回同一版本且`idempotent=true`。
- 跨实例Finalize最终原子发布100,000行、5个交易日，源Hash一致，数据库大小72,561,123 bytes；损坏Parquet两次拒绝后取消成功，没有产生导入记录或部分Bar，也不影响有效发布。两只服务容器每100ms通过`/proc/1/status`采样的进程RSS峰值为180,812 KiB（实例间最大值，不是两实例总和或cgroup峰值）。无外部、模型或券商调用。
- 完成后精确临时应用/peer/PG容器、隔离网络、构建镜像和随机数据库全部由finally清理；运行后的Docker清点无`sq-md-parquet-*`容器、网络或该smoke镜像。此结果验证单机Docker Linux/ARM64和隔离PG的跨进程协调，不代表多主机/网络分区、真实文件负载或共享PG生产容量余量。
