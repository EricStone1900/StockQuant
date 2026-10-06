# W1 Platform Qlib Artifact repository port increment

Date: 2026-10-01 (Asia/Shanghai)

The Platform API Qlib Fixture Artifact PostgreSQL adapter was previously instantiated in the bootstrap container and exposed to request handlers as its concrete class. Added `QlibFixtureArtifactRepository` under `src/ports`; the Postgres adapter now implements that port and the bootstrap composition root types the dependency against the port while continuing to instantiate the same adapter. Existing immutable content-addressed IDs, payload SHA-256 verification, TestRun binding, owner scoping, conflict behavior, and 404 handling are unchanged.

Validation: Platform API typecheck PASS; Platform unit suite PASS (42 files, 139 tests); Platform layer scan PASS. The first full V2.3 code-suite attempt exited 1 because the restricted process could not bind the Qlib Worker test's loopback socket (`EPERM`). The authorized local rerun of `pnpm verify:stage -- --stage V2.3 --suite code` exited 0. Its isolated Platform -> Quant Research -> locked Qlib Worker -> PostgreSQL TestRun smoke passed, including durable Artifact persistence/read (200), foreign-owner read rejection (403), same-run CLI `--check-only` (0), evidence export and precise temporary database/container/image cleanup. The Qlib model and input were synthetic fixtures; external source calls and broker calls were 0.

This is one persistence boundary extraction, not completion of the shared Artifact lifecycle. Qlib still uses a dedicated table/media contract, other Artifact producers retain their own stores, and retention/promotion lifecycle, active API rollout/rollback, human acceptance, real market data and Ubuntu evidence remain open. No active service, data source, model provider or broker was contacted.
