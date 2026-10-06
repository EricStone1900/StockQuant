# W9: version and evidence gates after V2.4 event-order suite

Date: 2026-10-03 (Asia/Shanghai)

- `pnpm verify:stage -- --stage V2.4 --suite code`: PASS, exit 0. The sequenced FakeBroker cancel/Fill event path is integrated and its durable gap/restart/order-reduction test passes.
- Evidence gates: V1 PASS (83 references / 10 manifests / 42 entries), V2 PASS (222 / 35 / 6608), V3 PASS (194 / 39 / 52). Missing evidence and hash failures: 0.
- Version business gates: V1, V2, V3 remain INCOMPLETE / exit 2; unresolved stages and acceptance rows are 5/5, 5/5, and 4/4. Missing/unexpected acceptance IDs and invalid PASS claims: 0.
- `docs:check`: 2,848 local links, zero failures. `baseline:check`: 26/26 tests PASS.
- This is a code/evidence synchronization check, not business acceptance. NO_TRADE/no source authorization, O1/O2 observation, Ubuntu migration/observation, and current human sign-offs remain outstanding.

The adjacent JSON contains raw gate outputs and exit codes; the SHA-256 manifest pins this audit package.
