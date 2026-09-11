"""Small, read-only BaoStock capability probe for V2.5 evidence.

This intentionally samples one liquid CN symbol and a short historical window.
It does not claim full-market coverage or permission to redistribute the data.
"""

from __future__ import annotations

import json
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
    finally:
        bs.logout()
    result["probedAt"] = datetime.now().astimezone().isoformat()
    result["note"] = "Read-only capability probe; does not establish full-market years, licensing, rate limits, or redistribution rights."
    return result


if __name__ == "__main__":
    output = run_probe()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    sys.exit(0 if output["status"] in {"PASS", "PARTIAL"} else 2 if output["status"] == "NOT_RUN" else 1)
