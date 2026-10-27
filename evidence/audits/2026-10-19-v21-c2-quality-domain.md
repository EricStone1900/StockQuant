# V2.1 C2-C Market Monitor质量领域规则增量

日期：2026-10-19（Asia/Shanghai）  
范围：Market Monitor首个纯领域质量投影；不代表完成持久化消费者或C2-C。  
结论：**领域规则已实现并通过4项标准库测试；服务接线和独立日线仍待实现。**

## 行为

- 对预期证券集合和Market Data观测引用计算fresh数量、覆盖率及最大有效age。
- 缺失证券产生`QUOTE_MISSING`；陈旧观测产生`QUOTE_STALE`；未知状态/时间产生`QUOTE_TIME_UNKNOWN`。STALE/UNKNOWN不计入fresh覆盖。
- 空集合或零条fresh观测返回`UNAVAILABLE`；有fresh但覆盖不全返回`PARTIAL`；全量fresh才返回`READY`。
- 重复预期证券、重复观测拒绝，避免静默去重或任意选择一条引用。
- 函数为纯计算，不获取或复制报价、不访问时钟、不写库、不调用模型、不创建订单。

## 验证

- `UV_CACHE_DIR=/tmp/stockquant-market-monitor-uv uv lock --offline`：PASS。
- `UV_CACHE_DIR=/tmp/stockquant-market-monitor-uv uv sync --frozen --offline`：PASS，无运行依赖。
- `PYTHONPATH=src python3 -m unittest discover -s tests/unit -v`（工作目录`services/market-monitor-service`）：4/4 PASS，使用系统Python 3.9。

## 尚未实现

没有Market Monitor HTTP/服务身份、调度消费者、PostgreSQL迁移或持久质量结果；Market Data只读报价引用尚未由Monitor服务调用。没有正式Web/同Run验收。没有独立DAILY_BAR来源、完成标记、数据版本/`availableAt`校验、幂等任务或恢复流程。V2.1的executor策略仍保持关闭。以上未完成项继续阻止C2-C及C2通过。
