# W9 version gates after W3 scheduler guard (2026-10-06)

After the isolated V2.4 scheduler-state validation fix, the current version gates were rerun directly with `node scripts/verify-version.mjs --version V1|V2|V3`.

| Version | Exit | Gate | Stage docs | Evidence manifests | Unresolved stages | Missing/unexpected Acceptance rows |
|---|---:|---|---|---|---:|---:|
| V1 | 2 | INCOMPLETE | PASS | PASS | 5 | 0 / 0 |
| V2 | 2 | INCOMPLETE | PASS | PASS | 5 | 0 / 0 |
| V3 | 2 | INCOMPLETE | PASS | PASS | 4 | 0 / 0 |

Machine output is retained in the three adjacent JSON files. After the V2.4 stage document linked the current scheduler repair and both complete-suite logs, V2's detailed evidence-reference audit was rerun and passes (315 references, 52 manifests, 128 active manifest entries, 3 historical manifests skipped, no missing evidence or hash failures); the V2 version gate also remains INCOMPLETE with stage-document and evidence audits PASS and 0 acceptance-row differences. The exit code 2 is the expected incomplete-stage result, not an evidence-audit failure. This review does not resolve historic TestRun exports, real-data observations, Ubuntu deployment, or human sign-off.
