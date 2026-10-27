# Market Monitor service

V2.1 quote-quality projection service. Market Data remains authoritative for quote facts; Monitor stores scoped quality metrics and quote references only. The service never evaluates strategies or creates orders.

Required environment: `STOCKQUANT_DATABASE_URL`, `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API`, `STOCKQUANT_BIND_HOST`, and `STOCKQUANT_PORT`. `GET /live` is a process health check; authenticated `GET /ready` verifies database reachability. Platform calls `POST /v1/quote-quality/evaluations` and `GET /v1/quote-quality/latest`.

Regenerate the hash-locked image requirements from this directory with `uv export --locked --no-dev --format requirements-txt --output-file requirements.lock`. Run unit tests with `uv run --frozen pytest tests/unit`. PostgreSQL integration tests require the isolated database URL supplied by `scripts/run-isolated-postgres-command.mjs`.
