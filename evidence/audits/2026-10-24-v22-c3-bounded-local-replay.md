# C3 受限本地历史回放复核

日期：2026-10-24。范围是所有者批准的一次性、本地、非联网验证，不扩大 BaoStock 的收集或研究许可。

## 已执行

- 决定：[OD-008 受限决定](./2026-10-24-v22-c3-historical-research-decision.json)，SHA-256 `c142e451ad52f378c00caaf3b8830090864e32a63e2864e2af1f7d6e7efcca11`。
- 输入：`data/local/baostock-c3-context-2024-01-02-2024-01-08-v1/`，Manifest SHA-256 `fa5f221aa17888d2b7b888a0f6991e041c2793e8ecb265ec894d910a074c0d73`；3只证券、5个交易日、720根 RAW 5分钟Bar。
- 隔离 Docker PostgreSQL、Qlib Worker 及本地服务均在验证后删除；外部 Provider 请求为 `0`。
- Web 登记三份不可变历史上下文后，通过 V2.2 CSV 导入真实本地归档；预检为 `READY`。Web 创建 V2.3 TestRun `fb9d5de2-fb60-48fd-a9d2-7d73d0bd9417`，以 FakeBroker 回放 600000.SH 前120根Bar，断言 `V2.3-IMPORTED-MINUTE-001=PASS`，状态 `COMPLETED`。
- 同一 TestRun 的 CLI `--check-only` 退出 `0`；证据导出 Manifest SHA-256 为 `f8039b802ac45e38d0e9f5dcece4ee250c8f0209a98991dabf80e22267f15c5d`。

证据：[TestRun](../local/V2.3/fb9d5de2-fb60-48fd-a9d2-7d73d0bd9417/evidence.json)、[Manifest](../local/V2.3/fb9d5de2-fb60-48fd-a9d2-7d73d0bd9417/manifest.sha256)、[可重复烟测脚本](../../services/platform-api-service/scripts/v23-local-historical-replay-http-smoke.mjs)。

## 结论与边界

一次性 OD-008 本地范围和“正向历史研究回放”门禁已满足。预检仅验证版本Hash、区间和证券覆盖，`STRUCTURAL_CHECK_ONLY_OWNER_ATTESTATION` 不会独立证明来源事实。逐分钟停牌、涨跌停价、完整公司行动和完整历史规则仍保持 `UNKNOWN`/部分覆盖；因此 C3/V2.2 仍为 `PARTIALLY_IMPLEMENTED`，不得将本结果用于收益、完整PIT事实或扩展收集的主张。
