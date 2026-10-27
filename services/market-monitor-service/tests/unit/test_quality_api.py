from __future__ import annotations

from fastapi.testclient import TestClient

from stockquant_market_monitor.api import create_app
from stockquant_market_monitor.application.quality_service import QuoteQualityService


class MemoryQualityRepository:
    def __init__(self) -> None:
        self.rows: dict[tuple[str, str], dict] = {}

    def save(self, scope: dict, task_id: str, input_value: dict, result: dict) -> dict:
        key = (scope["ownerId"], task_id)
        if key in self.rows:
            if self.rows[key]["input"] != input_value:
                raise ValueError("QUALITY_TASK_INPUT_CONFLICT")
            return self.rows[key]["result"]
        saved = {**result, "evaluationId": "quotequality:test", "evaluatedAt": "2026-10-19T10:00:00+00:00"}
        self.rows[key] = {"input": input_value, "result": saved}
        return saved

    def latest(self, scope: dict) -> dict | None:
        matches = [row["result"] for (owner, _), row in self.rows.items() if owner == scope["ownerId"]]
        return matches[-1] if matches else None


SCOPE = {
    "market": "CN_A",
    "ownerId": "monitor-owner",
    "accountId": "11111111-1111-4111-8111-111111111112",
    "namespace": "paper:FAKE",
    "testRunId": "11111111-1111-4111-8111-111111111113",
}
TOKEN = "m" * 40
MARKET_DATA_TOKEN = "d" * 40


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


def test_quality_result_is_authenticated_persistable_and_scope_readable() -> None:
    app = create_app(QuoteQualityService(MemoryQualityRepository()), TOKEN)
    with TestClient(app) as client:
        assert client.post("/v1/quote-quality/evaluations", json=payload(), headers={"x-stockquant-service-id": "platform-api-service"}).status_code == 401
        headers = {"Authorization": f"Bearer {TOKEN}", "x-stockquant-service-id": "platform-api-service"}
        result = client.post("/v1/quote-quality/evaluations", json=payload(), headers=headers)
        assert result.status_code == 200
        assert result.json()["status"] == "READY"
        assert result.json()["freshCount"] == 2
        assert result.json()["coverageRatio"] == 1.0
        assert result.json()["anomalies"] == []
        assert result.json()["quoteRefs"][0]["snapshotId"] == "snap-1"
        assert result.json()["quoteRefs"][0]["ingestedAt"] is None
        assert "price" not in result.json()["quoteRefs"][0]
        latest = client.get("/v1/quote-quality/latest", params=SCOPE, headers=headers)
        assert latest.status_code == 200
        assert latest.json()["quality"]["taskId"] == "snapshot-task-1"
        other_scope = {**SCOPE, "ownerId": "other-owner"}
        assert client.get("/v1/quote-quality/latest", params=other_scope, headers=headers).json() == {"quality": None}


def test_unknown_or_stale_observations_are_saved_as_partial_quality() -> None:
    request = payload()
    request["observations"][0]["freshness"] = "STALE"
    request["observations"][0]["status"] = "STALE"
    request["observations"][1]["freshness"] = "UNKNOWN"
    request["observations"][1]["status"] = "UNKNOWN"
    request["observations"][1]["ageSeconds"] = None
    with TestClient(create_app(QuoteQualityService(MemoryQualityRepository()), TOKEN)) as client:
        result = client.post("/v1/quote-quality/evaluations", json=request, headers={"Authorization": f"Bearer {TOKEN}", "x-stockquant-service-id": "platform-api-service"})
    assert result.status_code == 200
    assert result.json()["status"] == "UNAVAILABLE"
    assert [item["code"] for item in result.json()["anomalies"]] == ["QUOTE_STALE", "QUOTE_TIME_UNKNOWN"]


def test_duplicate_expected_security_ids_are_rejected() -> None:
    request = payload()
    request["expectedSecurityIds"].append("600000.SH")
    with TestClient(create_app(QuoteQualityService(MemoryQualityRepository()), TOKEN)) as client:
        response = client.post("/v1/quote-quality/evaluations", json=request, headers={"Authorization": f"Bearer {TOKEN}", "x-stockquant-service-id": "platform-api-service"})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "EXPECTED_SECURITY_IDS_NOT_UNIQUE"


def test_market_data_consumer_has_its_own_service_identity_and_bearer() -> None:
    app = create_app(QuoteQualityService(MemoryQualityRepository()), TOKEN, MARKET_DATA_TOKEN)
    with TestClient(app) as client:
        route = "/v1/quote-quality/evaluations"
        wrong = client.post(route, json=payload(), headers={"Authorization": f"Bearer {TOKEN}", "x-stockquant-service-id": "market-data-service"})
        accepted = client.post(route, json=payload(), headers={"Authorization": f"Bearer {MARKET_DATA_TOKEN}", "x-stockquant-service-id": "market-data-service"})
    assert wrong.status_code == 401
    assert accepted.status_code == 200


def test_platform_and_market_data_bearers_must_be_distinct() -> None:
    import pytest

    with pytest.raises(ValueError, match="bearers must be distinct"):
        create_app(QuoteQualityService(MemoryQualityRepository()), TOKEN, TOKEN)
