# 2026-10-01 零外发代码回归与 V3.1 阻塞记录

日期：2026-10-01（Asia/Shanghai）

本轮在当前工作树执行代码套件，未请求市场数据、未调用真实模型、未连接真实券商、未修改活动服务或策略 Registry。所有模拟交易仅运行于随机隔离测试数据库/容器。

| Stage | Command | Result | Scope / limit |
|---|---|---|---|
| V1.1 | `pnpm verify:stage -- --stage V1.1 --suite code` | PASS / exit 0 | baseline、contracts/fixtures及阶段代码；不代表既有人工验收重新签署。 |
| V2.3 | `pnpm verify:stage -- --stage V2.3 --suite code` | PASS / exit 0 | Python/服务认证隔离集成、锁定 Qlib 0.9.6 Linux AMD64 Fixture 拟合与确定性Hash；无真实市场数据、无收益声明。 |
| V2.4 | `pnpm verify:stage -- --stage V2.4 --suite code` | PASS / exit 0 | FakeBroker 隔离HTTP/PG normal/rejection/recovery、多服务容器边界；模拟订单/成交只存在于随机测试库，`activeServices=NOT_CONNECTED`、真实来源授权缺失、O2未运行。 |
| V2.5 | `pnpm verify:stage -- --stage V2.5 --suite code` | PASS / exit 0 | 当前共用 base suite、Market Data 隔离PostgreSQL、Python Adapter 与服务身份；没有执行来源探针/采集或分钟数据业务验收。 |
| V3.2 | `pnpm verify:stage -- --stage V3.2 --suite code` | PASS / exit 0 | 合成候选独立复算、owner-scoped READINESS_ONLY、隔离PG与 Linux AMD64 容器重启读取；`businessValidation=NOT_RUN`、Registry正式变更未执行、人工验收NOT_RUN。 |
| V3.4 | `pnpm verify:stage -- --stage V3.4 --suite code` | PASS / exit 0 | 当前全仓 build/lint/typecheck/test 与 prerequisites-only code preflight；`ubuntuValidation=NOT_RUN`、完整阶段工作流NOT_IMPLEMENTED、人工验收NOT_RUN。 |
| V3.1 | `pnpm verify:stage -- --stage V3.1 --suite code` | INCOMPLETE / exit 2 | 169/169 单测、21/21 Research PG 集成和前置Fixture smoke通过；LiteLLM内部兼容烟测因未提供当前工作树 Research 镜像的固定 digest 而停止。真实模型调用数0。 |

V3.1 的首轮受限沙箱执行还因本机 `127.0.0.1:5433` socket 权限被拒；在为隔离代码套件开放loopback后，PG集成全部通过。后续镜像构建因Docker build context会包含未忽略的 `.env.local` 而被自动审查拒绝；本记录不尝试缩窄或绕过该context规则。需要采用由审查接受的凭据隔离构建流程后，才可运行依赖精确镜像digest的internal-only Fixture烟测。该烟测依然不会授权或替代真实 Provider 调用。

项目所有者此前确认 `NO_TRADE` 且暂无线源授权：O1/O2不得恢复调度、来源请求或交易；只读刷新仍为8/20、最近有效日2026-09-30；Market Data启用订阅数为0。Health API只读返回UNHEALTHY，原因是无下一触发时间；相关容器均仍运行/健康，未重启或更改。真实 RD-Agent/Provider 调用另有显式门禁；当前凭据只通过权限/存在性预检，`liveCallsAuthorized=false`，本轮没有触发任何费用。V1/V2/V3版门禁仍需保留 `INCOMPLETE`，此代码回归不等于业务、观察、Ubuntu或人工验收完成。
