# V1.3 责任映射 A02

日期：2026-10-10。A31中V1.3第2/7/8节20条现存来源行已人工核对主责与协作方。结构化明细见[JSON](./2026-10-10-v1-v13-responsibility-a02.json)，SHA-256 `cafc17445cd9aac01e97b438613e3191ea7d271d6168884fb76c603a5664df26`。本映射厘清责任，不改变交付或验收状态。

| 要求 | 主责 | 协作/外部动作 |
|---|---|---|
| `V1.3-S2-L13` | decision-governance-service + portfolio-risk-service | trade-execution-service; platform-api-service |
| `V1.3-S2-L14` | trade-execution-service (FakeBroker component contract) | platform-api-service; portfolio-risk-service |
| `V1.3-S2-L15` | trade-execution-service | decision-governance-service; portfolio-risk-service; platform-api-service |
| `V1.3-S2-L16` | platform-api-service (scenario orchestration) | trade-execution-service; shared scenario/Fixture owners |
| `V1.3-S2-L17` | each service owning a server-side accept/write path | decision-governance-service; trade-execution-service; portfolio-risk-service; platform-api-service |
| `V1.3-S7-L62` | packages/contracts + Platform scenario owner | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L63` | domain service owners | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L64` | apps/web + platform-api-service | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L65` | Platform/runbook owner | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L66` | shared test harness and domain owners | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L67` | domain service owners + operations owner | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L68` | project owner / human acceptor | Platform, domain service owners, and project operator as applicable |
| `V1.3-S7-L69` | Platform/stage documentation owner | Platform, domain service owners, and project operator as applicable |
| `V1.3-S8-L73` | Platform/code-suite and evidence scripts | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L89` | Platform/runbook and evidence owner | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L109` | stack scripts/operator | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L127` | apps/web + platform-api-service | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L142` | verify-stage/evidence-export scripts and domain owners | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L177` | domain owners plus operations recovery operator | service owners for authoritative facts; operator/project owner for host and human actions as applicable |
| `V1.3-S8-L185` | Platform acceptance records | service owners for authoritative facts; operator/project owner for host and human actions as applicable |

## 边界

V1.3仍为`PARTIALLY_IMPLEMENTED`。未完成的全市场规则、恢复边界、目标Ubuntu以及本轮人工验收保持开放。责任归属审计不替代需求实现、测试证据或用户签署。
