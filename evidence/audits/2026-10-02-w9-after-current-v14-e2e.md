# W9 gates after current V1.4 isolated E2E

Date: 2026-10-02 (Asia/Shanghai)

The current V1.4 evidence gap is resolved without changing the old run: `pnpm test:e2e -- --stage V1.4` passed on the current workspace (`sha256:249165d62f3a4179e3b6a456a9cb36d18b804c5ff3eb2f4837eedf0274f12fd7`). Eleven Quant BacktestRun/Manifest/resultHash pairs matched, six browser-created TestRuns were checked by CLI against the same run, Playwright passed 4/4, and isolated Compose containers, volume and network were removed. The new [V1.4 report](2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.md), [machine result](2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.json), and [workspace hash manifest](2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.sha256) are now the current V1.4 evidence references. The older manifest remains unchanged as historical point-in-time evidence.

The V1 evidence gate now passes: 9 stage documents, 80 references, 9 manifests and 88 checked hashes. V2 also passes (12 documents, 193 references, 29 manifests, 50 hashes); V3 evidence gate passes. Business gates are still incomplete: V1, V2 and V3 each retain five, five and four unresolved stages/acceptance rows respectively. No user sign-off, source authorization, live Paper, observation or Ubuntu acceptance was inferred.

Machine detail: [W9 JSON](2026-10-02-w9-after-current-v14-e2e.json). Earlier V1.4 run records remain intact; this report supersedes only their use as the current workspace binding.
