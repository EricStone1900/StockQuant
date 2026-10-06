# W1 V2.4 生成客户端迁移后完整隔离回归

日期：2026-10-01（Asia/Shanghai）

在 Platform→Decision Governance 授权创建、Platform→Portfolio Risk账户初始化以及 Trade Execution→Decision Governance授权验证均改用各自的OpenAPI生成客户端后，运行 `pnpm verify:stage -- --stage V2.4 --suite code`，最终退出0。

验证覆盖baseline与contracts/fixtures、全仓build/lint/typecheck/unit、Trade Execution/Portfolio Risk隔离PG与服务Bearer边界、Market Data 63项Python Adapter、Ops、V2.4 Trade Execution readiness HTTP与linux/arm64容器烟测，以及新的随机隔离Platform/Portfolio/Trade/Governance数据库中Platform API与Chromium normal/rejection/recovery场景。Web创建的三条TestRun经CLI `--check-only`复核相同ID；恢复场景真实丢弃首次执行响应后根据原`clientOrderId`恢复持久化订单。三条API/Web场景与断言全部PASS，事实计数符合固定Fixture断言。

结果报告：normal `bbaa4bb9-cd83-435c-8ab5-0d96f34d0ed9`，rejection `f85fbd85-2811-4c2e-b5d4-063fbacfc785`，recovery `8e4cbd08-ba12-4a4b-99ff-db48c7e66818`；Web runs分别`12ad9f18-e899-45c6-9a1d-3db7d544c140`、`26681e98-d321-40a2-801d-86787ebe9f79`、`aea35643-5048-4a4f-a4f3-30bd1c38f2c5`。临时数据库按随机项精确清理，套件报告`activeServicesTouched=false`。

本报告证明离线Fixture/FakeBroker工程场景，不证明真实数据、活动Paper、生产API发布或人工签收；NO_TRADE与无数据源授权保持有效。

## V2.4 执行提交与原订单查询客户端增量复跑

2026-10-01后续将Platform→Trade Execution的`executeV24FixtureSnapshotOrder`和`readV24FakeOrderByClientIdentity`接入OpenAPI生成客户端，覆盖正常执行、UNKNOWN时按原身份查询、已确认无单后的精确命令重试。生成器漂移检查、请求头/路径/编码/响应保真与URL/token/空身份拒绝单测均通过；Platform 123项单测、typecheck、全仓合同生成检查和完整`pnpm verify:stage -- --stage V2.4 --suite code`最终退出0。

本次最新API TestRun为normal `601e53b3-0197-4562-801c-b9e89f54b464`、rejection `e271eadf-eee7-4441-94e7-7603c49e2929`、recovery `f128452f-4006-44c3-b9af-22d8f2094c30`；Web TestRun `ce8bb25a-cf09-431c-ac67-0f7cb83e28c4`、`2027ab44-7af7-40cf-9ccf-4eff514fd31d`、`b0080c18-2103-4512-be14-436ec10db4b5`均由同run CLI `--check-only`退出0核验。丢失接受响应后恢复原订单通过；四个随机隔离数据库精确清理，`activeServicesTouched=false`。Linux/arm64 readiness容器通过，live/order submission仍关闭，FakeBroker表零行。

可复核最新烟测文件为[机器结果](2026-09-30-v24-paper-smoke.json)、[浏览器步骤/结果](2026-09-30-v24-paper-web-e2e.json)；脚本固定写入原日期文件名，故内容记录本次2026-10-01增量运行。本次仍仅是隔离Fixture工程回归，不替代NO_TRADE、来源许可、20日观察、活动Paper或当前范围人工签收。

随后检查发现`readPaperAccount`仍直接请求Portfolio HTTP；它现也复用既有`GeneratedPortfolioAccountClient.getAccountSnapshot`。此修正后再运行完整V2.4 code suite并退出0；Platform 123项单测/typecheck通过。最新API TestRun normal `2a96afe6-dde5-40dd-b444-f46e87cfb73e`、rejection `7f27421b-8bcb-4ef0-9936-ec85d5ccf2ba`、recovery `deb50e5f-cb4a-446d-9bb7-e03fcbe5c12c`；Web同run CLI checks的三个ID依序为`485bb511-3b31-49cc-8e91-75bc16d8b6d9`、`554ad247-f567-4ba4-a565-694f8222dd3b`、`24d5c4cf-56fc-4bcd-8556-f972a4636a06`。丢失响应恢复、linux/arm64 readiness通过，随机四库清理，`activeServicesTouched=false`。以上为本审计最新执行边界。

最后补齐Trade Execution reconciliation summary的Platform ServiceBearer OpenAPI operation及生成客户端方法；响应严格约束namespace、FAKE模式、订单/未决订单/Fill/待投递Outbox计数，V2.4执行、原单读取和reconciliation三个内部调用现在均由生成客户端承载。`pnpm contracts:check`及包含新契约的完整V2.4 code suite退出0；最新API TestRun normal `171654a5-d394-409d-9a87-96fefc5c9564`、rejection `2e76396d-0999-4bae-bf50-750dff426d47`、recovery `fd58afee-cdeb-4eba-bb1c-4d97c7edb38d`；Web同run CLI checks的三个ID为`7b7318cb-f421-4371-ae2b-4c169abc9994`、`bbcd4878-9aca-436f-b8f4-5a5f4ee0984b`、`193e6e51-ea76-4266-ae5b-d5c8ccdda1b7`。丢响应恢复、arm64 readiness通过，隔离库精确清理，`activeServicesTouched=false`。

## 最新只读 readiness 客户端增量后复跑

在随后加入 Platform→Trade Execution 生成式只读 readiness 客户端后，又一次执行相同完整套件并退出0。新运行的API TestRun：normal `028689f7-e731-4e36-9615-ea3317e32d28`、rejection `fb8c4705-2ee0-4b39-89d8-6c75b06293e3`、recovery `e23a3d2b-d7bc-4c07-b6ac-b10e48ee663d`；Web TestRun：`d0c762b2-0692-44f9-9d02-8ca8ec7673de`、`ca0a0ddd-23ef-4cee-9e24-d56277de9cbe`、`32ad17b1-184a-4795-a4c2-9d9ea1232703`，三条CLI只读同Run检查均退出0。恢复场景再次实际丢弃首次接受响应并按原订单身份恢复。linux/arm64 readiness容器通过；FakeBroker Order/Fill/Event/Outbox均为0。报告保持`activeServicesTouched=false`，隔离数据库按精确随机项目清理。
