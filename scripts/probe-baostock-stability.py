"""Bounded BaoStock rate/session stability probe.

This is deliberately finite and read-only. It measures repeated 5-minute
queries over a small listed-stock sample, then reconnects once to verify
session recovery. It is not a substitute for a long-term production soak.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime


def run() -> dict[str, object]:
    try:
        import baostock as bs  # type: ignore[import-not-found]
    except ImportError as exc:
        return {"status": "NOT_RUN", "reason": str(exc)}

    rounds = max(1, int(os.environ.get("BAOSTOCK_STABILITY_ROUNDS", "3")))
    sample_size = max(1, int(os.environ.get("BAOSTOCK_STABILITY_SAMPLE", "20")))
    result: dict[str, object] = {"source": "baostock", "mode": "READ_ONLY", "frequency": "5m", "rounds": rounds, "sampleSize": sample_size, "queries": []}

    def login() -> tuple[bool, dict[str, object]]:
        response = bs.login()
        return response.error_code == "0", {"errorCode": response.error_code, "message": response.error_msg}

    logged_in, login_result = login()
    result["login"] = login_result
    if not logged_in:
        result["status"] = "FAIL"
        return result
    try:
        basic = bs.query_stock_basic()
        universe: list[list[str]] = []
        while basic.next():
            universe.append(basic.get_row_data())
        symbols = [row[0] for row in universe if len(row) >= 6 and row[0] and row[4] == "1" and row[5] == "1"][:sample_size]
        result["listedStockUniverse"] = len(symbols)
        for round_index in range(rounds):
            started = time.monotonic()
            successes = 0
            empty = 0
            errors: list[dict[str, object]] = []
            for code in symbols:
                query = bs.query_history_k_data_plus(code, "date,time,code,open,high,low,close,volume,amount", start_date="2024-01-02", end_date="2024-01-10", frequency="5", adjustflag="3")
                rows = 0
                while query.next():
                    rows += 1
                if query.error_code != "0":
                    errors.append({"code": code, "errorCode": query.error_code, "message": query.error_msg})
                elif rows == 0:
                    empty += 1
                else:
                    successes += 1
            result["queries"].append({"round": round_index + 1, "successes": successes, "empty": empty, "errors": errors, "elapsedSeconds": round(time.monotonic() - started, 3)})  # type: ignore[union-attr]
        bs.logout()
        recovered, recovery_result = login()
        result["recoveryLogin"] = recovery_result
        if recovered:
            bs.logout()
        result["status"] = "PASS" if symbols and all(item["successes"] == len(symbols) and not item["errors"] for item in result["queries"]) and recovered else "PARTIAL"
    finally:
        try:
            bs.logout()
        except Exception:
            pass
    result["probedAt"] = datetime.now().astimezone().isoformat()
    result["note"] = "Bounded repeated-query probe; does not establish long-term rate limits, production SLA, licensing, or 20-trading-day observation."
    return result


if __name__ == "__main__":
    output = run()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output.get("status") in {"PASS", "PARTIAL", "NOT_RUN"} else 1)
