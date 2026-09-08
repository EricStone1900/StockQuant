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

## 校验与发布

基础 JSON 语法检查由 `pnpm contracts:check` 执行，Manifest 文件存在性与 SHA-256 重算由 `pnpm fixtures:check` 执行。V1.1 仍需实现 JSON Schema 实例校验、引用解析、TS/Python 往返和兼容性检查；缺少任何一项不得将阶段契约任务标为完成。
