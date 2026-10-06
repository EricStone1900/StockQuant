# W9 版本门禁复核（2026-09-30 09:56Z）

复核对象：当前工作树中的 V1、V2、V3 阶段表和版本验收表。执行命令：

```text
pnpm verify:version -- --version V1
pnpm verify:version -- --version V2
pnpm verify:version -- --version V3
```

三条命令均退出码 2，结果均为 `INCOMPLETE`。V1 未关闭阶段：V1.1（PARTIALLY_IMPLEMENTED）；V1.2–V1.5仍保留其历史PASS。V2未关闭阶段：V2.3、V2.4、V2.5（均PARTIALLY_IMPLEMENTED）；V2.1、V2.2为PASS。V3.1–V3.4均为NOT_RUN。三个结果的`missingAcceptance`和`unexpectedAcceptance`均为空，表示阶段 ID 与验收表 ID 当前对应；`uncheckedVersionGate=true`，版本级门禁仍未勾选。

V2.4验收摘要已包含2026-09-30隔离Fixture Web/API三场景、同run只读CLI和接受响应丢失恢复证据，但当前活动Paper、有效行情授权、20日观察及当前范围人工验收仍未完成。V2.3的Qlib证据限于合成数据拟合/预测，生产研究路由及真实市场数据缺失。V3阶段即使有代码套件与固定Fixture集成证据，业务场景与Web人工验收仍保持NOT_RUN。

边界：此脚本核对Markdown状态和阶段/验收ID对应关系，不读取全部原始业务TestRun、逐项要求、证据Manifest、截图/Trace或用户签署，也不证明部署状态。本记录不把脚本的结构检查提升为完整W9验收。完整逐阶段证据与用户人工确认仍需后续核验；不得通过勾选状态制造PASS。
