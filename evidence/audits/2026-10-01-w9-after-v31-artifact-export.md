# W9 gate recheck after V3.1 Artifact export

Date: 2026-10-01 (Asia/Shanghai)

The V3.1 Artifact export slice and stage evidence were added, then repository references and release gates were rechecked.

- `pnpm baseline:check`: exit 0 after the public ArtifactRef schema and API projection changes. Docs, contract and fixture checks passed; contract inventory is 177 JSON files, 116 schemas, 36 Fixture files and 98 compatibility rules. Docs reported 1,546 local Markdown links, 0 failures.
- `pnpm verify:version:evidence -- --version V1`: PASS, 19 references, 2 manifests, 3 manifest entries, no missing evidence.
- `pnpm verify:version:evidence -- --version V2`: PASS, 117 references, 14 manifests, 15 entries, no missing evidence.
- `pnpm verify:version:evidence -- --version V3`: PASS, 103 references, 15 manifests/entries, no missing evidence.
- `pnpm verify:version -- --version V1`, `V2`, `V3`: all correctly remain INCOMPLETE (exit 2). V1.1 now has a shared ArtifactRef schema and generated types, while producer/consumer migration and lifecycle, API/client release coverage and activity API cutover/rollback remain open. V2.3–V2.5 still have research, data/observation and current acceptance gaps. V3.1–V3.4 acceptance remains NOT_RUN; the V3.1 engineering code suite does not satisfy real RD-Agent/user acceptance.
- V2.3 full code suite exited 0 after the common Qlib ArtifactRef projection and includes the monorepo code/DB/auth checks, actual locked Qlib fit and TestRun/Web/CLI/export smoke. V1.1 and V3.1 full suites also exited 0 on the adjacent common-reference changes; Research Automation 169/169 unit, 21/21 PostgreSQL integration, Platform 114/114 unit tests, and Web typecheck passed. V3.1 used pinned Research image `sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730`; external model provider calls were 0. Exact isolated export runs are in [W1 audit](./2026-10-01-w1-v31-artifact-evidence-export.md).
- The first post-edit evidence-reference check detected the W1 audit's stale SHA-256 manifest. The manifest was regenerated before the final baseline/evidence checks; no business evidence or test data was changed.

NO_TRADE and no data-source authorization remain in effect. O1/O2 remain suspended pending authorization. No active service or market data collection was touched; this gate check does not change human acceptance records.
