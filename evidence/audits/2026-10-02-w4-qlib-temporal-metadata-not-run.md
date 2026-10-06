# W4 Qlib temporal-metadata missing-input guard

Date: 2026-10-02 (Asia/Shanghai)

Updated `services/quant-research-service/tests/test_qlib_fit_validation.py` with a regression case for omitted temporal metadata. The case confirms the fixture request remains valid for the explicitly limited Qlib fixture fit, while the independent temporal-validation result is `NOT_RUN`; an empty metadata array is rejected because a supplied array must contain one row per sample. This prevents missing provenance from being reported as a passing time-causality check.

Validation: `UV_CACHE_DIR="$PWD/.uv-cache" uv run --project services/quant-research-service --frozen python -m unittest discover -s services/quant-research-service/tests -p 'test_qlib_fit_validation.py' -v` passed all 6 tests; `git diff --check` passed. The documented pytest invocation was attempted first but the locked environment has no `pytest` executable (`Failed to spawn: pytest`); the standard-library test suite was then run through the same frozen project environment. No network, market data, provider, broker, Paper, active database or service was used.

Scope: this test protects truthful status handling on the synthetic Qlib Fixture input only. It does not validate real-market availability timestamps, PIT/history, model quality, production routing, or user acceptance; those W4 requirements remain open.
