# W4 研究数据授权 Manifest 门禁

日期：2026-10-01（Asia/Shanghai）。

当前仓库中13份`fixtures/**/manifest.json`均标记`dataMode=FIXTURE`、`source.kind=SYNTHETIC`；`evidence/`内没有CSV/Parquet/Feather/Arrow/压缩数据文件。现有数据只能用于明确标注的固定Fixture，不构成冻结REAL市场数据，也不能支撑W4真实Qlib研究路由。

强化`fixtures/manifests/fixture-manifest.schema.json`：FIXTURE强制SYNTHETIC；RECORDED/REAL强制非空`authorizationRef`、其`authorizationSha256`、`authorizedUse`（仅RESEARCH/SIMULATION）和非空`retrievedAt`，并拒绝将SYNTHETIC冒充真实来源；`PRODUCTION_ELIGIBLE`仅允许REAL且授权信息完整。`fixtures:check`同时核对数据文件与授权记录字节哈希；含Schema验证的`contracts:check`现固定执行7项授权/eligibility/路径Hash回归，并拒绝路径穿越、错误Hash和仓库外符号链接。

验证：授权边界测试7/7通过，含授权文件存在/哈希验证及符号链接逃逸拒绝；`pnpm contracts:check`及`pnpm fixtures:check`退出0，现有19个Fixture文件SHA均有效，13份Manifest均通过新语义约束。此门禁只阻止缺授权的数据进入可验证Fixture合同，不授予任何数据访问权或生产资格。用户当前确认无数据源授权，故W4真实数据Qlib训练/PIT与独立验证继续WAITING；本轮未请求或采集行情。
