# W1 Artifact stale-report quarantine guard

Date: 2026-10-02 (Asia/Shanghai)

## Change

Artifact orphan quarantine now requires an ArtifactRef snapshot read after the check-only scan. The operator script refreshes `research_artifact_refs` immediately before quarantine; if any proposed candidate gained a reference since the scan, the operation stops and requires a fresh scan after publishers are paused. This closes the stale-check gap where a just-published output could have been moved based on an old orphan report. No retention period or automatic expiry was introduced; OD-013 remains open. The integration remains explicit maintenance-only and operates only on V3.1 Research-owned input/output namespaces.

## Verification

- Research Automation build and lint: PASS.
- Research Automation unit tests: 183/183 PASS, including refusal to quarantine a newly referenced candidate without moving its bytes.
- PostgreSQL V3.1 preparation integration adds a race regression: create an orphan report, commit the exact immutable ArtifactRef, reload current references, require quarantine refusal, and verify the content still reads correctly. This assertion passed in the final full V3.1 code suite.
- `pnpm verify:stage -- --stage V3.1 --suite code`: exit 0 against current-worktree linux/amd64 image `sha256:2cbe671b1980efde0e69805062122b7275af48cb85cb583ab4118c20548cf776`. The run covered contracts, service lint/unit/isolated PostgreSQL integration, internal LiteLLM-compatible fixture smoke, Platform checks, owner-scoped artifact HTTP smoke, and Web typecheck. Model/provider calls were 0; the fixture smoke used an internal-only Docker network. Active services were not touched.

## Limits

The pre/post reference snapshots are not a cross-system transaction with the filesystem. The operator must still stop all Research Artifact publishers and Runner Host before maintenance quarantine, as required by the CLI. The new test proves stale-reference detection, not the full cross-owner retention protocol or a concurrent publisher race under production traffic. No real Artifact volume was inspected or modified, and no artifact was quarantined in this verification.
