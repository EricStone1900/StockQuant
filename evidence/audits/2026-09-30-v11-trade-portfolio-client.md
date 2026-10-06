# V1.1 Trade Execution Portfolio Account 客户端增量

日期：2026-09-30。范围：离线契约与 Trade Execution → Portfolio Account 的 HTTP 客户端边界。

将 `portfolio-account.v1` 的5个OpenAPI操作客户端生成到Trade Execution消费者目录，并将Fill账本投递、资源预留、预留结算改为该客户端调用。客户端统一附带 `trade-execution-service` 身份及该服务Bearer token；资源预留保留Portfolio的409状态及错误体语义。没有改动活动部署、数据库、数据来源、Paper开关或真实券商设置。

验证结果：

| 命令 | 结果 | 证据 |
|---|---|---|
| `pnpm contracts:check` | PASS，退出0 | 113 schemas类型漂移检查；Portfolio Account两份消费者客户端5操作一致；96条兼容规则；OpenAPI检查通过 |
| `pnpm docs:check` | PASS，退出0 | 1225个本地Markdown链接，0失败 |
| `pnpm --filter @stockquant/trade-execution-service test` | PASS，退出0 | 10个测试文件、52项单测通过，含新增客户端认证、编码路径、请求体和409断言 |
| Trade Execution TypeScript build | PASS，退出0 | `pnpm --filter @stockquant/trade-execution-service build`；集成命令前置构建通过 |
| `pnpm --filter @stockquant/trade-execution-service test:integration` | PASS，退出0（受控权限重跑） | 使用专用`trade_execution_test`与`portfolio_risk_test`。持久化幂等/重连、身份403矩阵与零副作用、治理授权、V2.4只读readiness、P5.7 Portfolio提交后丢响应/Trade重启/Outbox重试均通过。最终断言仅1笔Portfolio Fill，Cash `8997.9990`；FakeBroker模式 |
| `pnpm verify:stage -- --stage V2.4 --suite code` | PASS，退出0（受控权限重跑） | 合同/Fixture、全仓build/lint/typecheck/unit、隔离服务与数据库集成、V2.4 API/Web/CLI normal/rejection/recovery三场景、同Run只读核验、容器readiness边界均通过；`activeServicesTouched=false` |

初次在沙箱权限下运行时，构建通过但`trade_execution_test`不可达，脚本退出2，未运行后续测试；另一次V2.4完整套件在沙箱权限下因Qlib Worker无法绑定临时loopback端口退出1；两次失败均保留。随后以受控隔离服务/loopback访问权限重跑，Trade Execution集成和V2.4完整代码套件均退出0。脚本使用专用测试库/随机命名空间并精确清理；没有触碰活动服务。P5.7 smoke验证了新生成客户端的资源预留、Fill及UNKNOWN结算调用和响应丢失后的幂等恢复；V2.4 suite还复验Paper API、Web/CLI同Run和Linux容器边界。

该增量只推进V1.1的跨服务客户端子项，不关闭该子项整体、W1、V1.1或任何版本门禁。活动API切换与回退、客户端发布/版本治理、其余跨服务边界及人工验收仍未完成。
