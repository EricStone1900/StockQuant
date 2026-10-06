# W9 version gate refresh after V1.4 isolated E2E

Date: 2026-10-02 (Asia/Shanghai)

All three official version gate commands were re-executed from the current workspace after the V1.4 isolated end-to-end run. They correctly remain `INCOMPLETE` (exit 2); documentation and evidence integrity checks pass, with no missing/duplicate acceptance mappings or invalid PASS claims. This result does not replace business acceptance, user sign-off, authorized real-data observations, or Ubuntu verification.

| Version | Exit | Status | Unresolved stages | Unresolved acceptance rows | Evidence refs / manifests / entries | Evidence audit | TestRun audit |
|---|---:|---|---:|---:|---:|---|---|
| V1 | 2 | INCOMPLETE | 5 | 5 | 78 / 9 / 88 | PASS | INCOMPLETE |
| V2 | 2 | INCOMPLETE | 5 | 5 | 189 / 28 / 36 | PASS | INCOMPLETE |
| V3 | 2 | INCOMPLETE | 4 | 4 | 179 / 38 / 45 | PASS | NOT_RUN |

The raw machine result for each version is stored beside this report. Missing/duplicate Acceptance IDs: 0; invalid PASS claims: 0; stage-document audit: PASS for each version. The overall blocker context remains the explicit `NO_TRADE`/no-source-authorization decision and outstanding independent business, observation, Ubuntu, and human-acceptance gates.
