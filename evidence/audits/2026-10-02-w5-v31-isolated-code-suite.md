# W5 / V3.1 isolated full code-suite run

Date: 2026-10-02 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V3.1 --suite code` exited 0 with every database-backed check pointed at a newly created disposable PostgreSQL container on an ephemeral loopback port. The wrapper used a pinned PostgreSQL image, random database credentials and names, bounded CPU/memory, read-only container root with tmpfs data, and removed the exact container in `finally`. No active service or business database was used.

The run passed the stage code gate, Research Automation lint/build, 34 Research unit-test files / 191 tests, 27 isolated PostgreSQL integration tests, V3.3 pagination probe over 66,100 synthetic rows, Fixture model-gateway HTTP smoke, production settlement rejection smoke, internal-only RD-Agent v0.8.0 `LiteLLMAPIBackend` chat and embedding against the fixed Fixture endpoint, Platform typecheck and 45 files / 156 unit tests, artifact owner-scope/evidence-export HTTP smoke, and Web typecheck. The RD-Agent backend calls produced two isolated model-run records, both `SETTLED`, with fixed Fixture usage and charges. No external Provider call was made.

The internal RD-Agent backend evidence is deliberately narrow: direct backend chat/embedding methods were exercised in the pinned dependency image with transport patched to the fixed internal Fixture gateway. This does not establish a complete RD-Agent controller/experiment, production provider wiring or egress enforcement, invoice reconciliation, Ubuntu behavior, market-data authorization, long-running observations, or human acceptance. Provider calls remain unauthorized and V3.1 acceptance remains NOT_RUN.

## Validation boundaries

- Disposable PostgreSQL image: `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`.
- Research image: `sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53`.
- Runner image: `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`.
- Temporary suite `testRunId`: `42e24ed8-c20e-42f6-b85a-64b173835b8c` (synthetic owner-scope HTTP smoke).
- RD-Agent backend smoke `experimentId`: `cdcc3f15-9e31-4441-ace6-934df9f420e9`; two modelRun IDs and usage/settlement details are recorded in [the backend Fixture audit](./2026-10-02-w5-rdagent-litellm-fixture-backend.md).
- Exit code: 0. External Provider calls: 0. Active services touched: false.

The disposable database wrapper and its complete console output were temporary execution materials under `/tmp`; this report records the relevant results and immutable image identities. Prior failed attempts remain preserved in the linked audits and were not replaced by this successful run.
