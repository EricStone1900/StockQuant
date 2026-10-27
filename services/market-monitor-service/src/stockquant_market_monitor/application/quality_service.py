"""Scoped quote-quality persistence application service."""

from __future__ import annotations

from typing import Any, Protocol

from stockquant_market_monitor.domain.quote_quality import (
    QuoteObservation,
    evaluate_quote_quality,
)


class QualityRepository(Protocol):
    def save(self, scope: dict[str, Any], task_id: str, input_value: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]: ...
    def latest(self, scope: dict[str, Any]) -> dict[str, Any] | None: ...


class QuoteQualityService:
    def __init__(self, repository: QualityRepository) -> None:
        self.repository = repository

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        scope = payload["scope"]
        expected = payload["expectedSecurityIds"]
        observations = [
            QuoteObservation(
                security_id=item["securityId"],
                snapshot_id=item["snapshotId"],
                source_id=item["sourceId"],
                data_mode=item["dataMode"],
                observed_at=item["observedAt"],
                available_at=item["availableAt"],
                age_seconds=item["ageSeconds"],
                freshness=item["freshness"],
                status=item["status"],
            )
            for item in payload["observations"]
        ]
        projection = evaluate_quote_quality(expected, observations)
        result = {
            "scope": scope,
            "taskId": payload["taskId"],
            "expectedCount": projection.expected_count,
            "freshCount": projection.fresh_count,
            "coverageRatio": projection.coverage_ratio,
            "status": projection.status,
            "maxAgeSeconds": projection.max_age_seconds,
            "anomalies": [
            {"securityId": item.security_id, "code": item.code, "snapshotId": item.snapshot_id}
            for item in projection.anomalies
            ],
            "quoteRefs": [
                {key: item[key] for key in ("securityId", "snapshotId", "sourceId", "dataMode", "observedAt", "ingestedAt", "availableAt", "ageSeconds", "freshness", "status")}
                for item in payload["observations"]
            ],
        }
        return self.repository.save(scope, payload["taskId"], payload, result)

    def latest(self, scope: dict[str, Any]) -> dict[str, Any] | None:
        return self.repository.latest(scope)
