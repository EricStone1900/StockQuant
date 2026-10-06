# W1 V2.2 分钟数据跨服务 HTTP/Chromium 增量

日期：2026-10-01。

`pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke` 在隔离本地PostgreSQL、真实Market Data与Platform进程、Vite及Chromium中退出0。端到端路径为浏览器→Platform→Market Data→PostgreSQL。浏览器完成normal和`uploaded-csv` TestRun；后者断言`V2.2-CSV-UPLOAD-001`通过，同一ID的CLI `--check-only`退出0且不改变事实。

烟测实测CSV语义预览/导入、CSV与Parquet上传创建/进度/分块/preview/finalize、导入详情与Bar分页读取；新增取消用例验证owner得到`CANCELLED`、异owner得到403。匿名导入详情401、owner读取200、异owner读取403。数据库行与服务响应的import版本、SHA、行数一致；三份冻结输入共8640根5m BAR_END样本，Parquet独立导入2行。FakeBroker开启，外部行情调用0。

固定结果/testRunId/Hash及验证范围见[机器报告](2026-10-01-w1-v22-minute-api-http-e2e.json)。脚本随机创建的精确隔离数据库在finally中删除并查询无残留，TestRun和测试导入行亦按精确ID清理。许可证为UNCONFIRMED，`researchUseAllowed=false`。这补强跨服务软件验收，不代表数据源许可、Ubuntu、活动发布、容量或本轮新增人工签署。

一次烟测脚本修改初跑时在浏览器启动前发现测试代码重复读取响应体；修复为只读取一次JSON后重跑全套，最终退出0，保留该失败原因。
