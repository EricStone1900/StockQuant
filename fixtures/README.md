# Fixture 与确定性输入规范

状态：BASELINE_DEFINED / 业务验证 NOT_RUN。Fixture 只用于开发、回测和模拟验收，不代表真实行情、收益有效性或生产可用性。

## 目录与命名

```text
fixtures/manifests/              Manifest Schema
fixtures/v1/v1.1/                V1.1 账户初始化输入及 Manifest
fixtures/<version>/<stage>/      后续阶段固定输入
```

每个集合必须有唯一 `fixtureId` 和不可变 `fixtureVersion`。内容变化创建新版本，不原位修改已用于证据的版本。文件路径相对仓库根目录，Manifest 保存每个文件的 SHA-256。

## 数据分类

| dataMode | 含义 | 证据标签 |
|---|---|---|
| FIXTURE | 项目创建的确定性或合成输入 | SIMULATION_ONLY |
| RECORDED | 经许可保存的外部响应 | 标来源、采集时间、许可和适用用途 |
| REAL | 用户提供或 Provider 获取的真实数据 | 标市场、覆盖、修订、质量和许可 |

不得把 FIXTURE/RECORDED 宣称成真实在线组件。真实数据也不自动获得 `PRODUCTION_ELIGIBLE`；本轮不允许真实券商交易。

## 行情文件要求

后续日线/分钟文件必须明确：SecurityId 与历史 ticker 映射、market/venue、时区、币种、频率、RAW/复权口径、OHLCV 单位、barStart/barEnd/availableAt、停牌/缺失、公司行动、日历版本和数据来源。`SNAPSHOT`、`DAILY_BAR`、`MINUTE_BAR` 分开存储，禁止用稀疏快照伪造分钟 Bar。

用于模型的数据必须覆盖因子预热、训练/验证/测试及标签窗口。历史股票池保留当时成分和退市样本，不能用今日在线监控池替代。

## 场景可复现性

每个场景固定输入、规则版本、Clock、seed、故障计划和预期断言。并发故障还要保存实际注入顺序；seed 不能替代事件序列。重新运行创建新 testRunId/namespace，但引用相同 Fixture 版本和 Hash。

预期结果至少覆盖金额、币种、数量、账本条目数、订单/成交状态、拒绝原因和无副作用断言。研究浮点容差必须在运行前冻结；资金和数量使用精确十进制比较。

## 来源、许可与隐私

Manifest 必须记录来源种类、说明、许可/授权和采集时间。用户文件标 `USER_PROVIDED`，不推断转授权。新闻正文和供应商原始数据只按许可留存；凭据、真实账户标识和个人信息不得进入 Fixture。

## V1.1 基线

[账户初始化输入](./v1/v1.1/accounts.json)固定两个独立的空仓 Paper 账户模板：CN 10000.00 CNY、US 10000.00 USD，均只连接 FakeBroker。每次运行由服务生成新的 accountId；`fixtureAccountRef` 不是业务账户 ID。

期望每个账户只有一笔期初流水，重复相同幂等请求十次后金额和流水数不变；同键异载荷必须拒绝且无副作用。完整场景仍需后端、真实 PostgreSQL、Web 和 CLI 实现后才能冻结为可执行验收。

## V3.2 研究侧验证 sidecar

`packages/contracts/fixtures/v3.2-data-manifest-fixture-v1.json` 与 `packages/contracts/fixtures/v3.2-validation-plan-fixture-v1.json` 是契约形状样例，不是行情数据或已完成的验证证据。验证计划用数据 Manifest 原始 UTF-8 字节的 SHA-256 建立绑定；任何内容变更都必须生成新版本及新 Hash。Runner输入包中的 `dataContentSha256` 定义为：排除两个sidecar后，对其余`data/`文件按ASCII相对路径字节序排列，生成`[{path,sha256}]` JSON UTF-8字节，再取SHA-256。每个文件Hash直接从原始字节计算。验证计划还声明`candidateOutputPath`、`generatedCodeOutputPath`和`metricsOutputPath`；PromotionRequest构造器以Runner Job ID、fencing sourceRef及路径派生artifactId核实角色对应的实际OUTPUT产物。这个输入包校验不能替代对数据来源、授权、市场覆盖或时间可用性的独立验证；来源、许可、时间范围和数据版本须与候选及TestRun同时固定。

## 校验与发布

基础 JSON 语法检查由 `pnpm contracts:check` 执行，Manifest 文件存在性与 SHA-256 重算由 `pnpm fixtures:check` 执行。V1.1 仍需实现 JSON Schema 实例校验、引用解析、TS/Python 往返和兼容性检查；缺少任何一项不得将阶段契约任务标为完成。

V3.2另有可复算开发输入 [`v3.2-independent-validation-v1`](./v3/v3.2-independent-validation-v1/manifest.json)：两只合成A股、每只180个weekday sessions的日线，以及固定SMA交叉候选和PIT/OOS/成本/容量验证设计。市场日历、公司行动、退市证券和收益能力均未建模；数据仅`RESEARCH_ONLY`。它是独立复算实现的冻结测试输入，不是实测报告或真实市场证据。`pnpm fixtures:check`同时核对Manifest文件Hash与确定性生成器输出；内容变化应另建新版本，不覆盖此版本。

The fixed-fixture reference calculator is `pnpm --filter @stockquant/quant-research-service v32:fixture-recompute`; the V3.2 code suite runs it automatically. It produces an in-memory `FIXTURE` report from a separately implemented allowlisted SMA reference and does not execute candidate source or persist a business TestRun. `ELIGIBLE_FOR_REVIEW` in that output is a deterministic fixture assertion only; it is not a real-candidate V3.2 acceptance.
