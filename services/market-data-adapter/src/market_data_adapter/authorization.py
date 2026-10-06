"""Fail-closed, source-scoped authorization for outbound market data use."""
from __future__ import annotations

import os

COLLECTION_AUTHORIZATION_ENV = (
    "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
    "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
    "STOCKQUANT_COLLECTION_DATA_VERSION",
    "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
)
HISTORICAL_RESEARCH_AUTHORIZATION_ENV = (
    "STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED",
    "STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF",
    "STOCKQUANT_MARKET_RESEARCH_DATA_VERSION",
    "STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS",
)


def missing_collection_source_authorization(source_ids: list[str], env: dict[str, str] | None = None) -> list[str]:
    return missing_source_use_authorization(source_ids, COLLECTION_AUTHORIZATION_ENV, env)


def missing_historical_research_source_authorization(source_ids: list[str], env: dict[str, str] | None = None) -> list[str]:
    return missing_source_use_authorization(source_ids, HISTORICAL_RESEARCH_AUTHORIZATION_ENV, env)


def missing_source_use_authorization(source_ids: list[str], keys: tuple[str, str, str, str], env: dict[str, str] | None = None) -> list[str]:
    values = os.environ if env is None else env
    flag, authorization_ref, data_version, allowed_sources = keys
    allowlist = {item.strip() for item in values.get(allowed_sources, "").split(",") if item.strip()}
    missing = []
    if values.get(flag) != "true":
        missing.append(flag)
    if not values.get(authorization_ref, "").strip():
        missing.append(authorization_ref)
    if not values.get(data_version, "").strip():
        missing.append(data_version)
    if not set(source_ids).issubset(allowlist):
        missing.append(allowed_sources)
    return missing
