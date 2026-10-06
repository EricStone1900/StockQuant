# W5/V3.1 isolated code suite after shared Artifact leaf-symlink hardening

Captured: 2026-10-03 05:02 Asia/Shanghai. This run checks the shared Artifact content store after the `O_NOFOLLOW` leaf-path change.

The first sandboxed suite attempt stopped at a temporary loopback listener (`EPERM`). Its controlled retry correctly refused to run the internal Model Gateway test until an exact current-source Research image digest was supplied. The previous local image ID (`sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53`) was from an earlier source state. Rebuilt `services/research-automation-service/Dockerfile` for `linux/arm64`; the exact image used was `sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`.

Command: `STOCKQUANT_RESEARCH_IMAGE_ID=<exact image ID> pnpm verify:stage -- --stage V3.1 --suite code`. Exit code: 0. Research Automation: 36 unit files / 203 tests and 4 integration files / 28 tests passed. Platform API: 46 unit files / 166 tests passed. Contract generation/drift checks passed; the isolated V3.1 Artifact owner-scope HTTP/export smoke passed with TestRun `7917fa80-4f30-43d3-b7b3-4a2613118439`, exact input/output bytes, anonymous 401, foreign owner 403, unlisted artifact 404, and no overwrite on repeat export. LiteLLM-compatible Chat and Embedding were exercised through the internal fixed Fixture gateway; external Provider calls were 0. The TestRun remains synthetic acceptance evidence and does not change V3.1 business/human acceptance.

The suite reported `activeServicesTouched=false`; no market-data source, Paper account, broker, or external Provider was called. The temporary suite containers/networks were removed. A read-only Docker check found no remaining `sq-litellm-*` container. This validates the shared Artifact file edge against isolated consumers; it does not prove real RD-Agent/Provider use, market-data research, Ubuntu, O1/O2 observation, or user sign-off.

Complete command output is retained in [the log](./2026-10-03-w5-v31-after-artifact-leaf-hardening.log). Machine-readable assertions and source/output hashes are in the companion JSON and SHA-256 manifest.
