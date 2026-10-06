# W9 三版本门禁刷新（2026-10-02）

本次在V3.4本地`code`套件通过并更新V3.4验收证据引用后，分别重新运行`node scripts/verify-version.mjs --version V1|V2|V3`。所有阶段文档结构和证据引用/Manifest校验通过，重复/缺失/意外验收行及invalid PASS计数均为0；三版整体仍INCOMPLETE。

| 版本 | 阶段状态 | 引用/Manifest/条目 | TestRun证据 | 主要未决 |
|---|---|---:|---|---|
| V1 | INCOMPLETE | PASS，48/8/9 | INCOMPLETE，17个历史ID缺结构化导出 | V1.1–V1.5阶段门禁、历史证据补档及用户验收 |
| V2 | INCOMPLETE | PASS，152/24/38 | INCOMPLETE，9个检查、6个未决 | 数据源授权与覆盖、Paper观察、V2.4/V2.5阶段门禁 |
| V3 | INCOMPLETE | PASS，162/35/38 | NOT_RUN，0个业务ID | V3.1–V3.4业务验证/观察/人工验收 |

三版Stage Documentation Audit均PASS。V3.4代码套件PASS只属于本地代码检查；不改变任何阶段的业务/人工状态。完整机器计数见[JSON快照](./2026-10-02-w9-after-v34-code-gate.json)。此前版本状态和失败证据不覆盖。
