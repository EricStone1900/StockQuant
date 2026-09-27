# P0.2 Research Automation route inventory

Date: 2026-09-27 (Asia/Shanghai)

This is a static inventory of the HTTP routes in `services/research-automation-service/src/bootstrap/main.ts`, matched against the OpenAPI documents and Platform callers. The `/v1/*` service identity gate applies before route handling; `/live` and `/ready` are health/readiness endpoints outside that gate.

| Route group | Routes | Contract / consumer state |
| --- | --- | --- |
| Experiment preparation and budget | `POST /v1/experiments`, `POST /v1/experiments/{id}/cancel`, `GET /v1/experiments/{id}/budget`, `POST /v1/experiments/{id}/budget/settle` | Created/cancelled/budget methods are in the V3.1/V3.3 Research OpenAPI and generated Platform client. `GET /v1/experiments/{id}` remains without an OpenAPI contract and has no Platform caller. |
| Promotion handoff | `POST /v1/promotions/prepare`, `POST /v1/promotions/submit`, `GET /v1/promotions/{id}/candidate-artifact` | Submit and candidate retrieval are documented in `research-automation-promotions.v1`; only the Platform-authorized submit method is generated for Platform. `prepare` is called in-process by the Research Automation submit coordinator; no HTTP client uses its separate route. |
| Runner dispatch and queue | `POST /v1/runner/jobs`, `GET /v1/runner/jobs`, `GET /v1/runner/jobs/cursor`, `GET /v1/runner/budgets`, `GET /v1/runner/jobs/{id}` | All Platform-consumed methods are in `platform-v33-research-queue.v1` and the 13-operation generated client. Dispatch is TestRun and RESERVED-budget bound. |
| Runner Host lease lifecycle | `POST /v1/runner/jobs/claim`, `POST /v1/runner/jobs/{id}/input`, `/heartbeat`, `/complete` | Four documented/generated operations in `research-automation-runner-host.v1`, scoped to the separate `runner-host` Bearer identity and fencing proof. |
| Runner utilities and legacy actions | `POST /v1/runner/jobs/validate`, `POST /v1/runner/jobs/{id}/retry`, `/cancel`, `/start` | `/cancel` now has a Platform-scoped OpenAPI operation and generated method because its persistent cancellation route is already authorized to Platform; it has no current Platform/Web feature caller and is not claimed as a delivered recovery workflow. `retry` remains without a contract and is not authorized by the service identity policy. `start` intentionally returns 410 because atomic claim replaced it. Validate is a validation-only utility. |
| Artifact I/O | `POST /v1/artifacts/validate`, `/publish`, `/read` | Publish/read are documented and generated for Platform; publish also supports the separately authenticated Runner Host lease-bound output path. Validation-only helper has no OpenAPI contract and no production caller. |
| Model gateway | `GET /v1/model-gateway/preflight`, `POST /v1/model-gateway/fixture-call` | Fixture call is documented/generated, marked test-only, and asserts zero external calls. Preflight is covered through `/ready` readiness facts for current consumers; the direct `/v1` route is not a current Platform dependency. |
| Health | `GET /live`, `GET /ready` | Runtime/health responses; `/ready` remains an intentionally direct Platform probe. |

## Outcome

Every Research Automation route currently called by Platform in the V3.1/V3.2/V3.3 flows is now described in OpenAPI and uses a generated client, except the direct `/ready` probe. Runner Host's four production lease callbacks are separately described and generated. The authorized Runner cancel endpoint also has a contract/client, but no product caller yet. Remaining undocumented routes are utility, legacy, in-process-only, or have no Platform/Web caller; this inventory does not treat them as delivered recovery features. A new consumer or supported user workflow for any such route must first get an explicit contract, caller scope, and failure/recovery tests.

This inventory does not establish full Research Automation product capability, durable production Runner availability, external model authorization, Ubuntu acceptance, or business/human stage acceptance. Those remain independently gated.
