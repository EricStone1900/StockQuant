"""JSON-lines boundary used by the TypeScript collection worker.

The adapter deliberately owns network access and provider SDK imports.  It is
read-only and writes one JSON response to stdout so the caller can audit a
complete attempt without importing provider code into the service process.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any

from .failover import AllSourcesFailed, FailoverCollector, NormalizedBar, SourceError
from .providers import BaoStockMinuteClient, EastmoneyMinuteClient, SinaMinuteClient, TdxMinuteClient

ALLOWED_SOURCES = frozenset(("baostock", "sina", "eastmoney", "tdx"))


def source_ids_from_request(request: dict[str, Any]) -> list[str]:
    """Resolve and validate source order without silently replacing explicit input."""
    if "sources" in request:
        configured_sources = request["sources"]
    else:
        configured_sources = os.environ.get("STOCKQUANT_COLLECTION_SOURCES", "sina,baostock")
    if isinstance(configured_sources, str):
        source_ids: Any = [item.strip().lower() for item in configured_sources.split(",")]
    else:
        source_ids = configured_sources
    if (
        not isinstance(source_ids, list)
        or not source_ids
        or any(not isinstance(item, str) or item not in ALLOWED_SOURCES for item in source_ids)
        or len(set(source_ids)) != len(source_ids)
    ):
        raise SourceError("INVALID_REQUEST", "sources must be a unique list of baostock,sina,eastmoney,tdx", retryable=False)
    return source_ids


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
        operation = request.get("operation")
        if operation not in (None, "RECOVERY_PROBE"):
            raise SourceError("INVALID_REQUEST", "unsupported adapter operation", retryable=False)
        security_ids = request.get("securityIds")
        start = request.get("startDate")
        end = request.get("endDate")
        if not isinstance(security_ids, list) or not security_ids or not all(isinstance(item, str) for item in security_ids):
            raise SourceError("INVALID_REQUEST", "securityIds must be a non-empty string array", retryable=False)
        if not isinstance(start, str) or not isinstance(end, str) or len(start) != 10 or len(end) != 10:
            raise SourceError("INVALID_REQUEST", "startDate and endDate must be ISO local dates", retryable=False)
        source_ids = source_ids_from_request(request)
        clients: dict[str, Any] = {}
        if "baostock" in source_ids:
            clients["baostock"] = BaoStockMinuteClient(float(request.get("baostockIntervalSeconds", request.get("perSecurityIntervalSeconds", 0.0))), batch_size=int(request.get("baostockBatchSize", 5)))
        if "sina" in source_ids:
            clients["sina"] = SinaMinuteClient(minimum_interval_seconds=float(request.get("perSecurityIntervalSeconds", 0.0)))
        if "eastmoney" in source_ids:
            clients["eastmoney"] = EastmoneyMinuteClient(minimum_interval_seconds=float(request.get("perSecurityIntervalSeconds", 0.0)))
        if "tdx" in source_ids:
            clients["tdx"] = TdxMinuteClient(
                minimum_interval_seconds=float(request.get("tdxIntervalSeconds", os.environ.get("STOCKQUANT_COLLECTION_TDX_INTERVAL_SECONDS", request.get("perSecurityIntervalSeconds", 1.0)))),
                count=int(request.get("tdxBarCount", os.environ.get("STOCKQUANT_COLLECTION_TDX_BAR_COUNT", 800))),
            )
        collector = FailoverCollector(
            [(source_id, clients[source_id]) for source_id in source_ids],
            timeout_seconds=float(request.get("timeoutSeconds", 30)),
            max_attempts=int(request.get("maxAttempts", 3)),
            backoff_seconds=float(request.get("backoffSeconds", 5)),
            health_path=request.get("healthPath") or os.environ.get("STOCKQUANT_COLLECTION_SOURCE_HEALTH_PATH") or "/var/lib/stockquant/source-health.json",
            backoff_jitter_seconds=float(request.get("backoffJitterSeconds", 0.5)),
            cooldown_seconds=float(request.get("recoveryCooldownSeconds", os.environ.get("STOCKQUANT_COLLECTION_SOURCE_RECOVERY_COOLDOWN_SECONDS", 600))),
        )
        if operation == "RECOVERY_PROBE":
            attempts = collector.probe_recovery(
                security_ids,
                start,
                end,
                timeout_seconds=float(request.get("probeTimeoutSeconds", 3)),
            )
            print(json.dumps({"status": "COMPLETED", "operation": "RECOVERY_PROBE", "attempts": attempts}, separators=(",", ":")))
            return 0
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
