# W4/V2.5 CSV 流式解析器错误容量复验

日期：2026-10-01（Asia/Shanghai）

执行 `pnpm --filter @stockquant/market-data-service minute-csv:error-capacity-smoke`，退出码0。隔离子进程分别流式生成并解析100,000行重复键与100,000行OHLC无效CSV，不保留Bar，仅累计诊断；两类均全部拒绝，错误码分别准确为`DUPLICATE_CONFLICT`和`OHLC_INVALID`。重复输入峰值RSS 121,307,136字节、718 ms；OHLC输入172,081,152字节、825 ms；均低于脚本512 MiB预算。每个输入在进程内分500行块生成，解析写入batch限制1,000。

该烟测只验证解析器内存/错误收集，不经过HTTP、数据库、上传配额或发布队列；不证明有效数据容量、真实源许可、分钟市场容量、Ubuntu或阶段验收。无外部服务调用。
