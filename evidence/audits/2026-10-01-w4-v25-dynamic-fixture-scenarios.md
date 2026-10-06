# W4 V2.5 场景有效性更正与动态 Fixture 验证

日期：2026-10-01（Asia/Shanghai）

## 更正原因

复核发现旧版 `V25DataScaleEngine` 直接构造并发拒绝、跨 DataVersion 缓存拒绝、预算失败、恢复行数和部分回归/量级的 `actual` 值；这些旧TestRun即使持久化、同Run读取、导出成功，也没有实际执行对应行为。旧Run与脱敏导出均保留作历史，但不再视为这些业务行为的通过证据：

- normal：`4b370296-b2f1-41c5-80ab-96677a9b580c`（Manifest Hash `5e461fde907df705f07cb8252324844ea22e3e4d0b81fac7a0ece2b28543036c`）
- rejection：`4907c01c-6aea-46c8-9a1f-8d25580a944f`（Manifest Hash `6ebe39075e4fff0632d42417e89b7eec8660c4245038f93811e3eccad95a3572`）
- recovery：`bb4ea149-3d83-4591-a0ca-c9b6bd2a2458`（Manifest Hash `555136ceb89ad0dede5fd5092f040adf234abadb141fc03434dee521e9fbd982`）

## 实现更正

`V25DataScaleEngine` 现实际生成确定性的合成内存Fixture并计算断言：normal 对20证券×60会话的1,200行、300行基线/相同扩容子样本Hash、时序切分、分区查询、DataVersion缓存键和容器RSS/耗时进行运算；rejection 执行5个场景准入（4准入/1拒绝）、异版本缓存查找和超限输入在发布前拒绝；recovery 用Map实际导入640行检查点并续至1,200个唯一键，另外验证取消状态不发布。

证据标签显式区分 `IN_MEMORY_SYNTHETIC_FIXTURE` 与 `IN_MEMORY_SCENARIO_POLICY`。当前TestRun明确将生产任务队列、持久化市场数据查询/恢复、Qlib模型训练、真实市场PIT和V2.4观察标为 `NOT_RUN`。新DataVersion为 `v2.5-acceptance-synthetic-fixture-v2`，与BaoStock历史20×60归档版本分开，不接触行情来源。

## 更正后的执行结果

本地Platform API只服务于FakeBroker/Fixture验收；完整 `pnpm verify:stage -- --stage V2.5 --suite code` 退出0，含114 Schema、36 Fixture、全仓构建/lint/typecheck/unit、服务身份检查及Market Data PostgreSQL集成22/22。`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.5`退出0，1/1通过。Platform API镜像为 `sha256:663df7d7ec2778d504dd6749668d75fe0dffe21827ca495eb8f3484c069bc867`。

| 场景 | 更正后的TestRun | 断言 | 同Run CLI | 脱敏Manifest |
|---|---|---:|---|---|
| normal | `599eca31-41cb-4494-aa6d-f591bdc5d5f1` | 6/6 PASS | exit 0 | [Manifest](../local/V2.5/599eca31-41cb-4494-aa6d-f591bdc5d5f1/manifest.sha256)，Hash `d442da5e719606de9dac45fa75091f66b6869d45fadf44248acd06c4895b7d3a` |
| rejection | `5872d881-c61c-4505-a2aa-84e01d37d08f` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/5872d881-c61c-4505-a2aa-84e01d37d08f/manifest.sha256)，Hash `955324464d21ecfc25657a19467bf117b832693a04362ed938cc359398d50a3f` |
| recovery | `cf8d64f0-8272-4f2a-8704-f0363516aee8` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/cf8d64f0-8272-4f2a-8704-f0363516aee8/manifest.sha256)，Hash `207a03aa2cc9236b6bca858785df6511c659ee2f9519750eadf497a6f930f57f` |

所有新Run使用seed `20261001`。normal测得1200行、容器RSS 217 MiB、执行0.002秒、linux/amd64仿真；真实市场数据和真实PIT仍未执行。rejection/recovery数值来自明确限定的进程内Fixture算法，不代表Market Data生产队列、数据库或持久恢复。

## 收口限制

此更正消除硬编码actual造成的误导，不代表整个V2.5已实现或通过。研究用途市场数据授权仍未确认，按用户决定禁止新行情源/研究采集；真实Qlib业务路由、独立模型验证、真实财务/行业PIT、分钟导入/查询/缓存/队列/配额的端到端证据、分钟全市场容量、长期来源稳定、60日备用源、V2.4观察以及当前范围用户人工验收仍未完成。新历史TestRun和导出不覆盖或删除旧审计与失败记录。
