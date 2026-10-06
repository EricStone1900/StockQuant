# W9 当前版本门禁复核

日期：2026-10-02。V1、V2、V3均以当前工作树执行 `pnpm verify:version -- --version <version>`，各自退出码均为2、状态均为`INCOMPLETE`。这是计划要求的未完成证据/观察/人工签署状态，并非代码测试失败。

三版阶段文档审计和证据引用/Manifest检查均PASS，`invalidPassClaims=0`，Acceptance映射无重复/意外条目。引用/Manifest/条目分别为V1 74/8/16，V2 189/28/36，V3 179/38/45。所有本版阶段仍未关闭：V1.1–V1.5、V2.1–V2.5、V3.1–V3.4；其中已有历史签署和PASS继续按其原范围保留，未将历史运行或本轮V1.4 code suite扩成当前版本PASS。

完整机器输出见[JSON](./2026-10-02-w9-current-version-gates-after-v14-code-suite.json)与[SHA-256](./2026-10-02-w9-current-version-gates-after-v14-code-suite.sha256)。本复核只验证当前版本门禁如实返回INCOMPLETE，不证明三版业务验收、真实数据/模型、Ubuntu、观察期或用户签署已完成。
