# W9 gates after V1.4 SELL and settlement increment

Date: 2026-10-02 (Asia/Shanghai)

`pnpm baseline:check` passed. After the sell-slippage input guard was added and historical source manifests were relabeled as point-in-time snapshots, V1, V2, and V3 evidence-reference/SHA-256 gates passed with 74/170/178 references, 9/28/39 manifests, and 19/53/51 manifest entries respectively; missing files and hash failures were zero. Version gates remain `INCOMPLETE` with exit code 2. Stage-document audits pass, with no invalid PASS claims, duplicate acceptance rows, or unexpected acceptance rows.

The current V1.1 active-database snapshot rehearsal additionally verified that 49 legacy rows with 44 pre-existing shadows can be backfilled by exactly five rows with zero parity mismatches; no active cutover was performed. Its maintenance window and review of two historical RUNNING rows plus one WAITING row remain prerequisites. V1.1 code suite and focused migration tests passed.

The first check found that an older T+1 source manifest had become stale after further implementation edits. The historical report was retained as a point-in-time artifact; the V1.4 stage document now points current-code verification at the SELL/settlement audit and labels the T+1 manifest historical. The V1 evidence gate passed again after the latest code and documentation updates. No market/provider, active service, Paper/Broker, or user sign-off was touched. The complete V1.4 code suite also passed after the 10,000-bps sell-slippage input guard; see the linked stage audit. This remains an evidence-integrity and code-verification result, not business acceptance.

The current-worktree V3.1 bounded-response increment also passed the full code suite against image sha256:523103f19fa5e492aea8559625e284129a9ee7387ed0423661b30983fc6b1260 (Research 195 unit/27 isolated-PG integration; Platform 162 unit); external Provider calls were zero. The ordinary-sandbox loopback EPERM attempt remains recorded. V1 historical TestRun payload gaps, incomplete business stage work, human acceptance, observation prerequisites and Ubuntu evidence remain unresolved. `NO_TRADE` and no source authorization remain in force.
