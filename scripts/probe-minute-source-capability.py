"""Bounded read-only capability probe for BaoStock and Sina 5-minute data.

Historical access and live-session readiness are recorded separately. A
successful HTTP response is not sufficient: the probe also records fields,
rows, timestamp bounds and parse errors. No data is published by this script.
"""

from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from queue import Empty
from typing import Any

FIELDS = "date,time,code,open,high,low,close,volume,amount"
DEFAULT_CODES = "sh.600000,sz.000001,sh.600519"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--codes", default=DEFAULT_CODES, help="BaoStock codes, comma-separated")
    parser.add_argument("--start-date", default="2024-01-02")
    parser.add_argument("--end-date", default="2024-01-10")
    parser.add_argument("--timeout-seconds", type=float, default=15.0)
    parser.add_argument("--output")
    argv = sys.argv[1:]
    return parser.parse_args(argv[1:] if argv[:1] == ["--"] else argv)


def _baostock_child(codes: list[str], start_date: str, end_date: str, output: Any) -> None:
    try:
        import baostock as bs  # type: ignore[import-not-found]

        login = bs.login()
        if login.error_code != "0":
            output.put({"status": "FAIL", "stage": "login", "errorCode": login.error_code, "message": login.error_msg})
            return
        queries: list[dict[str, object]] = []
        try:
            for code in codes:
                query = bs.query_history_k_data_plus(code, FIELDS, start_date=start_date, end_date=end_date, frequency="5", adjustflag="3")
                rows: list[list[str]] = []
                while query.next():
                    rows.append(query.get_row_data())
                queries.append({
                    "code": code,
                    "errorCode": query.error_code,
                    "message": query.error_msg,
                    "rows": len(rows),
                    "firstRow": rows[0] if rows else None,
                    "lastRow": rows[-1] if rows else None,
                    "fields": FIELDS.split(","),
                })
        finally:
            bs.logout()
        output.put({"status": "PASS" if all(item["errorCode"] == "0" and item["rows"] for item in queries) else "PARTIAL", "queries": queries})
    except Exception as exc:  # noqa: BLE001
        output.put({"status": "FAIL", "stage": "exception", "error": repr(exc)})


def probe_baostock(codes: list[str], start_date: str, end_date: str, timeout_seconds: float) -> dict[str, object]:
    context = mp.get_context("spawn")
    queue = context.Queue()
    process = context.Process(target=_baostock_child, args=(codes, start_date, end_date, queue))
    started = time.monotonic()
    process.start()
    try:
        result = queue.get(timeout=timeout_seconds)
    except Empty:
        process.terminate()
        process.join(5)
        queue.close()
        return {"source": "baostock", "status": "TIMEOUT", "timeoutSeconds": timeout_seconds, "elapsedSeconds": round(time.monotonic() - started, 3)}
    process.join(5)
    if process.is_alive():
        process.terminate()
        process.join(5)
    queue.close()
    result["source"] = "baostock"
    result["elapsedSeconds"] = round(time.monotonic() - started, 3)
    result["exitCode"] = process.exitcode
    return result


def probe_sina(codes: list[str], timeout_seconds: float) -> dict[str, object]:
    queries: list[dict[str, object]] = []
    for code in codes:
        symbol = code.replace(".", "")
        url = "https://quotes.sina.cn/cn/api/jsonp_v2.php/=/CN_MarketDataService.getKLineData?" + urllib.parse.urlencode({"symbol": symbol, "scale": 5, "datalen": 1970})
        started = time.monotonic()
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "StockQuant-DC00/1.0"})
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                body = response.read().decode("utf-8")
            payload = body.split("=(", 1)[1].rsplit(");", 1)[0] if "=(" in body else body
            parsed = json.loads(payload)
            first = parsed[0] if parsed else None
            last = parsed[-1] if parsed else None
            queries.append({"code": code, "status": "PASS" if parsed else "EMPTY", "httpStatus": response.status, "rows": len(parsed), "firstRow": first, "lastRow": last, "fields": sorted(first.keys()) if first else [], "elapsedSeconds": round(time.monotonic() - started, 3)})
        except Exception as exc:  # noqa: BLE001
            queries.append({"code": code, "status": "FAIL", "error": repr(exc), "elapsedSeconds": round(time.monotonic() - started, 3)})
    status = "PASS" if queries and all(item["status"] == "PASS" for item in queries) else "PARTIAL"
    return {"source": "sina", "endpoint": "CN_MarketData.getKLineData", "status": status, "queries": queries}


def run() -> dict[str, object]:
    args = parse_args()
    codes = [code.strip().lower() for code in args.codes.split(",") if code.strip()]
    if not codes:
        raise ValueError("--codes must contain at least one BaoStock code")
    result: dict[str, object] = {
        "probe": "minute-source-capability",
        "status": "PARTIAL",
        "frequency": "5m",
        "codes": codes,
        "historicalWindow": {"startDate": args.start_date, "endDate": args.end_date},
        "liveSession": {"status": "NOT_RUN", "reason": "requires observation during an actual market session"},
        "probedAt": datetime.now().astimezone().isoformat(),
    }
    baostock = probe_baostock(codes, args.start_date, args.end_date, args.timeout_seconds)
    sina = probe_sina(codes, args.timeout_seconds)
    result["sources"] = [baostock, sina]
    result["status"] = "PASS" if all(item.get("status") == "PASS" for item in (baostock, sina)) else "PARTIAL"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
    return result


if __name__ == "__main__":
    output = run()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output["status"] in {"PASS", "PARTIAL"} else 1)
