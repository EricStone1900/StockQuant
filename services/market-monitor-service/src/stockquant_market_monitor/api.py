"""Authenticated HTTP API for durable quote-quality projections."""

from __future__ import annotations

import hmac
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, Literal
from uuid import UUID

from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from stockquant_market_monitor.application.quality_service import QuoteQualityService


class Scope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    market: Literal["CN_A"]
    ownerId: str = Field(min_length=1, max_length=128)
    accountId: UUID
    namespace: str = Field(min_length=1, max_length=128)
    testRunId: UUID


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    security_id: str = Field(alias="securityId", min_length=1, max_length=64)
    snapshot_id: str = Field(alias="snapshotId", min_length=1, max_length=256)
    source_id: str = Field(alias="sourceId", min_length=1, max_length=128)
    data_mode: Literal["FIXTURE", "REAL"] = Field(alias="dataMode")
    observed_at: str | None = Field(alias="observedAt")
    ingested_at: str | None = Field(default=None, alias="ingestedAt")
    available_at: str | None = Field(alias="availableAt")
    age_seconds: int | None = Field(alias="ageSeconds")
    freshness: Literal["FRESH", "STALE", "UNKNOWN"]
    status: Literal["READY", "STALE", "UNKNOWN"]


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scope: Scope
    task_id: str = Field(alias="taskId", min_length=1, max_length=256)
    expected_security_ids: list[str] = Field(alias="expectedSecurityIds", min_length=1, max_length=100)
    observations: list[Observation] = Field(max_length=100)


def _scope_dump(scope: Scope) -> dict[str, str]:
    return scope.model_dump(mode="json", by_alias=True)


def create_app(service: QuoteQualityService, service_token: str, market_data_service_token: str = "") -> FastAPI:
    if len(service_token) < 32:
        raise ValueError("platform service bearer token must be configured")
    if market_data_service_token and hmac.compare_digest(market_data_service_token, service_token):
        raise ValueError("Market Data and Platform service bearers must be distinct")
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        repository = getattr(service, "repository", None)
        ping = getattr(repository, "ping", None)
        if ping:
            ping()
        yield

    app = FastAPI(title="StockQuant Market Monitor", version="1.0.0", lifespan=lifespan)

    service_tokens = {"platform-api-service": service_token}
    if len(market_data_service_token) >= 32:
        service_tokens["market-data-service"] = market_data_service_token

    def authorize(authorization: str | None, service_id: str | None) -> None:
        expected_token = service_tokens.get(service_id or "")
        if expected_token is None:
            raise HTTPException(status_code=403, detail={"code": "SERVICE_IDENTITY_REQUIRED"})
        supplied = authorization.removeprefix("Bearer ") if authorization else ""
        if not hmac.compare_digest(supplied, expected_token):
            raise HTTPException(status_code=401, detail={"code": "SERVICE_AUTH_REQUIRED"})

    @app.get("/live")
    def live() -> dict[str, str]:
        return {"status": "live", "service": "market-monitor-service"}

    @app.get("/ready")
    def ready(authorization: str | None = Header(default=None), service_id: str | None = Header(default=None, alias="x-stockquant-service-id")) -> dict[str, str]:
        authorize(authorization, service_id)
        return {"status": "ready", "service": "market-monitor-service", "persistence": "POSTGRESQL"}

    @app.post("/v1/quote-quality/evaluations")
    def evaluate(payload: EvaluateRequest, authorization: str | None = Header(default=None), service_id: str | None = Header(default=None, alias="x-stockquant-service-id")) -> dict:
        authorize(authorization, service_id)
        expected = payload.expected_security_ids
        if len(set(expected)) != len(expected):
            raise HTTPException(status_code=422, detail={"code": "EXPECTED_SECURITY_IDS_NOT_UNIQUE"})
        scope = _scope_dump(payload.scope)
        observations = [item.model_dump(mode="json", by_alias=True) for item in payload.observations]
        command = {"scope": scope, "taskId": payload.task_id, "expectedSecurityIds": expected, "observations": observations}
        try:
            return service.evaluate(command)
        except ValueError as exc:
            if str(exc) == "QUALITY_TASK_INPUT_CONFLICT":
                raise HTTPException(status_code=409, detail={"code": str(exc)}) from exc
            raise HTTPException(status_code=422, detail={"code": str(exc)}) from exc

    @app.get("/v1/quote-quality/latest")
    def latest(scope: Annotated[Scope, Query()], authorization: str | None = Header(default=None), service_id: str | None = Header(default=None, alias="x-stockquant-service-id")) -> dict:
        authorize(authorization, service_id)
        result = service.latest(_scope_dump(scope))
        return {"quality": result}

    return app
