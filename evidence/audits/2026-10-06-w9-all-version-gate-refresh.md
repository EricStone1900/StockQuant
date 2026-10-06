# W9 all-version gate refresh

Date: 2026-10-06 (Asia/Shanghai)

## Result

All three version evidence-integrity gates pass, but no version acceptance gate is complete. V1 evidence scan: 9 stage documents, 98 references, 13 manifests, 39 active hash entries, no missing files or hash failures; version gate exit 2, all five stages remain PARTIALLY_IMPLEMENTED, with seven historical Run exports missing. V2 evidence scan: 12 stage documents, 295 references, 50 manifests, 133 active hash entries, no missing files or hash failures; version gate exit 2, six exact historical exports remain missing in V2.1/V2.2 while the registered evidence for later stages passes. V3 evidence scan: 9 stage documents, 377 references, 55 manifests, 131 active hash entries, no missing files or hash failures; version gate exit 2, V3.1–V3.4 remain NOT_RUN.

The newly rerun V2.4 isolated code suite passed separately and is documented in the delivery plan. It does not satisfy historical Run IDs, observation windows, Ubuntu execution, source authorization, or user acceptance. NO_TRADE remains in force; no provider access or live action was taken.

## Raw gate logs

- [V1 evidence integrity](./2026-10-06-w9-git-search-v1-evidence-gate.log)
- [V1 version gate](./2026-10-06-w9-git-search-v1-version-gate.log)
- [V2 evidence integrity](./2026-10-06-w9-git-search-v2-evidence-gate.log)
- [V2 version gate](./2026-10-06-w9-git-search-v2-version-gate.log)
- [V3 evidence integrity](./2026-10-06-w9-git-search-v3-evidence-gate.log)
- [V3 version gate](./2026-10-06-w9-git-search-v3-version-gate.log)

The counts describe reference integrity only. They do not establish business correctness, active deployment, observation completion, or human acceptance.
