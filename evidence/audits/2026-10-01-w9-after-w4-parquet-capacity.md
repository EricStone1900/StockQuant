# W9/V2.5 Parquet 容量增量门禁复核

日期：2026-10-01（Asia/Shanghai）

`pnpm verify:stage -- --stage V2.5 --suite code` 受控本机权限运行退出0；完整套件包含合同/Fixture、全仓构建/lint/typecheck/unit、Python Adapter 63项、Market Data PostgreSQL集成23项、运维测试及Linux/arm64双实例Parquet 100,000行上传/发布/分页容量烟测。普通沙箱首轮在Qlib Worker测试创建临时localhost socket时PermissionError；同一命令受控重跑通过。`pnpm baseline:check`通过，Markdown链接1728条、合同/Fixture检查无错误。

版本门禁按设计继续返回不完整：V1 `INCOMPLETE`（exit 2，未决V1.1）；V2 `INCOMPLETE`（exit 2，未决V2.3、V2.4、V2.5）；V3 `INCOMPLETE`（exit 2，V3.1–V3.4未运行/未验收）。Acceptance ID缺失/意外均为0。证据引用核验通过：V1 28条/2个Manifest/3个载荷项，V2 131条/17个Manifest/18个载荷项，V3 113条/19个Manifest/19个载荷项；缺失引用和Hash失败均0。

本轮只补强V2.5受支持Parquet单文件上限下的隔离工程证据。NO_TRADE及无数据源授权保持；真实市场研究/PIT、第二源覆盖、长期观察、Ubuntu x86_64交付及新增人工签署仍未完成。详见[容量边界审计](2026-10-01-w4-v25-parquet-capacity-limit.md)。
