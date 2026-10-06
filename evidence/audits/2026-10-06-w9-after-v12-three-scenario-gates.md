# W9 version gate refresh after V1.2 three-scenario regression

Date: 2026-10-06 (Asia/Shanghai). The V1.2 code suite and three-scenario Web/API/CLI same-run regression passed, but this does not close version acceptance.

Direct `node scripts/verify-version.mjs --version V1|V2|V3` results remain exit 2 / INCOMPLETE. All three evidence audits pass with zero manifest/reference failures and zero missing acceptance rows. Unresolved stages remain V1=5, V2=5, V3=4. Exact verifier outputs are retained in the three JSON files named in this directory.

This refresh does not infer user acceptance, restore missing historical TestRun bundles, change NO_TRADE or source authorization, count additional observation days, or claim Ubuntu validation.
