from __future__ import annotations

import os

import pytest

from stockquant_market_monitor.adapters.postgres_quality_repository import PostgresQualityRepository
from stockquant_market_monitor.application.quality_service import QuoteQualityService

SCOPE = {
    "market": "CN_A",
    "ownerId": "monitor-owner",
    "accountId": "11111111-1111-4111-8111-111111111112",
    "namespace": "paper:FAKE",
    "testRunId": "11111111-1111-4111-8111-111111111113",
}


def payload() -> dict:
    return {
        "scope": SCOPE,
        "taskId": "snapshot-task-1",
        "expectedSecurityIds": ["600000.SH", "000001.SZ"],
        "observations": [
            {"securityId": "600000.SH", "snapshotId": "snap-1", "sourceId": "fixture:v2.1-snapshot-sampling-1", "dataMode": "FIXTURE", "observedAt": "2026-10-16T01:50:00Z", "availableAt": "2026-10-16T01:50:01Z", "ageSeconds": 12, "freshness": "FRESH", "status": "READY"},
            {"securityId": "000001.SZ", "snapshotId": "snap-2", "sourceId": "fixture:v2.1-snapshot-sampling-1", "dataMode": "FIXTURE", "observedAt": "2026-10-16T01:50:00Z", "availableAt": "2026-10-16T01:50:01Z", "ageSeconds": 20, "freshness": "FRESH", "status": "READY"},
        ],
    }


@pytest.mark.skipif(not os.getenv("MARKET_MONITOR_TEST_DATABASE_URL"), reason="requires isolated PostgreSQL")
def test_quality_result_idempotency_restart_and_test_run_isolation() -> None:
    url = os.environ["MARKET_MONITOR_TEST_DATABASE_URL"]
    repository = PostgresQualityRepository(url)
    repository.migrate()
    repository.migrate()
    service = QuoteQualityService(repository)
    request = payload()
    first = service.evaluate(request)
    repeated = service.evaluate(request)
    assert repeated == first
    restored = QuoteQualityService(PostgresQualityRepository(url)).latest(SCOPE)
    assert restored == first
    assert QuoteQualityService(repository).latest({**SCOPE, "testRunId": "11111111-1111-4111-8111-111111111199"}) is None
    changed = payload()
    changed["observations"][0]["ageSeconds"] = 40
    with pytest.raises(ValueError, match="QUALITY_TASK_INPUT_CONFLICT"):
        service.evaluate(changed)
