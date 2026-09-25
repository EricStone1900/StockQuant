# P3.5 双市场模拟账户切片

日期：2026-09-25（Asia/Shanghai）。

## 改动

- 新增 `POST /api/v1/acceptance/runs/:testRunId/accounts/us`，要求已认证的本地 acceptance owner，并把 US 账户绑定到原 V1.1 TestRun namespace。
- US 账户固定使用 `US_EQUITY`、`PAPER`、`FAKE`、`us-paper-empty-10000-usd` 和 10000 USD；跨 owner 或不存在的 V1.1 TestRun 不会创建账户。
- 重复初始化复用 Portfolio 的幂等键，返回同一 accountId 和 `replayed=true`，不增加账本条目。
- V1.1 Web 增加“双市场模拟账户”区域，支持初始化 US 账户、显示市场/现金/持仓/账本，并将 US accountId 保存到 localStorage 以便刷新后重新读取。

## 自动化验证

- `pnpm --filter @stockquant/platform-api-service test`：10 个测试文件、35/35 通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：退出 0。
- `pnpm --filter @stockquant/web typecheck`：退出 0。
- `pnpm build`：全仓构建通过，Web bundle 构建通过。
- `pnpm docs:check`：470/470；`pnpm contracts:check`：24 个 JSON、14 个 Schema、8 个 Fixture 实例通过；`git diff --check`：退出 0。

## 真实运行时验证

- 受影响的 `platform-api-service` 和 `web` 镜像已重建并部署；`/ready` 返回 `brokerMode=FAKE`。Compose 因依赖关系重新创建了 `research-automation-service`，健康检查通过；没有重建数据库卷、Portfolio、交易执行器或行情服务。
- 真实 API 创建 V1.1 normal TestRun：
  - `testRunId=69d82c69-e955-4685-aca0-5e1d183a56a1`，状态 `COMPLETED`。
  - CN 账户 `c0ffd329-9fc8-4671-9641-9ad64c71d936`：`CN_A`，`10000.0000 CNY`，0 持仓，1 条账本。
  - US 账户 `cf9c9b16-af5e-4378-bda8-9f1009271ee8`：`US_EQUITY`，`10000.0000 USD`，0 持仓，1 条账本。
  - US 第二次初始化返回同一 accountId，`replayed=true`；账户详情返回 `v1-account-detail-1`。
- Web 页面真实点击初始化 US 账户后显示 `US_EQUITY` 和 `10000.0000 USD`；刷新前后 accountId 均为 `10390fad-dd0f-4405-9c26-10968dd61f16`。
- P3.5 前后 `pnpm v24:preflight` 均通过：平台、行情服务、日历、实时行情探针为 `PASS`；V2.4 scheduler 保持 `RUNNING`、30 分钟采样、`PAPER + FAKE`。

## 状态与边界

P3.5 的代码、自动化验证、API 运行时和 Web 刷新验证完成。该切片仍不代表用户人工验收签署；V1.1/P3 的人工结论保持 `NOT_RUN`。US 真实行情、真实券商和 LIVE 写入均未启用。
