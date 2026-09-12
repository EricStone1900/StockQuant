"""Read-only capability probe for BaoStock financial and industry PIT fields."""

from __future__ import annotations

import json
from datetime import datetime


def rows(query: object) -> list[list[str]]:
    result: list[list[str]] = []
    while query.next():  # type: ignore[attr-defined]
        result.append(query.get_row_data())  # type: ignore[attr-defined]
    return result


def run() -> dict[str, object]:
    try:
        import baostock as bs  # type: ignore[import-not-found]
    except ImportError as exc:
        return {"status": "NOT_RUN", "reason": str(exc)}

    code = "sh.600000"
    login = bs.login()
    if login.error_code != "0":
        return {"status": "FAIL", "stage": "login", "errorCode": login.error_code, "message": login.error_msg}
    try:
        profit = bs.query_profit_data(code=code, year=2024, quarter=1)
        profit_rows = rows(profit)
        industry = bs.query_stock_industry(code=code)
        industry_rows = rows(industry)
    finally:
        bs.logout()

    financial_fields = profit.fields
    financial_has_dates = profit.error_code == "0" and bool(profit_rows) and {"pubDate", "statDate"}.issubset(financial_fields)
    industry_fields = industry.fields
    industry_has_effective_history = {"effectiveFrom", "effectiveTo", "revision"}.issubset(industry_fields)
    return {
        "status": "PARTIAL" if financial_has_dates else "FAIL",
        "source": "baostock",
        "mode": "READ_ONLY",
        "sample": {"code": code, "year": 2024, "quarter": 1},
        "financial": {
            "status": "PARTIAL" if financial_has_dates else "FAIL",
            "fields": financial_fields,
            "rows": len(profit_rows),
            "supportsPublicationDate": financial_has_dates,
            "missingForProductionPit": ["revision chain", "source artifact/provenance", "historical security universe"],
        },
        "industry": {
            "status": "NOT_AVAILABLE" if not industry_has_effective_history else "PARTIAL",
            "fields": industry_fields,
            "rows": len(industry_rows),
            "missingForProductionPit": [] if industry_has_effective_history else ["historical effective interval", "revision chain", "historical constituent membership"],
        },
        "probedAt": datetime.now().astimezone().isoformat(),
        "note": "Financial factors remain disabled unless their specific PIT fields and revision evidence are available. Current industry classifications must not be projected backwards.",
    }


if __name__ == "__main__":
    output = run()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output.get("status") in {"PARTIAL", "NOT_RUN"} else 1)
