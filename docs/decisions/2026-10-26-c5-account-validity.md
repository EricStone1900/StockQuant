# C5 账户有效期规则

日期：2026-10-26。状态：`ACCEPTED`。

## 所有者确认

在确认 Portfolio `AccountSnapshot` 当前没有独立账户有效期字段后，项目所有者选择：**账户无独立有效期；仅 Mandate 到期暂停**。

## 决定与范围

- V2.4/C5 不为账户增加独立 `expiresAt` 字段，也不因账户时钟有效期自动暂停模拟交易。
- 执行授权的有效期由绑定账户、策略、证券及 TestRun 的 Governance Mandate `validFrom` / `expiresAt` 控制；Mandate 到期必须失败关闭，目标数量为零且不产生订单。
- 行情状态、执行窗口、账户既有状态、风险和资源预留等其他门禁仍按各自合同独立判断。
- 本决定不批准活动 Mandate、常驻数据采集、自动调度或真实交易，也不改变 C5 其他验收条件。

## 验收依据

`candidate-binding` Fixture 在 Mandate `expiresAt` 精确边界断言 `PAUSED/MANDATE_INACTIVE`、数量为0及零订单副作用；正式 Web 可见摘要与 API/CLI 同 Run 验收通过。详见[完整隔离报告](../../evidence/audits/2026-10-26-v24-paper-smoke-d9122fc3a66a4e1da9e815f4a8761037.json)和[浏览器明细](../../evidence/audits/2026-10-26-v24-paper-web-e2e-2613b0d9-c2a0-4467-8a00-09ae948f4bf8.json)。自动 Fixture 证据不代表当前范围人工验收或真实时钟观察通过。
