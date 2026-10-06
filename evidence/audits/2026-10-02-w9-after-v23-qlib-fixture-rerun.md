# W9 三版本门禁刷新：V2.3 Qlib Fixture复验后

2026-10-02在V2.3新增合成Qlib Fixture TestRun及W4审计后，重新执行V1/V2/V3版本门禁。三版仍`INCOMPLETE`；阶段文档与证据引用/Manifest均PASS，无invalid PASS、缺失验收或意外验收行。

| 版本 | 文档 | 引用/Manifest/条目 | TestRun门禁 | 未决阶段 |
|---|---|---:|---|---|
| V1 | PASS | PASS，48/8/9 | INCOMPLETE，17个历史TestRun关联未解决 | V1.1–V1.5 |
| V2 | PASS | PASS，162/26/48 | INCOMPLETE，10个ID中6个关联未解决 | V2.1–V2.5 |
| V3 | PASS | PASS，168/37/42 | NOT_RUN，尚无正式业务TestRun | V3.1–V3.4 |

V2新增加的TestRun是合成Fixture工程证据，不关闭真实市场输入、PIT、独立模型验证或新范围人工验收。所有历史TestRun导出缺口、无源授权、观察、Ubuntu及人工确认条件继续开放。完整机器快照见[JSON](./2026-10-02-w9-after-v23-qlib-fixture-rerun.json)。
