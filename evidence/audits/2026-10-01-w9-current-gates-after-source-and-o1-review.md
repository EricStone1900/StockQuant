# W9 三版总门禁复核（来源门禁与O1运行态复核后）

日期：2026-10-01（Asia/Shanghai）。只读执行版本总门禁，保留返回状态，不更改签署或阶段结论。

- `pnpm verify:version -- --version V1`：退出2，`INCOMPLETE`；V1.1 `PARTIALLY_IMPLEMENTED`，V1.2–V1.5的既有PASS保留；Acceptance缺失/意外ID均0；证据索引子检查PASS（34 refs/3 manifests/4 entries）。
- `pnpm verify:version -- --version V2`：退出2，`INCOMPLETE`；V2.1 PASS保留，V2.3/V2.4/V2.5 `PARTIALLY_IMPLEMENTED`；Acceptance缺失/意外ID均0；证据索引子检查PASS（138/19/20）。V2.4完整code套件通过不等于版本验收通过。
- `pnpm verify:version -- --version V3`：退出2，`INCOMPLETE`；V3.1–V3.4 `NOT_RUN`；Acceptance缺失/意外ID均0；证据索引子检查PASS（122/22/23）。

当前O1只读快照：0 enabled collection schedules、0 open gaps、0 pending outbox、calendar CLOSED、无next trigger，因此未产生观察日。活动Market Data仍为旧镜像，ready返回`LIVE_SOURCE`和executor `ENABLED`且没有新门禁字段；活动服务未改动、未触发来源请求。其真实运行边界见[O1运行快照](2026-10-01-o1-active-runtime-after-source-gates.json)。用户决定仍为`NO_TRADE`、无市场源授权，OD-008 OPEN。

以上门禁证明阶段/版本仍未完成；引用审计仅验证本地引用与Manifest Hash，不替代领域运行、合法授权、部署、观察或人工验收。
