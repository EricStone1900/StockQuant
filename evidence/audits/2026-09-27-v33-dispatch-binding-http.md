# V3.3 TestRun 绑定派发 HTTP 边界复验（2026-09-27）

Research Automation 增加隔离进程 HTTP smoke，并纳入 `pnpm verify:stage -- --stage V3.3 --suite code`。Smoke 使用随机本机端口和内存存储，不连接数据库、不启动 Runner、不调用外部模型。以绑定的 TestRun 创建合法实验后，校验匿名请求 401、错误服务身份 403、未知实验 404、跨 TestRun 409、legacy 未绑定实验 409、非 RESERVED 预算 409；队列从0条增至1条，合法任务返回 `QUEUED/NOT_STARTED`，执行未开始、外部调用为0。

完整 V3.3 code suite 在获准的本机隔离环境退出0：契约校验（126 JSON、74 Schema、34 Fixtures、61兼容规则、12 OpenAPI组）；Research Automation lint、26文件/150单测、4文件/19项专用 PostgreSQL 集成；绑定 HTTP smoke；既有队列/预算 Bearer smoke；Platform typecheck、21文件/74单测及专用 PG 集成1/1；Web typecheck、Chromium 3/3。Suite 结果为 PASS，但只表示代码检查通过。

验证中首次旧版 V3.3 Bearer smoke 因其测试实验缺少现新增的 `testRunId` 绑定而遇到预期外 409；已将该固定测试输入改为同一 TestRun 后复验通过。新隔离 HTTP smoke 在普通沙箱因 loopback `EPERM` 无法启动，获准的本机隔离环境重跑通过。不得将两次失败隐去。

边界：新 smoke 使用内存队列；全集成只验证测试数据库中的 repository/API。V3.3 仍无 Platform 所有的正式业务工作流及真实 Runner 执行、阶段级预算控制、checkpoint/recovery、Paper 连续性保证；V3.3 业务验收和人工验收仍 NOT_RUN，V3.1/V3.2验收状态不变。未部署活动服务、未调用外部模型。

## 当前工作树再次复验（2026-09-27 16:24 Asia/Shanghai）

再次从当前工作树执行同一完整 V3.3 code suite。普通沙箱重跑在随机 loopback `listen` 时返回 `EPERM`，之后在获准的本机隔离测试环境通过。新 smoke 的 TestRun 为 `90207f74-7ab0-4471-9924-8c20908fa64d`，合法实验为 `9bcd927d-a09b-4e8b-a648-4490944e818f`；6种拒绝状态为401/403/404/409/409/409，队列0→1、`QUEUED/NOT_STARTED`、外部调用0。Research Automation 26文件/150单测、4文件/19 PG测试；Platform 21文件/74单测、PG 1项；Web Chromium 3/3；契约与Fixture复验均通过。最终suite机器结果为`PASS`，并仍报告`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、业务/人工验收`NOT_RUN`。未部署服务、未调用模型或交易服务。

## V3.3页面能力边界文案校准（2026-09-27）

页面此前同时提供“记录准备态TestRun”按钮，又把“运行创建/派发”笼统显示为`NOT_IMPLEMENTED`。现将能力清单拆为`PERSISTED_WAITING_ONLY`准备态元数据、owner-scoped队列读取、页级账本读取、`NOT_IMPLEMENTED`正式业务工作流/派发、`NOT_IMPLEMENTED`全阶段预算控制、`NOT_CHECKED`Paper并行可用性；说明文字也明确准备态会创建元数据但不执行业务。Chromium断言上述事实并继续覆盖正常浏览、拒绝和同run准备态读取，V3.3 E2E 3/3及Web typecheck通过。没有改变API行为、创建新业务run、派发Job或触及Paper/模型。

## 页面状态校准后的完整阶段代码套件复验（2026-09-27 16:29）

`pnpm verify:stage -- --stage V3.3 --suite code`在本机隔离环境退出0。契约/Fixture、Research Automation lint与26文件/150单测、派发HTTP smoke、4文件/19 PG集成、既有Bearer HTTP smoke、CLI 1项、Platform typecheck与21文件/74单测及PG 1项、Web typecheck和Chromium 3/3均通过。派发smoke TestRun `0a42a6f3-bd6f-431a-9c4a-f281c2d0d1f5`、Experiment `1c926fe6-8896-45a6-8648-5c9035cac29b`，6种拒绝状态及0→1合法队列插入断言通过。套件最终状态保持`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`及业务/人工验收`NOT_RUN`。
