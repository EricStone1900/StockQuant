# W9 V2.3 Qlib Fixture TestRun 后门禁复核

日期：2026-10-01（Asia/Shanghai）。基于新增的V2.3 owner-scoped Qlib Fixture TestRun 工程切片，重新执行三版版本门禁和证据引用检查。

- `pnpm verify:version -- --version V1/V2/V3`逐版执行均为`INCOMPLETE`、退出码2；V1.1未关闭，V2.3/V2.4/V2.5未关闭，V3.1–V3.4仍为`NOT_RUN`。三版缺失/意外验收ID均为0。
- `pnpm verify:version:evidence -- --version V1/V2/V3`均PASS：最终复核引用数17/109/98，已链接Hash Manifest数1/11/13，校验条目2/11/13，无缺失或Hash失败；V2清单还验证了导出目录内相对路径Manifest的单一JSON载荷。
- 最新全量`pnpm verify:stage -- --stage V2.3 --suite code`退出0；包含baseline、构建/lint/typecheck、服务单测与集成、Python Adapter（63项）、运维脚本（155项）、服务身份与分钟数据集成，以及隔离Web/Platform/Quant/Qlib HTTP链、同Run owner读取、CLI `--check-only`只读、脱敏证据导出和清理检查。最新TestRun为`acc4d80a-e3bb-4ad1-987a-9334d59c0203`，导出Manifest SHA-256为`3d377bc224f363b3e27c18b1ef8a0f39b3dbc93a0cc017eb4e6c2e55605d3f62`；仍未取得新增研究能力的用户人工验收。这不代表来源许可、真实数据/PIT、研究模型独立验证或Ubuntu交付。
- 用户已确认`NO_TRADE`且暂无数据源授权；不启用采集或Paper。详细JSON见[门禁与引用结果](./2026-10-01-w9-v23-qlib-testrun-refresh.json)，内容Hash见[Manifest](./2026-10-01-w9-v23-qlib-testrun-refresh.sha256)。
