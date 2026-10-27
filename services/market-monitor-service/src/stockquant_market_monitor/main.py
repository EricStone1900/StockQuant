"""Production ASGI entrypoint."""

from __future__ import annotations

import os

import uvicorn

from stockquant_market_monitor.adapters.postgres_quality_repository import (
    PostgresQualityRepository,
)
from stockquant_market_monitor.api import create_app
from stockquant_market_monitor.application.quality_service import QuoteQualityService


repository = PostgresQualityRepository(os.environ.get("STOCKQUANT_DATABASE_URL", ""))
repository.migrate()
app = create_app(
    QuoteQualityService(repository),
    os.environ.get("STOCKQUANT_SERVICE_TOKEN_PLATFORM_API", ""),
    os.environ.get("STOCKQUANT_SERVICE_TOKEN_MARKET_DATA", ""),
)


if __name__ == "__main__":
    uvicorn.run(app, host=os.environ.get("STOCKQUANT_BIND_HOST", "0.0.0.0"), port=int(os.environ.get("STOCKQUANT_PORT", "3009")))
