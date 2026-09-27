# DC-08A archived observation rule audit

Date: 2026-09-27 (Asia/Shanghai). Scope: read-only inspection of the archived DC-08A evidence files in `evidence/dc08a/`. No Docker service, database, observation record, subscription, or counter was changed.

## Snapshot state

The authoritative archived [`observation-summary.json`](../dc08a/observation-summary.json) is schema `dc08a-observation-summary-v3`, captured through 2026-09-25, and reports the sole subscription `dc08a-20260917-20-v1` at 4 completed + 1 recovered = 5/20 observed days, 15 remaining, `WAITING`. This is a snapshot timestamp, not a live count for 2026-09-27; Sep 26 was Saturday and Sep 27 Sunday, so no new trading-day evidence should be inferred.

The summary lists counted dates 2026-09-18 and 2026-09-21 through 2026-09-24. For each of those five dates, the archived coverage file has schema `dc08a-coverage-v1`, 20 securities, 960 expected and 960 unique bars, zero missing/duplicate/unexpected bars, zero open gaps and zero pending Outbox; the corresponding daily report has 20 securities, 960 actual bars and 48 artifacts, status `PASS`. The Sep 21 before-recovery snapshot and daily report are retained separately from the final Sep 21 files.

## Rule-version limitation

The 2026-09-26 observation-quality rule requires ten distinct scheduled sample windows, one execution window, exact requested-symbol coverage, per-security `LIVE_SOURCE` status and quote freshness relative to the run-scoped observation clock. The archived v1 coverage and daily-report records do not contain an `observationQuality`/rule-version field or the underlying per-window requested-symbol/quote timestamps needed to recompute these predicates. Bar coverage, a `PASS` daily report, and the later aggregate count therefore do not prove that each historical day satisfies the newer quality rule.

Decision: retain the five historically counted days as recorded, do not retroactively invalidate or re-count them, and do not claim them as revalidated under the 2026-09-26 rule. A live read-only database/event review or new naturally captured days under the new rule is still needed to establish applicability. The archive does not supply enough evidence to choose either retroactive outcome. This audit does not alter the 20-day gate or any human acceptance state.

## Archived file fingerprints

SHA-256 values were computed directly from the listed files during this read-only review:

| File | SHA-256 |
|---|---|
| [`observation-summary.json`](../dc08a/observation-summary.json) | `357d761516c9946d48f21b1d8ab77e88fe1693ef85196f8c50d2b619513d07fb` |
| [`coverage-dc08a-20260917-20-v1-2026-09-18-2026-09-18.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-18-2026-09-18.json) | `b076375547bc9781dee03c39218fd110d63e53cd188f4a68d21aa1be8199548e` |
| [`coverage-dc08a-20260917-20-v1-2026-09-21-2026-09-21.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-21-2026-09-21.json) | `5efa300078761608e4fa8b66801c5138c3db96497fc41fa1f6ac0440e94f028c` |
| [`coverage-dc08a-20260917-20-v1-2026-09-22-2026-09-22.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-22-2026-09-22.json) | `275969783495514adfbfb9052d5ae610b941e643a739e2b0fb46c7623a9911e1` |
| [`coverage-dc08a-20260917-20-v1-2026-09-23-2026-09-23.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-23-2026-09-23.json) | `9128f078c17addbdd15517aa7b067afc1a0abb35b9a97604d7fcc1d5dc617c67` |
| [`coverage-dc08a-20260917-20-v1-2026-09-24-2026-09-24.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-24-2026-09-24.json) | `ff05d3c72aeee060eaef8b765f831c800a44b2ca258da65ac994b01e17753091` |
| [`daily-report-2026-09-18.json`](../dc08a/daily-report-2026-09-18.json) | `83c47132c71ad2d9362edfe8ec6c9979041c642094f6578349e5015b9cc7f9ea` |
| [`daily-report-2026-09-21.json`](../dc08a/daily-report-2026-09-21.json) | `51f8bbed3723999f3a452e67ccd10da1c49a7156b75586910a031a3e1894c7b4` |
| [`daily-report-2026-09-22.json`](../dc08a/daily-report-2026-09-22.json) | `39f1dd99c2b3d4bbf06a48cee13eec6198f9afa335edff528d5563090a9de969` |
| [`daily-report-2026-09-23.json`](../dc08a/daily-report-2026-09-23.json) | `4b5967f224289376679c06979e9133c22fa25197fb2b893988c573fb819f8b35` |
| [`daily-report-2026-09-24.json`](../dc08a/daily-report-2026-09-24.json) | `641f367d74ec2e2569fae5bc24ed1e81a1e595f27ad1cb12ec1fef4fb997431c` |
| [`coverage-dc08a-20260917-20-v1-2026-09-21-before-recovery.json`](../dc08a/coverage-dc08a-20260917-20-v1-2026-09-21-before-recovery.json) | `7e444c6e1f80ba1e0347f1783be969d93fe03ad6de441777a825b7e6364911d2` |
| [`daily-report-2026-09-21-before-recovery.json`](../dc08a/daily-report-2026-09-21-before-recovery.json) | `35f517981d4b4188dfbe67c823a0e3ba55e4e91b78c0409e562138bc0e452183` |
