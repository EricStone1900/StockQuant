# 2026-09-24 运行进度与 TDX 探针修复

## 运行结果

- V2.4 最终观察接口返回 `WAITING`、`8/20`、剩余12日；2026-09-24 已计入新的完整交易日。
- DC-08A 日终报告为 `PASS`：20只证券、48/48运行、960/960根5分钟Bar、0开放缺口、0待投递Outbox。
- DC-08A 观察汇总为 `5/20`，其中稳定完整日4、恢复后完整日1；该门禁仍为 `WAITING`。
- `pnpm v24:preflight`、`pnpm dc08a:supervise -- --check-only` 和 `pnpm dc08a:verify-automation` 均返回0。

## TDX 任务

工作日 11:35 和 15:20 的两个只读任务均实际触发，分别生成：

- `evidence/dc08a/dc-t19/2026-09-24/tdx-shadow-am.json`
- `evidence/dc08a/dc-t19/2026-09-24/tdx-shadow-pm.json`

两次结果均为 `PARTIAL`、0行，错误为 `PermissionError(1, 'Operation not permitted')`。这是当前执行
环境的 TCP 权限限制，不能据此判断 TDX 服务端能力；正式来源没有改变。

随后在允许 TCP 出站的本机受控环境中，用同一20只证券、同一交易日和10秒请求超时做只读复测，
结果为 `PASS`、960行、服务器 `121.37.207.165`、延迟约1315ms，退出码0，Hash 为
`a34fc8989ebbeca5f1299f52aeb9112d7b0062bcb82447dd976ddc87d6b3479d`。证据见
`evidence/dc08a/dc-t19/2026-09-24/tdx-shadow-manual-escalated.json`。这确认 TDX 候选源
在允许网络的环境具备20只窗口读取能力，但不替代两个自动任务的真实交易时段观察。

探针现在按仓库退出码约定处理：`PASS=0`、`PARTIAL/NOT_RUN=2`、`FAIL=1`；TDX 适配器将 socket
权限拒绝归类为不可重试的 `TCP_PERMISSION_DENIED`。20只顺序请求的外层超时预算也按证券数量放大，
避免把正常的串行请求误判为进程超时。定向测试为31/31，ruff和mypy通过。

## V3.1 当前可执行范围

V3.1 的无模型代码门禁和受限 Runner smoke 仍可复验；真实模型网关、宿主 Runner 分发、精确出站
allowlist、费用 reserve/settle 接线和原生 Ubuntu 证据仍未满足前置条件，阶段结论保持 `NOT_RUN`。

本次复验结果：`pnpm verify:stage -- --stage V3.1 --suite code` 在本机 PostgreSQL 环境返回0，
契约24项、research 单元24项、PostgreSQL 集成3项、platform API 单元28项和 Web typecheck
均通过；`pnpm v31:runner-smoke` 返回 `PASS`，normal=0、timeout=2、path-rejection=2、
oom=247 均符合预期。该结果仍属于无模型准备和边界验证，不改变 V3.1 真实闭环 `NOT_RUN`。
