# W1 V2.3 Qlib Artifact lifecycle increment

Date: 2026-10-01 (Asia/Shanghai)

## Change

The V2.3 Qlib Fixture Artifact repository now persists `PUBLISHED`, `RETAINED`, or `EXPIRED` status and optional immutable `expires_at`. Existing rows migrate as `PUBLISHED` with no expiry, so this change does not invent a retention period. Status transitions are constrained in PostgreSQL: publication may be retained; published/retained content may expire only after its configured deadline; terminal expired content cannot be revived. Owner-scoped TestRun projection reads current lifecycle state from the repository. Artifact download continues for published/retained content and returns not-found after expiry.

The lifecycle remains implemented on the Qlib-specific content repository; it is not yet a shared cross-service content store. Expiry can only be added once and never changed. No policy currently sets an expiry automatically.

## Verification

- Platform typecheck passed.
- Platform unit tests passed: 42 files, 143 tests.
- Focused PostgreSQL lifecycle integration passed against the dedicated `platform_api_test` database. It verified migration, expiry immutability, PUBLISHED→RETAINED, early-expiry rejection, expiry after the stored deadline, EXPIRED projection, download denial, and no revival. The test removed only its own random TestRun and Artifact rows.
- `pnpm verify:stage -- --stage V2.3 --suite code` ran through the full build/lint/typecheck/unit/contract/Fixture/Ops and isolated service checks, including the locked Qlib fit and V2.3 HTTP/TestRun/Artifact/export smoke. The Qlib/Platform smoke reported PASS, owner read 200, foreign owner 403, CLI check-only 0, export Manifest with two entries, and exact isolated database/container/image cleanup.
- The first sandboxed full-suite attempt hit the known loopback `EPERM`; the controlled local retry permitted the isolated worker and Qlib HTTP test. This is an environment restriction, not a product-test failure.

No external market source, model provider, broker, active business service, or real trade was used. `NO_TRADE` remains in force, source authorization remains absent, and human acceptance remains pending.
