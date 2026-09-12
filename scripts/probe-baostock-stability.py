"""Bounded BaoStock rate/session stability probe.

This is deliberately finite and read-only. It measures repeated 5-minute
queries over a small listed-stock sample, then reconnects once to verify
session recovery. It is not a substitute for a long-term production soak.
"""

from __future__ import annotations

import json
import multiprocessing as mp
import os
import time
from datetime import datetime
from queue import Empty
from typing import Any

DEFAULT_SYMBOLS = "sh.600000,sh.600004,sh.600006"
FIELDS = "date,time,code,open,high,low,close,volume,amount"


def _query_in_isolated_session(code: str, output: Any) -> None:
    """Run one query in a fresh BaoStock session and return JSON-safe facts."""
    try:
        import baostock as bs  # type: ignore[import-not-found]

        login = bs.login()
        if login.error_code != "0":
            output.put({"code": code, "outcome": "LOGIN_ERROR", "errorCode": login.error_code, "message": login.error_msg})
            return
        try:
            query = bs.query_history_k_data_plus(code, FIELDS, start_date="2024-01-02", end_date="2024-01-10", frequency="5", adjustflag="3")
            rows = 0
            while query.next():
                rows += 1
            if query.error_code != "0":
                output.put({"code": code, "outcome": "QUERY_ERROR", "errorCode": query.error_code, "message": query.error_msg, "rows": rows})
            elif rows == 0:
                output.put({"code": code, "outcome": "EMPTY", "rows": 0})
            else:
                output.put({"code": code, "outcome": "SUCCESS", "rows": rows})
        finally:
            bs.logout()
    except Exception as exc:  # noqa: BLE001  # pragma: no cover - external SDK boundary
        output.put({"code": code, "outcome": "EXCEPTION", "message": repr(exc)})


def _run_one(context: Any, code: str, timeout_seconds: float) -> dict[str, object]:
    queue = context.Queue()
    process = context.Process(target=_query_in_isolated_session, args=(code, queue))
    started = time.monotonic()
    process.start()
    process.join(timeout_seconds)
    elapsed = round(time.monotonic() - started, 3)
    if process.is_alive():
        process.terminate()
        process.join(5)
        queue.close()
        return {"code": code, "outcome": "TIMEOUT", "timeoutSeconds": timeout_seconds, "elapsedSeconds": elapsed}
    try:
        facts = queue.get(timeout=1)
    except Empty:
        facts = {"code": code, "outcome": "NO_RESULT", "exitCode": process.exitcode}
    queue.close()
    facts["elapsedSeconds"] = elapsed
    facts["exitCode"] = process.exitcode
    return facts


def run() -> dict[str, object]:
    rounds = max(1, int(os.environ.get("BAOSTOCK_STABILITY_ROUNDS", "3")))
    requested_symbols = [value.strip() for value in os.environ.get("BAOSTOCK_STABILITY_SYMBOLS", DEFAULT_SYMBOLS).split(",") if value.strip()]
    sample_size = min(max(1, int(os.environ.get("BAOSTOCK_STABILITY_SAMPLE", str(len(requested_symbols))))), len(requested_symbols))
    timeout_seconds = max(1.0, float(os.environ.get("BAOSTOCK_STABILITY_QUERY_TIMEOUT_SECONDS", "30")))
    interval_seconds = max(0.0, float(os.environ.get("BAOSTOCK_STABILITY_INTERVAL_SECONDS", "1")))
    symbols = requested_symbols[:sample_size]
    context = mp.get_context("spawn")
    result: dict[str, object] = {"source": "baostock", "mode": "READ_ONLY", "frequency": "5m", "rounds": rounds, "sampleSize": len(symbols), "symbols": symbols, "queryTimeoutSeconds": timeout_seconds, "intervalSeconds": interval_seconds, "queries": []}

    for round_index in range(rounds):
        round_results: list[dict[str, object]] = []
        for code in symbols:
            round_results.append(_run_one(context, code, timeout_seconds))
            if interval_seconds:
                time.sleep(interval_seconds)
        result["queries"].append({"round": round_index + 1, "results": round_results})  # type: ignore[union-attr]

    result["recoveryProbe"] = _run_one(context, symbols[0], timeout_seconds) if symbols else {"outcome": "NO_SYMBOLS"}
    query_results = [item for round_item in result["queries"] for item in round_item["results"]]  # type: ignore[index, union-attr]
    all_success = bool(query_results) and all(item.get("outcome") == "SUCCESS" for item in query_results)
    recovered = result["recoveryProbe"].get("outcome") == "SUCCESS"  # type: ignore[index, union-attr]
    result["status"] = "PASS" if all_success and recovered else "PARTIAL"
    result["probedAt"] = datetime.now().astimezone().isoformat()
    result["note"] = "Each request uses a fresh session and has a parent-enforced timeout. PASS covers only this bounded sample, not long-term rate limits, production SLA, licensing, or 20-trading-day observation."
    return result


if __name__ == "__main__":
    output = run()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output.get("status") in {"PASS", "PARTIAL", "NOT_RUN"} else 1)
