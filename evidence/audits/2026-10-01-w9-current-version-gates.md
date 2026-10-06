# W9 当前三版总门禁复核

日期：2026-10-01（Asia/Shanghai）

执行版本脚本实际入口 `node scripts/verify-version.mjs --version V1|V2|V3`。结果与 `pnpm verify:version -- --version <version>` 一致：

| 版本 | 状态 / 退出码 | 未完成阶段 | 缺失或意外验收ID |
|---|---|---|---|
| V1 | INCOMPLETE / 2 | V1.1 | 0 / 0 |
| V2 | INCOMPLETE / 2 | V2.3、V2.4、V2.5 | 0 / 0 |
| V3 | INCOMPLETE / 2 | V3.1、V3.2、V3.3、V3.4 | 0 / 0 |

机器结果：[JSON](2026-10-01-w9-current-version-gates.json)。

V2.5本轮三场景新TestRun及同Run检查通过，不关闭市场数据研究许可、真实Qlib/PIT、全量分钟容量、V2.4观察或阶段人工验收门禁。真实市场来源保持未授权，Paper/LIVE真实券商能力未启用。任何版本均不得据此声明完成。
