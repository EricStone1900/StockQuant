# P6 Parquet 分钟导入工程切片（2026-09-26）

## 结果

Parquet 已接入 V2.2 现有分块上传路径，包含 Web 选取文件、字段映射、平台/市场服务传递、预览、校验、PostgreSQL 原子发布、上传来源 TestRun 及同一 TestRun 的 CLI `--check-only`。Fixture 是合成数据；它只验证工程链路，不证明任何市场数据源或交易用途。

## 固定输入

- Fixture：`fixtures/v2/v2.2-parquet-smoke/minute-upload.parquet`
- Manifest：同目录 `manifest.json`
- 大小：2,436 bytes；2 条 MinuteBar
- SHA-256：`1758a42c2dee7c86160bf394b46804b8449d875a867f0f4f52a312e3f41d9744`
- 非标准列映射 Fixture：`fixtures/v2/v2.2-parquet-smoke-mapped/minute-upload.parquet`；Manifest 同目录；列为`instrument/bar_time/o/h/l/c/qty_shares/turnover_cny`；SHA-256：`f494f73db4d972d2a8a569766fb8b291ca6dee0d91d514ade96172c548cf2bbb`
- 使用 PyArrow 18.1.0，Adapter 依赖由 `uv.lock`、`requirements.lock` 锁定。

## 实现约束

Python Adapter 用 PyArrow record batches 以最多 1,000 行读取，投影所需列并输出 JSONL；Node 以 1,000 条批次转成已有 CSV 质量校验/事务暂存接口。原始二进制先流式写到权限 0600 的随机临时目录，同时计算源文件 SHA；限制为 64 MiB、100,000 行。拒绝重复/缺失列、空文件、超限文件、时区感知时间戳和不支持的 Arrow 标量；全部完成后删除临时目录。Web 对 Parquet 提供八个目标字段的源列名输入，服务验证每个源列唯一且存在；映射持久化在`import_manifest`。原上传映射、单位、时区和许可清单仍持久保存。

## 验证证据

- Adapter Parquet 测试 3/3；Ruff、mypy 通过。
- Market Data 服务单测 49/49；类型检查/构建通过。
- `pnpm contracts:check`、`pnpm fixtures:check` 通过。
- `pnpm verify:stage -- --stage V2.2 --suite code`：全部门禁通过。构建、lint、typecheck、工作区单测；Trade Execution/Portfolio 隔离PG与HTTP smoke；契约、58项Python Adapter、94项运维测试及Market Data隔离PG 21/21均通过。沙箱内首次运行无法连接loopback PG并按合同退出2；授权访问本机隔离PG重跑后通过。真实浏览器上传 smoke 独立执行并记录在下项。
- `pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke`：真实 Chromium/Vite、平台 API、Market Data 服务及两套随机隔离 PostgreSQL。CSV 回归上传 16,000 行成功；Parquet 浏览器上传、预览 2/2、Finalize 发布 2/2；DB 证实 owner、COMPLETED、PUBLISHED、manifest 格式、源文件 SHA 与行数；页面建立 Parquet `uploaded-csv` TestRun 后，同一 `--check-only` CLI 退出 0；异主读取403；外部调用/券商调用为0。之前的标准列映射运行ID `6d7d0d52-adbb-47fe-bc1d-651437836ef3`，upload ID `12728c50-0dfa-408c-844e-819f25b90468`；新增映射运行TestRun `9b537a42-f70f-498f-bdde-8bfbd75cf3aa`、upload `dc6251ab-35a0-49a7-8465-e397902a96c0`，PG `import_manifest.mapping` 与页面输入逐字段相同。烟测退出时移除本轮临时数据库及测试记录。
- `docker build -f services/market-data-service/Dockerfile -t stockquant-market-data-parquet-smoke:local .` 成功；ARM64 Docker Desktop 构建。容器内用相同 Fixture 调用 `python3 -m market_data_adapter.parquet_to_jsonl` 得到两条行记录和 `COMPLETED`。镜像 SHA-256：`ac8a5eb8583ca15cbaa02cd52fb1f4e26368c3afabacc25adc2c1e9c8bc0aa42`。该镜像构建/解析验证不等同于容器化全栈 E2E。

## 未关闭项

P6 仍未完成：物理日期分区、大规模容量/资源压测、坏样本/恢复完整阶段场景与人工验收。Parquet映射现覆盖源字段输入、缺列/重复映射拒绝及持久manifest，尚无自动列探测。V2.2 `99-acceptance.md` 的人工签署和原阶段状态未改写。该证据不增加真实来源观察天数，也不证明数据质量适用于策略研究。
