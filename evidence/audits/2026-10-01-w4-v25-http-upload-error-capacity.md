# W4/V2.5 HTTP 上传错误容量复验

日期：2026-10-01（Asia/Shanghai）

执行 `pnpm --filter @stockquant/market-data-service minute-upload:error-capacity-http-smoke`，最终扩展版退出码 0。三个独立随机隔离 PostgreSQL 数据库分别经实际 Market Data HTTP 服务分块上传 100,000 行合成 CSV：重复键（11块）、OHLC无效（10块）、有效（11块）。并发预览和Finalize均恰有一个请求获准，另一个按预期返回busy。两个错误输入分别得到100,000个准确错误、持久REJECTED记录、幂等重试和0个已发布Bar；有效输入预览接受100,000/100,000行、零错误并只返回100行展示样本，Finalize将100,000行持久化到分区表，重复重试幂等。

最终完整三场景运行（加入持久键/证券覆盖断言后）的重复冲突文件5,400,055字节，HTTP服务峰值RSS 414,944 KiB（预览310,128 KiB）；无效OHLC文件5,000,055字节，峰值537,584 KiB（预览365,184 KiB）；有效CSV文件5,400,055字节，峰值307,664 KiB（预览236,704 KiB）。三者均低于768 MiB进程阈值。Mac本机没有可读取的cgroup `memory.peak`，该项不可用。有效记录来源SHA-256为`59d386a0d75ecff790337160f408f6b94c02e033638fa75fcddf75448ad4fa8a`。

有效场景首轮误要求Finalization返回422，实际发布响应201，修正断言后最终三场景通过；其后再增加直接数据库断言，验证有效输入恰有500只证券×每只200根、共5日、100,000个唯一证券/时间键。最终完整运行退出码0。该证据覆盖100,000行合成CSV的HTTP解析/分批持久写入和错误背压边界，不证明全市场分钟容量、真实CSV来源/许可、Ubuntu或长期生产队列观察。输入研究许可保持UNCONFIRMED且`researchUseAllowed=false`。

测试脚本变更后再次执行 `pnpm verify:stage -- --stage V2.5 --suite code`，完整退出码0；合同/Fixture、全仓build/lint/typecheck/unit、Market Data Adapter 63项、隔离HTTP/PostgreSQL与服务身份检查、Ops套件、Market Data PostgreSQL集成23/23及分区回填smoke均通过。普通沙箱首次对Qlib Worker localhost bind的EPERM历史在更早执行记录中保留；本次受控loopback复跑完整通过。该套件不改变阶段整体门禁。
