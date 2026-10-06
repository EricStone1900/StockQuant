# W4 V2.3 / V2.5 当前代码回归

时间：2026-10-03 08:27–08:35 Asia/Shanghai。两次均为隔离代码验证，不接触运行中的 StockQuant 服务。沙箱首次运行V2.3时 Qlib Worker 临时 loopback bind 被 EPERM 拒绝；保留该失败，并在受控本机权限下重跑完整命令。

## V2.3

`pnpm verify:stage -- --stage V2.3 --suite code`完成当前代码门禁、全仓质量检查、隔离数据库与身份HTTP检查、Market Data集成、Qlib运行时及Platform→Quant→Qlib完整Fixture TestRun。TestRun `12424631-19bd-4bdf-b5f4-6dfd948d751c`，`codeVersion=sha256:759a552c7c8b7ab555afa9d113ab135036e4c8ac18f2d6ccb49e43d56d47a2a2`：120行确定性合成输入、Qlib 0.9.6 / LightGBM 4.7.0、24个有限测试预测、时间因果检查PASS、共享Artifact持久化与owner范围访问PASS、CLI check-only无写入；`independentValidation=NOT_RUN`、`dataMode=FIXTURE`、`externalSources=0`、`brokerMode=FAKE`。隔离容器、临时数据库与共享内容目录均报告清理PASS。原始证据：[TestRun](../local/V2.3/12424631-19bd-4bdf-b5f4-6dfd948d751c/evidence.json)、[Artifact](../local/V2.3/12424631-19bd-4bdf-b5f4-6dfd948d751c/qlib-fixture-artifact.json)、[Manifest](../local/V2.3/12424631-19bd-4bdf-b5f4-6dfd948d751c/manifest.sha256)。

## V2.5

`pnpm verify:stage -- --stage V2.5 --suite code`完成当前代码门禁、build/lint/typecheck/unit、合同/Fixture、隔离服务与数据库验证，并运行锁定Linux/arm64 Market Data容器的100,000行 Parquet导入/查询容量探针。合成输入为500证券×200个5分钟Bar、5个交易日，原文件289,616 bytes；100,000行全量写入与分页查询唯一性核验通过（100页×1,000行、100,000 unique）；40行过滤查询2页；两实例并发busy、幂等、损坏文件拒绝及零行发布/取消通过。临时PostgreSQL数据占72,561,123 bytes，服务峰值RSS 199,676 KiB，容器上限2 GiB/2 CPU/128 PIDs；Provider、模型和Broker外呼均为0。该项是Mac Docker Linux/arm64上的合成数据容量切片，不证明全市场分钟容量、Ubuntu x86_64、真实来源授权、长期稳定性或60日备用源。

两套代码回归没有行情、Provider、模型或真实券商调用；FakeBroker路径仅限模拟测试。它们不改变NO_TRADE、无数据源授权、真实市场数据/PIT、V2.4观察或人工验收状态。V2.3新增研究能力人工验收仍待用户实际确认。
