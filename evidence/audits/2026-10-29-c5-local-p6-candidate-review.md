# C5 本地工程 P6 候选复核与签收包

日期：2026-10-29  
计划：`C5_LOCAL_ENGINEERING_V1`  
范围：本地合成 Fixture、CN_A / PAPER / FAKE；不含真实行情源、常驻策略、LIVE 或 V2.4/V2 整版验收。

## 结论

P1–P5必需工程项有对应记录，当前证据包的自动化退出条件通过。项目所有者于2026-10-29明确回复“确认验收通过”，因此`C5_LOCAL_ENGINEERING_V1`本地工程范围验收为PASS。该签收仅绑定本文件记录的候选指纹和范围，不代表V2.4完整阶段或V2整版通过。

| 包 | 复核结果 | 主要证据 |
|---|---|---|
| P1 场景和Fixture冻结 | PASS | [P1合同](./2026-10-28-c5-local-p1-scenario-contract.md)、输入和排程Fixture指纹见下 |
| P2 后台持久整链 | PASS | [P2审计](./2026-10-28-c5-local-p2-progress.md)、[最终Smoke](./2026-10-29-v24-paper-smoke-b95154f8d6aa48b6ae7c90ab1ad5dc38.json) |
| P3 日终与恢复 | PASS | [P3审计](./2026-10-29-c5-local-p3-progress.md)、最终Smoke中的重启/Incident证据 |
| P4 多日与30分钟运行 | PASS | [P4审计](./2026-10-29-c5-local-p4-progress.md)、实际计时`1,800,927 ms`及单次进程中断恢复 |
| P5 Web/CLI/手册 | PASS | [P5审计](./2026-10-29-c5-local-p5-progress.md)、专属Web TestRun及同Run CLI/导出 |
| P6 候选复核/交付 | PASS | 本文件记录的候选复核和所有者明确签收 |

## 候选指纹

- 基础提交：`1b691f5607a11c41cbcf377f52b9e5586c3957b9`。
- 工作区的`apps/ packages/ services/ scripts/ fixtures/ infra/ package.json pnpm-lock.yaml`跟踪文件差异二进制摘要：`9654a7f88e685060a473278389779faeeb62acc4a4dfe5754ceeff28a3d7be1f`。此摘要绑定当前完整源码差异集合，包含同工作区其他本地修改，不能单独作为干净分支/提交的替代品。
- C5专属新增浏览器场景`apps/web/tests/e2e/v24-c5-local-engineering.spec.ts` SHA-256：`32711906390cf21955d433880fa0cb24bb1759384a2810d2b24cb7bfb98fd78a`。
- Fixture `fixtures/v2/v2.4/c5-local-engineering-v1/input.json` SHA-256：`96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea`；授权排程`fixtures/v2/v2.4/c5-local-mandate-schedule-v1/schedule.json` SHA-256：`d2bc33ee1d8a7785ab1b6a6285536c8943095e05b3fa610420c01cba56dca500`。
- 依赖锁`pnpm-lock.yaml` SHA-256：`2721a56f132a5aa3f897a5c6ec68532fb5949e4bc5b7d99dc02f96a39d5561b7`；运行时Node `v24.1.0`、pnpm `10.34.5`，根包要求Node `24.1.0`。
- 专属Web TestRun `06e40938-b6aa-4116-adb6-ab6d8a0eba2c`导出Manifest SHA-256：`8e4232ac3a84331e7d70af32e5e43dadbdedc1fe3b7b3172219816f85701c1cc`；机器Smoke报告 SHA-256：`0027a5f114e406d01993e55c50700f08774bd997ff74336d94adda8e1102a2aa`；Web/CLI场景报告 SHA-256：`389d5a4b037464b8afdbd497c6f25509cbf0b224e003926bde1f66cb6a5927d1`。
- Smoke使用的Web镜像ID：`sha256:85a9b60389c7ef99401f62727be16648197621ae3e5c8f8ad30853db8db7ca92`；最终Smoke报告记录临时Web容器和镜像已删除、活动服务未触碰。当前Docker daemon不可访问，故未在本次候选复核中重新检查本机镜像。

## 自动证据与已知边界

P5隔离命令完整退出码为0，含API/Web/CLI和Chromium。C5专属Web场景5个评估会话覆盖BUY、SELL、HOLD×3，6项业务断言通过；未激活Mandate授权被拒且无订单/Fill副作用；关闭页面后重开恢复同一TestRun和持久Job；同Run CLI `--check-only`退出0；导出包`humanAcceptance`明确为`NOT_RUN`。同次完整Smoke的六个既有Web场景及同Run CLI通过，检查前后业务计数相同，临时数据库与容器清理完成。完整指令和机器证据详见上述P5审计及报告。

定向测试、Web typecheck/build、Platform build、证据导出测试16/16及文档链接检查通过（最终更新后14,504链接，0失败；V1阶段编号重复0）。`git diff --check`通过。P4报告另证明七会话Fixture、精确T+结算、30分钟单调时钟和一次SIGKILL后的恢复。历史失败仍保留在对应审计文件中，没有覆盖失败历史。

本次复核发现工作区有大量本地变更和未跟踪文件，因此上述源码摘要绑定整个指定目录的跟踪差异；候选不是独立提交，签收前如需改变任何源文件或Fixture，应重新运行受影响检查并更新指纹。20个合格实际交易日为`DEFERRED / NOT_RUN`；真实来源、常驻策略/LIVE、Ubuntu、收益质量、V2.4原完整范围及V2整版仍未通过，也不由本地范围签收推定通过。

## 所有者验收记录

- 当前候选：以上源码差异摘要及Fixture/运行证据。
- 人工验收：`PASS（C5_LOCAL_ENGINEERING_V1，本地工程范围）`。
- 所有者签收/日期：项目所有者于2026-10-29明确回复“确认验收通过”。
- 签收边界：20个合格实际交易日继续`DEFERRED / NOT_RUN`；真实来源、常驻策略/LIVE、Ubuntu、收益质量、V2.4原完整范围及V2整版未通过。
