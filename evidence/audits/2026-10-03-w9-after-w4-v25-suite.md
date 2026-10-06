# W9 version-gate refresh after V2.5 suite

Captured: 2026-10-03 05:16 Asia/Shanghai. `pnpm verify:version -- --version V1/V2/V3` returned exit 2 for each as expected because required acceptance remains unresolved. V1 has 5 unresolved stages / 5 acceptance rows; V2 has 5 / 5; V3 has 4 / 4. All three stage-documentation and evidence-reference audits pass, with 0 missing or unexpected acceptance rows and 0 invalid PASS claims.

Evidence-reference checks: V1 86 references / 11 manifests / 47 manifest entries; V2 222 / 35 / 74; V3 227 / 47 / 99. These checks establish local reference/hash consistency only. They do not establish real market-data research, Paper observation, Ubuntu deployment, complete business workflows, or human sign-off. V2.5's new isolated code-suite result therefore does not close V2 acceptance.

Full command outputs and machine-readable results are in the accompanying [log](./2026-10-03-w9-after-w4-v25-suite.log) and [JSON](./2026-10-03-w9-after-w4-v25-suite.json); the SHA-256 manifest binds those outputs and the three version acceptance tables.
