"""Read-only BaoStock capability probe for V2.5 evidence.

The probe checks one liquid symbol's frequencies and a bounded multi-year sample
from the published stock universe. It does not claim full-market capacity or
permission to redistribute the data.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime


def run_probe() -> dict[str, object]:
    try:
        import baostock as bs  # type: ignore[import-not-found]
    except ImportError as exc:
        return {"source": "baostock", "status": "NOT_RUN", "reason": str(exc)}

    login = bs.login()
    if login.error_code != "0":
        return {"source": "baostock", "status": "FAIL", "stage": "login", "errorCode": login.error_code, "message": login.error_msg}

    result: dict[str, object] = {"source": "baostock", "status": "PASS", "symbol": "sh.600000", "window": ["2024-01-02", "2024-01-10"], "queries": []}
    try:
        for frequency in ("d", "5", "1"):
            fields = "date,code,open,high,low,close,volume,amount" if frequency == "d" else "date,time,code,open,high,low,close,volume,amount"
            query = bs.query_history_k_data_plus(
                "sh.600000",
                fields,
                start_date="2024-01-02",
                end_date="2024-01-10",
                frequency=frequency,
                adjustflag="3",
            )
            rows: list[list[str]] = []
            while query.next():
                rows.append(query.get_row_data())
            item = {"frequency": frequency, "errorCode": query.error_code, "message": query.error_msg, "rows": len(rows), "firstRow": rows[0] if rows else None, "lastRow": rows[-1] if rows else None}
            result["queries"].append(item)  # type: ignore[union-attr]
            if query.error_code != "0":
                result["status"] = "PARTIAL"

        universe_query = bs.query_all_stock(day="2024-01-05")
        universe: list[list[str]] = []
        while universe_query.next():
            universe.append(universe_query.get_row_data())
        result["universe"] = {
            "asOf": "2024-01-05",
            "errorCode": universe_query.error_code,
            "message": universe_query.error_msg,
            "rows": len(universe),
        }
        if universe_query.error_code != "0":
            result["status"] = "PARTIAL"

        basic_query = bs.query_stock_basic()
        basic_rows: list[list[str]] = []
        while basic_query.next():
            basic_rows.append(basic_query.get_row_data())
        listed_stocks = [row[0] for row in basic_rows if len(row) >= 6 and row[0] and row[4] == "1" and row[5] == "1"]
        result["listedStockUniverse"] = {"errorCode": basic_query.error_code, "message": basic_query.error_msg, "rows": len(listed_stocks)}
        if basic_query.error_code != "0":
            result["status"] = "PARTIAL"

        sample_size = max(1, min(int(os.environ.get("BAOSTOCK_CAPACITY_SAMPLE", "20")), len(listed_stocks))) if listed_stocks else 0
        capacity_queries: list[dict[str, object]] = []
        for code in listed_stocks[:sample_size]:
            if not code:
                continue
            capacity = bs.query_history_k_data_plus(
                code,
                "date,code,open,high,low,close,volume,amount",
                start_date="2019-01-01",
                end_date="2024-12-31",
                frequency="d",
                adjustflag="3",
            )
            rows = 0
            first_row = None
            last_row = None
            while capacity.next():
                row_data = capacity.get_row_data()
                rows += 1
                first_row = first_row or row_data
                last_row = row_data
            capacity_queries.append({"code": code, "errorCode": capacity.error_code, "rows": rows, "firstRow": first_row, "lastRow": last_row})
            if capacity.error_code != "0":
                result["status"] = "PARTIAL"
        result["multiYearSample"] = {"startDate": "2019-01-01", "endDate": "2024-12-31", "sampleSize": sample_size, "queries": capacity_queries}

        minute_sample_size = max(0, min(int(os.environ.get("BAOSTOCK_MINUTE_SAMPLE", "0")), len(listed_stocks))) if listed_stocks else 0
        minute_queries: list[dict[str, object]] = []
        for code in listed_stocks[:minute_sample_size]:
            if not code:
                continue
            minute = bs.query_history_k_data_plus(
                code,
                "date,time,code,open,high,low,close,volume,amount",
                start_date="2024-01-02",
                end_date="2024-01-10",
                frequency="5",
                adjustflag="3",
            )
            rows = 0
            first_row = None
            last_row = None
            while minute.next():
                row_data = minute.get_row_data()
                rows += 1
                first_row = first_row or row_data
                last_row = row_data
            minute_queries.append({"code": code, "errorCode": minute.error_code, "rows": rows, "firstRow": first_row, "lastRow": last_row})
            if minute.error_code != "0" or rows == 0:
                result["status"] = "PARTIAL"
        if minute_sample_size:
            result["minuteSample"] = {"frequency": "5m", "startDate": "2024-01-02", "endDate": "2024-01-10", "sampleSize": minute_sample_size, "successful": sum(item["errorCode"] == "0" and item["rows"] > 0 for item in minute_queries), "queries": minute_queries}
    finally:
        bs.logout()
    result["probedAt"] = datetime.now().astimezone().isoformat()
    result["note"] = "Read-only capability probe; the multi-year sample is bounded and does not establish full-market capacity, licensing, rate limits, or redistribution rights."
    return result


if __name__ == "__main__":
    output = run_probe()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    sys.exit(0 if output["status"] in {"PASS", "PARTIAL"} else 2 if output["status"] == "NOT_RUN" else 1)
