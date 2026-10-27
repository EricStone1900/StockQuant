# V2.2 / C3 缺口分类与恢复复验

日期：2026-10-21。范围：完成 C3 当前执行顺序中的缺Bar/停牌分类与导入中断恢复复验。结论：**这两项工程行为已完成自动验证；V2.2仍为PARTIALLY_IMPLEMENTED。** 本审计不授予数据许可、不核实用户提供来源是否权威，也不构成人工验收。

## 缺口分类

`buildCoverage` 对每个日历预期Bar生成独立状态：实际存在为`PRESENT`；没有逐Bar状态证据为`UNKNOWN`；有对应时段、明确`TRADING`状态和非空来源引用而Bar缺失时为`MISSING`；有明确`SUSPENDED`状态而Bar缺失时为`SUSPENDED`。只有`MISSING`生成可补数Gap，且Gap API拒绝没有来源引用的MISSING并把该引用持久化。停牌不生成补数任务。重复/冲突证据或无效引用按UNKNOWN处理并报告问题。

独立离线脚本`data-coverage.mjs`目前只有日历和Bar行，没有证券逐时段交易状态来源，因此把缺Bar全部报告为UNKNOWN，不将它们自动登记为MISSING。状态报告的来源引用目前只做结构和时间槽匹配，不检验外部来源权威性；没有真实停牌数据可用于本次正向核验。

验证：`pnpm --filter @stockquant/market-data-service test` 通过，29个文件/142项测试；`node --test scripts/data-coverage.test.mjs` 通过，12项测试；Market Data TypeScript build通过。测试覆盖UNKNOWN不生成补数、TRADING+引用生成MISSING、SUSPENDED单列、重复证据fail-closed，以及Gap API拒绝缺引用的MISSING。

## 中断与恢复

- CSV真实HTTP/隔离PostgreSQL smoke（包含持久FINALIZING状态后的进程重启恢复）：TestRun外的上传ID `3fd711d5-1ab1-4a16-aea3-cb034bad56a8`，输入848,055字节、SHA-256 `8a1aa25c16e677629955cefc9f691d5282de1782cfe1b97a7a8ee074b68368b8`。上传首个512 KiB分块后停止并重启Market Data进程，读取原分块、缺块预览拒绝、续传后将持久状态设为`FINALIZING`并再次停止/重启服务；恢复后的正式Finalize接口重新领取该状态并完成16,000行原子发布；重复分块幂等、解析失败释放Finalize状态且回滚临时批次、完成结果跨重启可分页读取均通过。DataVersion `v2.2-import-cc046cd1e99d`。运行使用本地精确随机测试数据库，脚本finally删除数据库。
- Parquet真实HTTP/隔离Linux ARM64 PostgreSQL smoke：唯一临时容器`sq-md-parquet-pg-restart-c2d5e1d8523c`，PostgreSQL镜像 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，loopback `127.0.0.1:55155`。上传第一个分块后重启PostgreSQL并重启服务，原分块仍在；续传14个分块、预览/发布100,000行成功；最终服务再次重启后仍读取同一完成版本。上传ID `90942eda-068e-4645-a489-58aaf5eb3001`，DataVersion `v2.2-import-8e1b807d0fd8`，源SHA-256 `dad97fa47d9b377fa783db11197deeda5e2fb71b0caabe24b2d05e39fee2eae2`。隔离容器由脚本finally精确移除。

两次smoke都只对明确的`MINUTE_IMPORT_BUSY`响应最多重试30次、每次间隔1秒；其他429/错误不会被掩盖。输入均为合成数据，没有外部行情请求。CSV烟测的回归等待修正见当前代码清单。

## 其他当前范围证据和限制

历史上下文目录与V2.3回放硬门禁的隔离Web烟测及V2.2完整代码套件基线记录于[C3基线复核](./2026-10-21-v22-c3-closeout.md)和[上下文门禁增量](./2026-10-21-v22-c3-history-context-gate.md)。历史研究授权默认关闭；实际来源正向回放仍阻断，不能拿合成/未授权归档数据替代。

V2.2阶段状态继续PARTIALLY_IMPLEMENTED，历史2026-09-09人工确认保留但不扩展到本候选。剩余事项：逐源HISTORICAL_RESEARCH用途决定及可验证实际上下文版本（若要真实数据研究）、状态证据来源权威性核查、人工Web/运维手册操作、新候选人工验收。自动构建/测试不修改humanAcceptance状态。

同日完整`pnpm verify:stage -- --stage V2.2 --suite code`重新执行退出0；包括基线/合同、全仓Build/Lint/Typecheck/Unit、隔离集成与V2.2 Chromium→Platform→Market Data smoke。最新V2.2 Web TestRun：normal `4145038b-00d2-44e4-a96b-8bbce742c3c4`（Manifest `0200cf75c30b849daa69dab8129f5ff8266e68209dd06f29ff5e04cfda6fb58d`）；rejection `6684d660-644d-4d85-bf6b-635266ee245f`（`1afe2de73ac565ad541dd70931199f86762f8086cd404116ba0a8ba5f1793b13`）；recovery `e74b5ab0-78d4-4a7a-ac1d-ce92cac73570`（`eda7034f0d06aa55fede7428beb0ed222c42d8b904545fb32bf42abc71479ab9`）；uploaded-csv `a245210e-4991-489b-803a-959582e8109a`（`b306fdb3eb3d5d709aa127117b672981997c8770d2526d8db976f630d9f9c45b`）。四个Run的CLI `--check-only`均exit 0并成功导出；失败授权/上下文的V2.3回放仍以422被挡在Run/Worker之前。隔离数据库/网络清理验证通过。

完整阶段代码套件exit 0后，仓储写入边界又增加了缺证据MISSING拒绝；该最终改动的Market Data单测142/142、build、隔离PostgreSQL integration 30/30重新通过。候选文件SHA清单见[candidate-files.sha256](./2026-10-21-v22-c3-gap-recovery/candidate-files.sha256)，只覆盖本轮C3相关文件，不代表整个工作树或Git提交。
