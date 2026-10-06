# W9 W4 数据授权合同门禁后版本复核

日期：2026-10-01（Asia/Shanghai）。

完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，涵盖全仓contracts/fixtures、全仓构建/lint/typecheck/unit、PostgreSQL及身份集成、锁版Qlib 0.9.6/LightGBM 4.7.0合成Fixture训练/预测、真实隔离Web→Platform→Quant→Qlib Worker→PostgreSQL TestRun与owner-scoped artifact导出/CLI同Run。新授权Manifest边界测试7/7通过；全部只用固定合成Fixture，外部市场来源0、Broker 0。Qlib镜像为linux/amd64在Apple Silicon上仿真；不能替代原生Ubuntu或真实数据研究。

基线与引用：完整V2.3套件中的`baseline:check`通过（1759 Markdown链接，211 JSON/146 schema/36 Fixture）；V1/V2/V3 `verify:version:evidence`均PASS（28/2/3、133/18/19、116/20/20）。完整版本门禁V1/V2/V3均INCOMPLETE/exit 2，未决分别V1.1、V2.3–V2.5、V3.1–V3.4，Acceptance ID映射缺失/意外0。

W4安全合同补强：当前13份Fixture Manifest全部`FIXTURE/SYNTHETIC`，`evidence/`未发现可用于研究的冻结真实行情文件。新增RECORDED/REAL来源授权引用+Hash、用途和采集时间要求；拒绝路径穿越、Hash错误和仓库外符号链接。该合同门禁不授予数据许可。真实Qlib市场数据路由、PIT/独立验证、数据源授权、用户人工验收仍未完成。

持续条件：`NO_TRADE`，无行情源许可；Provider调用授权false；观察汇总8/20（余12个有效交易日），启用订阅0，采集任务暂停。此次未触发市场采集、模型Provider或真实Broker；无新增人工签署。
