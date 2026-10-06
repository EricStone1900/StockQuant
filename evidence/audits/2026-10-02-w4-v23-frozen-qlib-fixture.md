# W4 V2.3 冻结 Qlib 合成输入审计

日期：2026-10-02。范围：将 V2.3 Qlib Fit TestRun 使用的 120 行内存生成输入固定为独立版本化 Fixture，并确保 Platform 实际运行入口校验并消费该文件。

`fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json` 的字节 SHA-256 为 `1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e`。Manifest `v2.3-qlib-fit-input-1` 将其标为 `FIXTURE/SYNTHETIC/SIMULATION_ONLY`。Platform Qlib Fixture 构造器从该文件加载内容，每次调用前读取 Manifest 并重算原始字节 Hash；Manifest 缺失、不匹配或输入维数/切分错误时失败关闭。单测逐字节核对冻结文件、预期 SHA 和请求对象。

验证：

- `pnpm --filter @stockquant/platform-api-service test -- tests/unit/v23-qlib-fixture.spec.ts`：Vitest 脚本按包配置执行了全部 Platform 单测，162/162 PASS。
- `pnpm --filter @stockquant/platform-api-service build`：PASS。
- `pnpm fixtures:check`：20 个 Fixture 文件，0 错误；V3.2 确定性输入校验 PASS。
- 首次受限环境执行 `pnpm verify:stage -- --stage V2.3 --suite code` 被 Qlib Worker 本机 loopback bind 的 EPERM 阻止；保留为环境失败，不计 PASS。
- 经批准的受控本机重跑 `pnpm verify:stage -- --stage V2.3 --suite code`：退出码 0。全仓基线、contracts/fixtures、build/lint/typecheck/unit、隔离数据库与服务身份检查以及锁版 Qlib 0.9.6/LightGBM 4.7.0 容器 smoke 通过；120 行合成输入拟合重复运行，24 个预测有限、模型/预测 Hash 稳定，非法重叠切分返回 422。新增的完整隔离 Web→Platform→Quant→Qlib HTTP/Chromium/CLI/export 验收通过，TestRun `9cf9195d-2ed4-440b-bc2c-83403134fd4f`，Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`，导出 Manifest SHA-256 `fb4f3bf58d7c0ecec5595a478737c5200142adf79e43039adf8a8ff765f6b775`。foreign owner 拒绝、CLI `--check-only` 退出 0 且无修改。随机 Platform/Quant 数据库、网络、Worker 容器/镜像和共享内容目录已清理。

导出载荷：[TestRun evidence](../local/V2.3/9cf9195d-2ed4-440b-bc2c-83403134fd4f/evidence.json)、[Qlib Fixture Artifact](../local/V2.3/9cf9195d-2ed4-440b-bc2c-83403134fd4f/qlib-fixture-artifact.json)、[逐项SHA-256清单](../local/V2.3/9cf9195d-2ed4-440b-bc2c-83403134fd4f/manifest.sha256)。清单文件自身 SHA-256 为上述 Manifest Hash。

## 2026-10-02 Run代码身份绑定补验

复核发现上一Run `9cf9195d-2ed4-440b-bc2c-83403134fd4f`未在TestRun证据内记录源码工作区Hash；该旧证据原样保留，不作为满足此项的最终Run。现隔离Harness为 Platform 注入由161个精确源码/测试/锁/合同/Fixture文件计算的 `codeVersion=sha256:14a0ab307beac4a0ff0cadac7a78c463ca18d1b3fbc5ffe10529128fb7958a2c`，应用将其持久化在TestRun evidence；Harness断言Hash精确匹配，导出后TestRun与Artifact数据库内容仍不变。完整 `pnpm verify:stage -- --stage V2.3 --suite code`受控重跑退出0，新Run `b5a6db53-e78d-4bf8-8151-d10fbf421e12`，Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`，导出Manifest SHA-256 `ecc056fb3726e21999e21f607ae5b11c4aec3977b698b399854579eb467f7cfc`。其[TestRun evidence](../local/V2.3/b5a6db53-e78d-4bf8-8151-d10fbf421e12/evidence.json)和[逐项SHA-256 Manifest](../local/V2.3/b5a6db53-e78d-4bf8-8151-d10fbf421e12/manifest.sha256)可离线核验。

边界：本次只是冻结并实用化合成回归数据。没有请求行情、Provider、Paper 或 Broker；没有真实市场授权、PIT/幸存者偏差证据、独立模型验证、盈利结论、Ubuntu 或用户人工验收。V2.3/W4仍不因此通过。
