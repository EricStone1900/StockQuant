# W9 Evidence-aware version gate

日期：2026-10-01（Asia/Shanghai）。

`pnpm verify:version -- --version V1|V2|V3`现将版本/阶段Markdown状态与同一版本PRD目录证据引用审计组合：每个相对本地证据链接必须在仓库内存在，被引用SHA-256 manifest的每个条目必须格式有效、目标在仓库内且内容Hash相符。门禁JSON加入`evidenceAudit`状态、引用数、manifest数/条目数及失败明细；证据完整性失败时版本结论为FAIL，引用缺失时不能返回PASS。scope仍明确说明它不推断业务正确、部署、观察或人工签署。

验证：新增`version-gate-evidence-status.test.mjs` 3项通过；完整`pnpm test:ops`受控loopback复跑166/166通过。普通sandbox首次2项临时127.0.0.1 HTTP测试因`EPERM`失败，原失败保留。更新后V1/V2/V3门禁均正确返回INCOMPLETE/exit 2，evidenceAudit分别PASS且引用/Manifest数据与`pnpm verify:version:evidence`一致（28/2/3、131/17/18、116/20/20）。

这是自动证据引用完整性门禁，不是语义证据审查或验收签署；阶段状态仍需按实际TestRun、观测及用户确认判断。完整测试不连接市场来源、模型Provider、Broker或活动服务。
