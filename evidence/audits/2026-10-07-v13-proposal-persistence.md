# V1.3 Proposal 持久化工程切片

日期：2026-10-07。结论：治理 Proposal 首版持久化与人工决定储存通过单测和一次性 PostgreSQL 集成验证；V1.3交易流程仍 NOT_RUN，本审计不构成阶段验收。

## 实现范围

- Governance PostgreSQL 保存 Proposal 最新状态、幂等请求键和首个不可变版本快照；相同键同载荷回放同一 ID，异载荷冲突。
- owner/run 范围固定在记录上，owner 不匹配无法读取。批准/拒绝通过行锁串行化，并检查待决状态、版本、内容Hash、有效期、PAPER/FAKE和HOLD无腿规则；决策追加保存actor/reason。
- 仅 Platform API service identity 可提交 Proposal/decision；决定actor从受信任Platform请求头传入。浏览器还没有接入该端点，服务令牌不得下发浏览器。
- 此切片不创建Mandate、ExecutionAuthorization、风险/资金占用、订单、Fill或Portfolio流水。

## 验证

- `pnpm --filter @stockquant/decision-governance-service typecheck`：PASS。
- `pnpm --filter @stockquant/decision-governance-service test`：7 files / 32 tests PASS。
- `pnpm --filter @stockquant/decision-governance-service build`：PASS。
- `node scripts/run-isolated-postgres-command.mjs --url-env GOVERNANCE_PROPOSAL_TEST_DATABASE_URL:governance_proposal_test:governance_proposal_test -- node services/decision-governance-service/scripts/proposal-postgres-smoke.mjs`：PASS。使用`postgres:16.9-alpine`镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，绑定loopback随机端口；覆盖新增、同载荷重放、异载荷409、owner隔离、版本冲突、批准保存/回读。隔离容器/网络在结束时删除且复查不存在。
- 临时PG TestRun：`bf2389b2-e5bc-48aa-a6ae-9511bc1b38d0`；Proposal：`200b4e9e-5c46-40bc-98cf-c6edf1ce4397`；测试结束后位于临时DB，容器已删除，不是当前业务账户/订单。
- `pnpm docs:check`：4720 local links，0 failures。

## 限制与后续

没有治理HTTP隔离集成、Platform代理/Web页面、真实用户会话端到端、版本修订、审批后风险复核及授权、Trade/FakeBroker执行或订单证据。V1.3第2/7/8节和本计划P3仍未完成。历史2026-09-09人工签署仅针对其原有范围，不扩展到本轮实现。

## 当前增量源码 SHA-256

```text
dad12edfe95972c7f96b0bb5b8957f805a6ed39a86ae908cfcdf038962a38ed9  services/decision-governance-service/src/adapters/postgres-proposal-repository.ts
9daa4cd8ff4ef08e558e5e62041d770f7b6e888d84c11ab1b8983096d1553f20  services/decision-governance-service/src/application/governance-api.ts
f546aa4f59c4acb63aec1870c887f10b124380b6f0f2af8167cb6d18f7796e46  services/decision-governance-service/src/application/service-auth.ts
ba595110551a14d4e4823945d66860a0c2c675de8f405716f933e15d9a95ce26  services/decision-governance-service/src/bootstrap/main.ts
7091532ecbba40667bed18abf4200f906aec522ce94aefcfbf1b35bc7759e7a0  services/decision-governance-service/src/ports/proposal-repository.ts
96e07a3f12d2b98f8c817b5d56d3416b87aaca9412f66b78dda73a67723f8197  services/decision-governance-service/tests/unit/governance-api.spec.ts
10ea07c128666e021498203c8873917f4885db344b34486b434f4205f8333c2f  services/decision-governance-service/scripts/proposal-postgres-smoke.mjs
```
