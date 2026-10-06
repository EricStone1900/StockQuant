# W9 V2.3 Artifact 离线导出后的门禁复核

V2.3完整Code suite退出0；隔离Web运行的TestRun `bf32f747-0339-40f6-bb53-37a4401fa1bf` 持久模型/预测Artifact，并经owner API读取200、foreign owner拒绝403。离线证据导出同时包含`evidence.json`与`qlib-fixture-artifact.json`，双条目Manifest哈希`c9edc81524861023f954fe337d4d526894bf5653c705a3ad10014e6709b7d406`。CLI check-only与导出前后Artifact无变化；清理通过。

V1/V2/V3门禁仍均为INCOMPLETE/exit 2；未解决阶段V1.1、V2.3/V2.4/V2.5、V3.1–V3.4，Acceptance ID缺失/意外均0。证据引用检查PASS，分别17/113/98条引用、1/12/13个Manifest及2/13/13个Manifest条目。

NO_TRADE且无线源授权；未请求外部行情/模型Provider，也未连接券商。真实市场/PIT、独立模型验证、新增V2.3研究能力人工签署、O1/O2及Ubuntu观察条件仍未完成。机器摘要见[JSON](./2026-10-01-w9-v23-artifact-export-gates.json)，内容Hash见[Manifest](./2026-10-01-w9-v23-artifact-export-gates.sha256)。
