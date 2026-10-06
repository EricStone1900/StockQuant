# W7 V3.3 PostgreSQL 队列分页容量探针

日期：2026-10-01  
结果：PASS（仅隔离测试库内Runner队列读取，合成规模最高50,000行/TestRun）。

命令：`RESEARCH_AUTOMATION_DATABASE_URL=postgresql://research_automation@127.0.0.1:5433/research_automation_test pnpm --filter @stockquant/research-automation-service v33:queue-capacity-probe`。

脚本在专用`research_automation_test`中为5个随机TestRun插入100、1,000、5,000、10,000、50,000个合成Job（合计66,100行）；在首/中/尾页以100行分页重复20次offset与keyset cursor读取并断言精确结果/隔离；另以4和8个并发**只读请求**各执行10轮，记录请求P50/P95/最大延迟与PostgreSQL `EXPLAIN ANALYZE BUFFERS`执行计划。结束时删除精确随机TestRun行并核实剩余0。

有代表性的结果：

| 单TestRun行数/位置 | offset应用P95 | offset DB执行/计划 | cursor应用P95 | cursor DB执行/计划 |
|---|---:|---|---:|---|
| 5,000 / 尾页 | 3.187 ms | 1.224 ms，索引扫描5,000行 | 2.163 ms | 0.045 ms，索引扫描100行 |
| 10,000 / 尾页 | 17.610 ms | 15.295 ms，并行Seq Scan + Sort | 2.874 ms | 0.063 ms，索引扫描100行 |
| 50,000 / 中页 | 9.884 ms | 5.760 ms，索引扫描25,050行 | 3.461 ms | 0.050 ms，索引扫描100行 |
| 50,000 / 尾页 | 14.346 ms | 15.383 ms，索引扫描50,000行 | 2.746 ms | 0.054 ms，索引扫描100行 |

4/8个并发数据库读请求的整体请求P95在各个规模均低于7.1 ms；并发4的最大P95为5.963 ms，并发8最大P95为7.084 ms。用户Web队列已使用keyset cursor；该实测支持深页优先使用此路径，offset历史接口仍保留用于兼容。

范围限制：读扇出不是Runner执行并发，探针没有运行Experiment轮次/模型、Paper或市场采集；未测CPU峰值、RSS/内存、磁盘容量/IO、费用、Ubuntu、真实生产表分布或持续时间，也不证明业务Run容量。只反映Mac本机测试PostgreSQL和此版本索引/查询的热缓存微基准；不能推导生产吞吐。无模型、网络、券商或订单调用。随后完整V3.3 code suite（受控本机回环权限）退出0，包含此探针、双轮次隔离Runner恢复smoke、Research 169单测/21集成、Platform 101单测/3集成及Web 3 E2E；最终机器摘要仍标记业务工作流/阶段预算/Paper/业务与人工验收未完成。

此处固定的只读数据库输出与完整时间序列如需保留，需重新运行时在调用端另行存档；本报告仅摘录当次控制台的关键观测。代码/结果边界与退出条件见[完整交付计划](../../docs/plans/2026-09-30-complete-delivery-plan.md)。
