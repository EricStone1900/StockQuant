# V2.4 隔离 Fixture Paper 链路复验

日期：2026-09-27（Asia/Shanghai）。范围：本地隔离 Fixture 的 Governance→Trade Execution→Portfolio→FakeBroker/Outbox→Platform 编排及 CLI `--check-only`。本记录只代表当前工作树的工程测试，不表示活动服务已部署、连续观察完成或用户人工验收通过。

## 已验证

完整命令（含Chromium Web→Platform、浏览器TestRun与CLI same-run检查）：

```bash
pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke
```

退出码：0。脚本为 Governance、Portfolio、Trade Execution、Platform 各创建一个带随机后缀的临时 PostgreSQL 数据库，启动临时本地服务进程；退出时仅删除本次创建的数据库。`activeServicesTouched=false`。正常、拒绝、恢复各自的API TestRun CLI check-only均退出0；Playwright在正式页面触发另一条正常TestRun并成功用CLI复核同一ID。

固定输入：`fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json`，版本 `2.0.0`，SHA-256 `713d6d152d7499c291a475194a0404c93cafa3a6faa6dbdff7ef87a477432821`。Mandate、策略版本、政策版本、费用、账户、owner、TestRun 和 namespace 限于该隔离用例；默认 Paper 仍保持 `PREPARATION_ONLY`，LIVE 关闭。

三个运行均由真实服务持久化，CLI 对同一 TestRun 执行 `--check-only` 并以退出码0读取：

| 场景 | TestRun | 实测 |
|---|---|---|
| 正常 | `c0a4ea3f-f814-4520-bb95-d2e4d8030fc6` | Governance 授权；风险检查通过；首个符合条件的后验 SNAPSHOT；FakeBroker 单笔 100 股、10.0000、费用5.0000；Portfolio 现金8995.0000、持仓100股；预留 CAPTURED 1005.0000；Outbox DELIVERED；reconciliation 订单/Fill各1、未决和待投递0；8项断言全PASS，CLI同run退出0。 |
| 拒绝 | `b1d003cd-8c2d-412d-b600-24d326d4ac91` | 陈旧/下单前快照由 Governance 以422拒绝；只有初始资金账目；FakeBroker订单、Fill和待投递Outbox为0；3项断言全PASS，CLI同run退出0。 |
| 响应丢失恢复 | `b2c4a348-79c4-4a3b-891b-4c46f598c761` | HTTP代理在 Trade Execution 已持久化并处理后真实丢弃首次接受响应；Platform 通过原 namespace/clientOrderId 查询恢复；订单、Fill、账本、预留及Outbox断言全PASS，CLI同run退出0。 |
| Web→API→CLI同run | `4dccf181-be47-4bb4-b53a-69ef447fcb4d` | Chromium在`/acceptance/v2/v2.4`触发正常场景；真实Platform TestRun完成；页面核对100股Fill、价格/费用、CAPTURED预留、现金8995.0000和零待投递；CLI `--check-only`读取相同TestRun并退出0。截图：[Web验收画面](./2026-09-27-v24-isolated-paper-web.png)。 |

## 发现并修复

响应丢失查询 `/internal/v1/orders/by-client-id` 曾被 Trade Execution 的通用 `/internal/v1/orders/:id` 路由抢先匹配，导致将 `by-client-id` 当作UUID查询并使进程退出。路由现在排除此固定子路径；上述 recovery TestRun 覆盖了实际丢弃响应后的重查。

## 测试迭代记录与当前状态

第一版全链路Playwright曾复用“故意丢弃Trade Execution响应”的代理作为Web正常场景目标，导致浏览器运行请求等待超时。最终测试将真正丢响应的代理限定在 recovery 场景；浏览器使用独立临时Platform进程连接正常Trade Execution服务。完整默认命令现在通过。

已发现并修复的业务路由缺陷见上文。成功运行仅覆盖隔离Fixture小样本与一次真实HTTP请求链，不代表服务部署、持续20个交易日观察、真实行情来源/许可、活动策略或当前范围用户人工验收。人工作为当前范围签署仍为 `NOT_RUN`。
