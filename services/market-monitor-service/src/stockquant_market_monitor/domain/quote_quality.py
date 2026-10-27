"""Deterministic quality projection over Market Data quote references."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence


Freshness = Literal["FRESH", "STALE", "UNKNOWN"]
ObservationStatus = Literal["READY", "STALE", "UNKNOWN"]
QualityStatus = Literal["READY", "PARTIAL", "UNAVAILABLE"]


@dataclass(frozen=True)
class QuoteObservation:
    security_id: str
    snapshot_id: str
    source_id: str
    data_mode: Literal["FIXTURE", "REAL"]
    observed_at: str | None
    available_at: str | None
    age_seconds: int | None
    freshness: Freshness
    status: ObservationStatus


@dataclass(frozen=True)
class QualityAnomaly:
    security_id: str
    code: Literal["QUOTE_MISSING", "QUOTE_STALE", "QUOTE_TIME_UNKNOWN"]
    snapshot_id: str | None


@dataclass(frozen=True)
class QuoteQualityResult:
    expected_count: int
    fresh_count: int
    coverage_ratio: float
    status: QualityStatus
    max_age_seconds: int | None
    anomalies: tuple[QualityAnomaly, ...]


def evaluate_quote_quality(
    expected_security_ids: Sequence[str],
    observations: Sequence[QuoteObservation],
) -> QuoteQualityResult:
    """Evaluate one completed snapshot set without changing quote facts.

    Market Data owns observations. This function only creates a deterministic
    quality projection; UNKNOWN and STALE never count as fresh coverage.
    """
    expected = tuple(dict.fromkeys(expected_security_ids))
    if len(expected) != len(expected_security_ids):
        raise ValueError("expected security IDs must be unique")
    if any(not security_id.strip() for security_id in expected):
        raise ValueError("expected security IDs must be non-empty")

    by_security: dict[str, QuoteObservation] = {}
    for observation in observations:
        if observation.security_id not in expected:
            continue
        if observation.security_id in by_security:
            raise ValueError("at most one observation per expected security is allowed")
        by_security[observation.security_id] = observation

    anomalies: list[QualityAnomaly] = []
    fresh_ages: list[int] = []
    for security_id in expected:
        observation = by_security.get(security_id)
        if observation is None:
            anomalies.append(QualityAnomaly(security_id, "QUOTE_MISSING", None))
        elif observation.status == "STALE" or observation.freshness == "STALE":
            anomalies.append(QualityAnomaly(security_id, "QUOTE_STALE", observation.snapshot_id))
        elif observation.status != "READY" or observation.freshness != "FRESH":
            anomalies.append(QualityAnomaly(security_id, "QUOTE_TIME_UNKNOWN", observation.snapshot_id))
        elif observation.age_seconds is None or observation.age_seconds < 0:
            anomalies.append(QualityAnomaly(security_id, "QUOTE_TIME_UNKNOWN", observation.snapshot_id))
        else:
            fresh_ages.append(observation.age_seconds)

    expected_count = len(expected)
    fresh_count = len(fresh_ages)
    status: QualityStatus = (
        "UNAVAILABLE" if fresh_count == 0 else "READY" if fresh_count == expected_count else "PARTIAL"
    )
    return QuoteQualityResult(
        expected_count=expected_count,
        fresh_count=fresh_count,
        coverage_ratio=fresh_count / expected_count if expected_count else 0.0,
        status=status,
        max_age_seconds=max(fresh_ages) if fresh_ages else None,
        anomalies=tuple(anomalies),
    )
