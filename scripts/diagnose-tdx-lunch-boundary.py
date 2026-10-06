"""Read-only, one-pass capture of TDX lunch-boundary protocol records.

This deliberately pins the server and security set from the 2026-09-30
shadow observation. It stores only boundary records from the decompressed
response plus its hash; it does not publish market data or touch a database.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/market-data-adapter/src"))
from market_data_adapter.authorization import missing_collection_source_authorization

SECURITIES = (
    "600000.SH", "600004.SH", "600006.SH", "600007.SH", "600008.SH",
    "600009.SH", "600010.SH", "600011.SH", "600012.SH", "600015.SH",
    "600016.SH", "600017.SH", "600018.SH", "600019.SH", "600020.SH",
    "600021.SH", "600022.SH", "600023.SH", "600025.SH", "600026.SH",
)
HOST = "121.37.207.165"
DATE = "2026-09-30"
DEFAULT_OUTPUT = Path("evidence/dc08a/dc-t19/2026-09-30/tdx-boundary-raw-diagnostic.json")
BOUNDARY = {"11:20", "11:25", "11:30", "13:00", "13:05", "13:10"}


def extract_boundary_records(body: bytes) -> dict[str, object]:
    if len(body) < 33:
        raise ValueError("TDX response body shorter than 33-byte header")
    _, _, advertised_count, _ = struct.unpack_from("<HBHI", body, 24)
    count = min(advertised_count, (len(body) - 33) // 36)
    records: list[dict[str, object]] = []
    times: list[str] = []
    for index in range(count):
        offset = 33 + index * 36
        raw = body[offset:offset + 36]
        ymd, time_num, open_, high, low, close, amount, volume, float_shares = struct.unpack("<II7f", raw)
        if ymd != 20260930:
            continue
        hour, minute = divmod(time_num, 3600)
        minute //= 60
        label = f"{hour:02d}:{minute:02d}"
        times.append(label)
        if label in BOUNDARY:
            records.append({
                "index": index, "ymd": ymd, "timeNum": time_num,
                "label": label, "rawRecordHex": raw.hex(),
                "open": open_, "high": high, "low": low, "close": close,
                "amount": amount, "volume": volume, "floatShares": float_shares,
            })
    return {
        "responseBodySha256": hashlib.sha256(body).hexdigest(),
        "responseBodyBytes": len(body), "advertisedCount": advertised_count,
        "parsedCount": count, "dayLabels": times, "boundaryRecords": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    output = parser.parse_args().output
    missing = missing_collection_source_authorization(["tdx"])
    if missing:
        print(json.dumps({"status": "BLOCKED", "source": "tdx", "blockedBeforeNetwork": True, "missingAuthorization": missing}, ensure_ascii=False))
        return 2
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite evidence: {output}")
    from easy_tdx import Market, Period
    from easy_tdx.mac.client import MacClient
    from easy_tdx.mac.commands.symbol_bar import SymbolBarCmd

    class CapturingSymbolBarCmd(SymbolBarCmd):
        def __init__(self, code: str) -> None:
            super().__init__(market=Market.SH, code=code, period=Period.MIN_5, start=0, count=160)
            self.body: bytes | None = None

        def parse_response(self, body: bytes):
            self.body = body
            return super().parse_response(body)

    results: list[dict[str, object]] = []
    started = time.monotonic()
    try:
        with MacClient(HOST, timeout=10, auto_reconnect=False, heartbeat_interval=0) as client:
            for index, security_id in enumerate(SECURITIES):
                if index:
                    time.sleep(1)
                command = CapturingSymbolBarCmd(security_id[:6])
                per_security_started = time.monotonic()
                try:
                    client._execute(command)
                    if command.body is None:
                        raise ValueError("TDX returned no response body")
                    result = extract_boundary_records(command.body)
                    result.update({"securityId": security_id, "status": "CAPTURED", "latencyMs": round((time.monotonic() - per_security_started) * 1000, 3)})
                except Exception as error:  # noqa: BLE001 - preserve classified evidence
                    result = {"securityId": security_id, "status": "FAIL", "errorType": type(error).__name__, "error": str(error)}
                results.append(result)
    except Exception as error:  # noqa: BLE001 - preserve connection failure
        results.append({"status": "FAIL", "errorType": type(error).__name__, "error": str(error)})
    status = "PASS" if len(results) == len(SECURITIES) and all(item["status"] == "CAPTURED" for item in results) else "PARTIAL"
    report = {
        "purpose": "TDX 2026-09-30 lunch-boundary diagnosis",
        "status": status, "readOnly": True, "date": DATE, "server": HOST,
        "capturedAt": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "elapsedSeconds": round(time.monotonic() - started, 3),
        "sdkMethod": "MacClient._execute(SymbolBarCmd)",
        "request": {"period": "MIN_5", "start": 0, "count": 160, "timeoutSeconds": 10, "attempts": 1},
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({"status": status, "file": str(output), "server": HOST, "captured": sum(item["status"] == "CAPTURED" for item in results), "requested": len(SECURITIES), "elapsedSeconds": report["elapsedSeconds"]}))
    return 0 if status == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
