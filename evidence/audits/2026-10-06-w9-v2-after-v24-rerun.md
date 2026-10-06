# W9 V2 gate after current V2.4 regression

Date: 2026-10-06 (Asia/Shanghai)

`pnpm verify:version:evidence -- --version V2` exited 0: 12 stage documents, 295 evidence references, 50 manifests, and 133 active manifest entries checked; no missing references or hash failures. The formal `pnpm verify:version -- --version V2` remains `INCOMPLETE` (exit 2). V2.1 and V2.2 still lack structured exports for six exact historical TestRuns; V2.3 and V2.5 registered TestRuns pass, and V2.4's existing registered TestRun passes. The new V2.4 regression runs were retained as engineering evidence and were not substituted for the exact historical IDs or human signoff.

The exhaustive local source search is already recorded in [the legacy PostgreSQL search](./2026-10-06-w9-stock-analysis-volume-search/README.md): no local attached/anonymous PostgreSQL volume or repository dump contains recoverable payloads for the missing historical IDs. This gate rerun does not imply a version pass or change NO_TRADE/source authorization/observation status. Raw command outputs are retained in [evidence gate log](./2026-10-06-w9-v2-after-v24-rerun-evidence-gate.log) and [version gate log](./2026-10-06-w9-v2-after-v24-rerun-version-gate.log).
