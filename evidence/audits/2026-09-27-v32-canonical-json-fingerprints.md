# V3.2 canonical JSON fingerprints

Date: 2026-09-27 (Asia/Shanghai)

PromotionRequest intake and validation-report persistence previously duplicated canonical JSON code and sorted object keys with locale-sensitive `localeCompare`. This made the idempotency fingerprint definition depend on the runtime's default locale and allowed the two implementations to drift.

The Quant Research service now shares one canonical JSON serializer for request, evidence, and submission fingerprints. It sorts keys by locale-independent ECMAScript string order (UTF-16 code units). A unit test fixes the expected order for mixed-case and non-ASCII keys and confirms insertion order does not affect output.

Verification: Quant tests 38 TypeScript + 6 Python PASS; full `pnpm verify:stage -- --stage V3.2 --suite code` exited 0, including concurrent report persistence and promotion intake PostgreSQL/HTTP smokes. Business validation and human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`.
