# W9 version-gate refresh after V1.3 domain slice

Date: 2026-10-06. Re-ran the formal V1, V2, and V3 version gates after refreshing the current V1.3 source manifest and marking the prior contract-only manifest as a historical snapshot.

All three commands returned exit 2 / `INCOMPLETE`, as required while stage, historical TestRun, observation, Ubuntu, and human acceptance evidence remain open. All three evidence sub-gates passed with zero missing/hash failures; stage documentation audits passed. V1 reports 138 references / 13 manifests / 67 entries; V2 reports 328 / 52 / 130; V3 reports 392 / 57 / 108. This does not convert any stage or version to PASS.

The command output logs are retained individually. The current V1.3 code and contract scope is covered by [W1 current source audit](./2026-10-06-w1-v13-manual-approval-domain.md) and its SHA-256 manifest.

See [machine summary](./2026-10-06-w9-after-manual-approval.json) and [SHA-256 manifest](./2026-10-06-w9-after-manual-approval.sha256).
