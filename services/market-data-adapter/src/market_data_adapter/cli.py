"""JSON-lines boundary used by the TypeScript collection worker.

The adapter deliberately owns network access and provider SDK imports.  It is
read-only and writes one JSON response to stdout so the caller can audit a
complete attempt without importing provider code into the service process.
"""
from __future__ import annotations

import json
import sys
from typing import Any

from .failover import AllSourcesFailed, FailoverCollector, NormalizedBar, SourceError
from .providers import BaoStockMinuteClient, SinaMinuteClient


def wire_bar(bar: NormalizedBar) -> dict[str, Any]:
    """Serialize the Python adapter contract using the TypeScript boundary's camelCase fields."""
    return {
        "securityId": bar.security_id,
        "barStart": bar.bar_start,
        "barEnd": bar.bar_end,
        "availableAt": bar.available_at,
        "open": bar.open,
        "high": bar.high,
        "low": bar.low,
        "close": bar.close,
        "volume": bar.volume,
        "amount": bar.amount,
        "adjustment": bar.adjustment,
        "sourceId": bar.source_id,
    }


def main() -> int:
    try:
        request: dict[str, Any] = json.loads(sys.stdin.read())
        security_ids = request.get("securityIds")
        start = request.get("startDate")
        end = request.get("endDate")
        if not isinstance(security_ids, list) or not security_ids or not all(isinstance(item, str) for item in security_ids):
            raise SourceError("INVALID_REQUEST", "securityIds must be a non-empty string array", retryable=False)
        if not isinstance(start, str) or not isinstance(end, str) or len(start) != 10 or len(end) != 10:
            raise SourceError("INVALID_REQUEST", "startDate and endDate must be ISO local dates", retryable=False)
        collector = FailoverCollector(
            [("baostock", BaoStockMinuteClient(float(request.get("perSecurityIntervalSeconds", 0.0)))), ("sina", SinaMinuteClient(minimum_interval_seconds=float(request.get("perSecurityIntervalSeconds", 0.0))))],
            timeout_seconds=float(request.get("timeoutSeconds", 30)),
            max_attempts=int(request.get("maxAttempts", 3)),
            backoff_seconds=float(request.get("backoffSeconds", 5)),
            health_path=request.get("healthPath") or os.environ.get("STOCKQUANT_COLLECTION_SOURCE_HEALTH_PATH") or "/var/lib/stockquant/source-health.json",
        )
        source_id, bars, attempts = collector.collect(security_ids, start, end)
        print(json.dumps({"status": "COMPLETED", "sourceId": source_id, "bars": [wire_bar(bar) for bar in bars], "attempts": attempts}, separators=(",", ":")))
        return 0
    except AllSourcesFailed as error:
        print(json.dumps({"status": "WAITING_RETRY", "code": error.code, "attempts": error.attempts}, separators=(",", ":")))
        return 2
    except SourceError as error:
        print(json.dumps({"status": "FAILED", "code": error.code, "message": str(error), "retryable": error.retryable}, separators=(",", ":")))
        return 1
    except Exception as error:  # noqa: BLE001
        print(json.dumps({"status": "WAITING_RETRY", "code": "ADAPTER_EXCEPTION", "message": repr(error)}, separators=(",", ":")))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
