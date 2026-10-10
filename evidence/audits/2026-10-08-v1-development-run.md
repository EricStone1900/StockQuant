# V1 开发续跑与验证记录

日期：2026-10-08（Asia/Shanghai）。范围：依照[V1完成计划](../../docs/plans/2026-10-08-v1-completion-plan.md)执行隔离阶段门禁、浏览器/CLI E2E及发现问题的最小修复。2026-10-09追加V1.5证据写入保护复验。此记录不替代阶段验收、人工签署、目标环境验证或版本门禁。

## 结果

| 阶段 | 本轮命令/结果 | 证据和边界 |
|---|---|---|
| V1.1 | `pnpm verify:stage -- --stage V1.1 --suite code` PASS；`pnpm test:integration:v11-stage-storage` PASS，Web/CLI normal/rejection/recovery 3/3 | TestRun：`c1aa88f6-0eee-4424-af21-60d1128a7937`、`094f9cb6-10c7-41af-bb65-5674b44857c5`、`b8880be0-c926-4963-9bc6-02972b2950ca`。仅隔离统一存储复验；活动存储仍未切换，Artifact策略和完整V1.1交接仍开放。 |
| V1.2 | `pnpm verify:stage -- --stage V1.2 --suite code` PASS；`pnpm test:e2e -- --stage V1.2` PASS | 双市场锁版Qlib 0.9.6训练/预测、固定日线、取消、TestRun导出及Platform重启恢复均有隔离容器证据。TestRun：`288d732f-15ac-49b1-9164-505e5b4d5890`、拒绝Run `49e1bf78-6b15-4d3c-8b67-6bdba27c9f99`、恢复Run `6e760c42-bed4-48a3-876a-869b090186a8`、重启恢复Run `d2ddfdbe-827a-4be7-a1b8-f155453649ec`；取消Run `a8b9b7fb-c4f3-438c-844c-a7fa45340c6c`。Qlib运行环境记录为Apple Silicon上的Linux容器；amd64路径仿真不代表Ubuntu实机。 |
| V1.3 | 当前树 `pnpm verify:stage -- --stage V1.3 --suite code` PASS；`pnpm test:e2e -- --stage V1.3` 修复后 PASS，21/21 | 首次运行第6项发现测试Harness未启用费用更正单次故障注入，TestRun保留为`WAITING`，不是业务验收PASS。只在[隔离Harness](../../scripts/test-v13-web-e2e-isolated.mjs)把`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED`设为`true`；Trade服务仍要求该变量且仅接受revision=1、固定`v13-fee-correction:`证据前缀时触发一次，Compose默认值和生产配置保持关闭。修复后完整21项矩阵通过；故障Run `6986c821-50ef-489d-8c58-8da1543d73d2`记录拒绝一次、Outbox重试后DELIVERED、attempts=2、对账MATCH。完整Run导出和截图/Trace目录：[本轮隔离浏览器证据](./2026-10-08-v13-browser-captures-sq-v13-web-07c71ddffdc6b9dec3ad/)。隔离工程门禁通过不等于市场规则/环境/用户验收完成。 |
| V1.4 | 当前树 `pnpm verify:stage -- --stage V1.4 --suite code` PASS；`pnpm test:e2e -- --stage V1.4` PASS，Playwright 5/5 | 退出摘要：[机器E2E记录](./2026-10-07-v14-durable-tasks-a18a937358407d54d808.json)。Web创建Run由CLI同Run核对；覆盖固定回测、费用/停牌限制、公司行动、取消/恢复和报告。Quant与持久Paper账本的全部规则一致性、人工验收仍未通过/签署。 |
| V1.5 | 当前树 `pnpm verify:stage -- --stage V1.5 --suite code` PASS；`pnpm test:e2e -- --stage V1.5` 自动Harness PASS，1/1 | 正常Run `c12eca1a-12e8-4914-b5c4-48b003c15284`对CN_A/US_EQUITY各60个Fixture日期做120次权威观察，HOLD断言PASS、零订单/Fill/预留。拒绝Run `38e0950c-3072-492c-9b28-70a5188eb8bc`和恢复Run `b92b9093-4d4e-4fb0-818b-5d908a453581`仅检查WAITING/NOT_RUN呈现和同Run CLI/export；其业务场景未运行。当前**不包含自动交易、日终或UNKNOWN业务工作流**。本轮派发/故障机器记录已独立保存为[新运行JSON](./2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-68e0832c5fa51e912c32.json)及[SHA-256](./2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-68e0832c5fa51e912c32.sha256)；脚本原先固定写入10月7日路径，本次复核已恢复该路径的HEAD历史原件，保留两次运行，防止旧审计链接指向新UUID。本次随机Compose项目的容器、卷、网络清理由Harness验证通过。 |

五个阶段的代码套件均已执行；V1.3修复后的code gate最终复验中contracts、fixtures、Python adapter 69项、服务单测和隔离PostgreSQL/HTTP检查均通过，整体门禁未再遇到前一次文档并发写入问题。本轮隔离运行未调用外部行情/新闻来源、真实模型Provider、真实券商或券商Paper API；FakeBroker仅为项目自有模拟服务。

## 仍未关闭的V1条件

当前版本Verifier为`INCOMPLETE`/exit 2；五阶段仍`PARTIALLY_IMPLEMENTED`。机器门禁仍列出4个历史Run结构化导出缺口：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。新Run不会替代旧UUID。

主要剩余工程项是V1.5固定Fixture交易→授权/预留→FakeBroker订单/Fill→Portfolio账本→日终对账的真实后台工作流、对应暂停/UNKNOWN/错过窗口/恢复路径，以及全V1配对恢复（包括Artifact字节）。P1 Artifact保留决定、V1.1活动存储切换/回退、目标Ubuntu实机/阶段要求、每阶段可执行交接手册与新增范围人工验收也未关闭。OD-007只阻塞活动策略启用；本轮固定Fixture/Mandate隔离测试不代表活动策略授权。

本轮E2E通过仅表示已列明的隔离场景自动检查通过。未改动任何阶段用户签署或将其状态改成PASS，未改活动Compose/卷/数据库，未进行Artifact物理删除。


## 2026-10-09 A02证据写入保护

V1.5 Harness不再写固定的2026-10-07报告路径。`scripts/unique-evidence.mjs`使用日期、故障类型及随机隔离项目名为每次运行创建独立JSON；JSON和SHA-256 sidecar均以`wx`新建，已存在时拒绝覆盖。定向单测`node --test scripts/unique-evidence.test.mjs`通过（1/1），覆盖两次独立文件写入、摘要内容和碰撞时原JSON/sidecar不变。

随后`pnpm test:e2e -- --stage V1.5`通过（Playwright 1/1）：normal TestRun `d582d25e-5297-452d-9f6c-433c0543e689`完成CN_A/US_EQUITY各60次权威NO_TRADE观察；rejection `8d2c4269-42bd-4bcd-9ffb-7986b0dec42e`及recovery `c48029b3-464e-49b1-957f-8e46d01a02a1`如实保持WAITING/NOT_RUN，三者均完成同Run CLI/export检查。Harness确认随机隔离容器/卷/网络已清理。新报告：[JSON](./2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-31c821bcb9084baadd5b.json)，SHA-256 `c33dab983928eedeef2668c640564e93842ec4aa6e7399aa6bb8a297d5a16047`，并有对应`.sha256`文件。自动业务断言仅覆盖normal NO_TRADE，交易/日终/rejection/recovery业务仍未实现/未运行。


2026-10-09 A02抽取后复验：`node --test scripts/unique-evidence.test.mjs` 1/1通过；再次执行V1.5隔离E2E exit 0，normal `6ae9fe44-7e98-4801-a1c8-849b235785aa`完成CN_A/US_EQUITY各60次权威NO_TRADE观察，rejection `a3061a64-a1fa-439b-a5b5-c7847fe00616`与recovery `96e885c9-66b2-4927-bb54-1fff3b8ccebb`仅为WAITING/NOT_RUN及同Run CLI/export。项目`sq-v15-e2e-f975700af5bd364b1c57`精确容器/卷/网络清理通过。新报告：[JSON](./2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-f975700af5bd364b1c57.json)，SHA-256 `8ac071f41ed5c4693cb6e7a3a40aa0ad064b62f72e2dd41964cba8920ce70c9a`，sidecar同目录。业务交易/日终/拒绝/恢复仍未完成。


2026-10-09 V1.5最终代码门禁：以包含`unique-evidence.mjs`抽取后的当前工作树重跑`pnpm verify:stage -- --stage V1.5 --suite code`，完整日志已保存，最终exit 0。包括baseline/contracts/fixtures、build/lint/typecheck、工作区单测、Portfolio/Trade/Market Data/Platform隔离数据库和身份集成、V1.5 Outbox原子性、Python适配器及ops检查；不等于V1.5业务交易/日终/rejection/recovery或人工验收PASS。日志：[完整命令输出](./2026-10-09-v15-code-suite.log)，SHA清单：[SHA-256](./2026-10-09-v15-code-suite.log.sha256)。


2026-10-09 A02 sidecar格式修复后复验：V1.5隔离E2E exit 0，normal `1adb0e78-48f1-466a-ae7d-fe456c2cc767`完成CN_A/US_EQUITY各60次权威NO_TRADE观察；rejection `1b3efd0b-dd57-4d35-8984-dc683efad8db`、recovery `de63c934-6572-459d-8e07-e6a2ed61462b`仍为WAITING/NOT_RUN并完成同Run CLI/export。项目`sq-v15-e2e-a58ec06b245a3eb3c82f`资源清理通过。报告[JSON](./2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-a58ec06b245a3eb3c82f.json)，SHA-256 `82ba3db8482cd09e52f570b36ee06adc54c93013cbc16b2d4d86d0a8d8deb4bb`；sidecar含仓库根目录可解析的完整相对路径。随后以修复后的helper、单测接入baseline的最终工作树执行V1.5完整code suite，exit 0；[日志](./2026-10-09-v15-code-suite.log)，[SHA-256](./2026-10-09-v15-code-suite.log.sha256)。版本证据审计确认新sidecar可校验，版本仍因历史Run与范围验收缺项保持INCOMPLETE/exit 2。


2026-10-09 V1当前Verifier复核：`pnpm verify:version -- --version V1` exit 2/INCOMPLETE；五阶段结构文档检查5/5 PASS，证据审计PASS（341个证据引用、17份Manifest、115个条目、0 Hash/路径失败）。TestRun审计显示V1.2一个、V1.5三个历史UUID仍缺结构化导出；五阶段当前验收/版本门禁未全关闭。完整输出：[Verifier日志](./2026-10-09-v1-version-gate.log)，[SHA-256](./2026-10-09-v1-version-gate.log.sha256)。


2026-10-09文档与证据链接更新后的V1 Verifier终检：exit 2/INCOMPLETE；证据审计PASS（342引用、18份Manifest、116个条目、0失败），阶段结构5/5 PASS。历史Run缺口仍为V1.2一个、V1.5三个结构化导出。最新结果覆盖前一快照：[日志](./2026-10-09-v1-version-gate.log)，[SHA-256](./2026-10-09-v1-version-gate.log.sha256)。

## 2026-10-09 A04：V1.1隔离存储与迁移覆盖补齐

发现V1.1阶段代码套件虽覆盖通用生成漂移、服务身份与域测试，但未执行Platform TestRun迁移/统一存储的PostgreSQL持久化脚本。已在`scripts/code-suite-plan.mjs`为V1.1追加隔离PostgreSQL `test:integration:persistence`，并增加计划单测；13项代码套件计划测试全部通过。

本次实际执行退出0：`node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:integration:persistence`。迁移保留COMPLETED历史断言/签署/时间戳及RUNNING/WAITING状态；重复迁移幂等、冲突回滚；双存储创建/更新、stage优先且owner隔离读取、部分写失败原子回滚，以及HTTP owner 200/跨owner 403均通过。脚本仅创建`platform_api_test`临时库，127.0.0.1绑定，验证活动服务未连接，并确认容器/网络已清理。机器详情与SHA见[A04隔离证据](./2026-10-09-v11-persistence-migration-a04.json)及同名`.sha256`。

`pnpm contracts:check`同期通过：292 JSON文件、205 schemas、48 fixtures、111条consumer兼容规则、29个生成器纳入生成/漂移检查。上述是隔离工程证据，不代表活动存储切换、用户验收、全部V1调用矩阵或V1.1关闭；活动库仍保持未切换。

将该持久化命令接入代码门禁后，已重跑`pnpm verify:stage -- --stage V1.1 --suite code`并退出0。完整stdout见[本轮V1.1代码门禁日志](./2026-10-09-v11-code-suite-a04.log)，机器退出码及运行边界见[摘要](./2026-10-09-v11-code-suite-a04.json)和SHA旁车文件。此代码PASS仍不改变阶段状态、活动切换状态或新增人工验收状态。
