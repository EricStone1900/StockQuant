# V3.2 Readiness-only TestRun release review

Status: **PREPARED / NOT AUTHORIZED / NOT DEPLOYED**. This review covers only the W6 readiness metadata slice in the current worktree. It does not approve V3.2 business execution, candidate validation, Registry changes, Paper, data-source access, or the broader W8 maintenance operation.

## Scope and deployable artifacts

Affected runtime services are `platform-api-service` and `web`. Platform adds owner-scoped `POST /api/v1/acceptance/v3/v3.2/runs` and same-owner `GET /api/v1/acceptance/v3/v3.2/runs/{testRunId}`; Web adds preparation-only buttons and same-ID readback on `/acceptance/v3/v3.2`. Supporting changes add request/result schemas and the OpenAPI operation contract. No other service or database owner changes in this slice.

Current local images were built from the uncommitted worktree for `linux/amd64` on Mac M1 emulation:

| Service | Tag | Image ID | Target |
|---|---|---|---|
| Platform API | `stockquant-w8-v32-platform-api:20260930` | `sha256:87ae0c894f84b448e78b96c0ad54b9d6ab9a764b38f64ef3fa6122530e42130f` | `linux/amd64` |
| Web | `stockquant-w8-v32-web:20260930` | `sha256:4f8a9b792bbbcf902a1712b89098b92406149c65a75c61033fed14e98f724da2` | `linux/amd64` |

Image build and static container-boundary evidence is [here](../../evidence/audits/2026-09-30-w8-v32-current-images.md). These local tags have no registry signature/provenance and have not been tested on Ubuntu. Do not treat them as release artifacts.

## Persistence and migration impact

The route writes a `WAITING` row to the existing Platform-owned `acceptance_stage_runs` table with scenario version `v3.2-readiness-v1`, status `WAITING`, assertions `NOT_RUN`, and evidence marking `sourceMode=READINESS_ONLY`, candidate execution and Registry mutation `NOT_PERFORMED`, and Paper calls zero. There is no new table, column, index, enum value, or cross-service database write. The existing startup migration already creates this table idempotently; the status check accepts `WAITING`. GET is read-only and owner scoped. Rows are append-only evidence; rollback must retain them.

The integration test used the dedicated `platform_api_test` database and a disposable Nest application. It verified persistence and the real HTTP route, including anonymous, invalid-body, cross-owner, cross-stage and exact accepted V3.1 prerequisite cases. In the latter case only the V3.1 prerequisite becomes `VERIFIED`; V3.2 business assertions and human acceptance remain `NOT_RUN`. Complete code-suite evidence is [W6 readiness TestRun audit](../../evidence/audits/2026-09-30-w6-readiness-testrun.md).

## Release gates and rollback

Do not deploy until the project owner has approved a specific maintenance window and the W8 prerequisites in the [cluster maintenance review](./2026-09-30-w8-maintenance-package.md) are met. This includes a successful real cluster/Artifact paired backup, confirmed rollback owner and backup destination, exact production secret references, verified service dependencies, and a healthy Platform readiness check. The maintenance package's latest known Platform container was unhealthy; that known-bad digest is not an acceptable recovery target. Do not run `compose down`, recreate PostgreSQL, alter volumes, or restart Market Data as part of this slice.

Before a future deployment, confirm the V2.4 sampler is still `STOPPED`, V2.4 auto-start and source approval remain disabled, no active write/UNKNOWN state exists, the Platform service Bearer is valid, and Web uses the approved authenticated session path. The local identity header is test-only; its production setting and real authenticated browser session must be verified before release. Validate the exact image IDs, health, POST/GET owner isolation, and `WAITING`/`NOT_RUN` facts without any candidate, Registry, or Paper side effect.

If Web fails, restore its exact previous digest. If Platform fails, stop the release and restore only the reviewed previous digest/config after preserving logs and new TestRun rows; the last known Platform digest was unhealthy, so rollback to it does not count as recovered service. Never delete readiness rows or shared data to make rollback appear clean. Record before/after health, digest, exit codes, browser traces and persisted assertions. Do not sign user acceptance from these deployment checks.

No deployment, migration, credential change, container operation, database write, or active-service request was made while preparing this review. The package is one slice-specific deployment review, not completion of W8's whole-system migration or release gates.
