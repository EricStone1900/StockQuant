# V1 P0 semantic review A95: V1.1-S2-L14 cross-service contracts and release matrix

Date: 2026-10-12  
Requirement: `V1.1-S2-L14`  
Responsibility package: P1

## Finding

The requirement has verifiable progress across generated clients, selected caller/route identity boundaries, service layering, isolated migrations and explicit timeout contracts. These are partial slices only. The complete V1 operation-to-route-to-consumer/request/response/identity/scope/domain-side-effect matrix is not closed, and no released-version compatibility run, active rollout/rollback, full paired restore, target Ubuntu run or current human acceptance proves the release workflow. Keep L14, P1 and V1 open.

## Evidence reviewed

- The current call graph scope was corrected in [A23](2026-10-11-v1-cross-service-route-matrix-a23.md): V2.3 multi-bar Replay routes are excluded from V1.4 formal Platform flow; V1.4 uses the Quant daily-backtest adapter.
- [A24](2026-10-11-v1-cross-service-route-matrix-a24.md) validates only the OD-014 Platform→Trade and Trade→Portfolio settlement edges, with bounded identity and execution evidence.
- [A25](2026-10-11-v1-cross-service-route-matrix-a25.md) covers rejection behavior for 13 protected V1 Trade write routes; it does not prove each route’s valid request binding or complete consumer map.
- [Generated-client inventory A02](2026-10-11-v1-generated-client-test-inventory-a02.json) reports 20 listed clients and 73 production-used methods with lexical same-client test references. The inventory explicitly does not prove assertion sufficiency or runtime behavior.
- [A43](2026-10-12-v1-gap-matrix-semantic-review-a43.md), [A44](2026-10-12-v1-gap-matrix-semantic-review-a44.md), and [A45](2026-10-12-v1-gap-matrix-semantic-review-a45.md) establish timeout-budget assertions for 6 Platform→Portfolio, 5 Trade→Portfolio and 2 Replay→Portfolio calls respectively; they do not complete L14.
- [Release-order Runbook](../../docs/operations/v1-service-release-order.md) is explicitly `PREPARED / NOT AUTHORIZED / NOT DEPLOYED`; isolated migration checks do not establish production rollout or rollback.

## Matrix update

A95 derives from A94 and changes only the current L14 semantic status/evidence. Its classification remains `OPEN`; no unchecked stage task is marked complete. Other 146 requirement rows retain their prior snapshots and have not been refreshed by this review.
