"""Resumable, read-only BaoStock daily-bar importer for bounded capacity tests.

The source is queried read-only. Output is partitioned by security and the
manifest is updated after every security so an interrupted run can resume.
This intentionally requires an explicit sample size; omitting it never starts
a full-market import by accident.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path


FIELDS = "date,code,open,high,low,close,volume,amount"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample-size", type=int, default=20)
    parser.add_argument("--start-date", default="2019-01-01")
    parser.add_argument("--end-date", default="2024-12-31")
    parser.add_argument("--output-dir", default="/tmp/stockquant-baostock-daily")
    argv = sys.argv[1:]
    if argv and argv[0] == "--":
        argv = argv[1:]
    return parser.parse_args(argv)


def atomic_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def run() -> dict[str, object]:
    args = parse_args()
    if args.sample_size < 1 or args.sample_size > 5639:
        raise ValueError("--sample-size must be between 1 and 5639; use an explicit bounded tier")
    try:
        import baostock as bs  # type: ignore[import-not-found]
    except ImportError as exc:
        return {"status": "NOT_RUN", "reason": str(exc)}

    output = Path(args.output_dir).resolve()
    manifest_path = output / "manifest.json"
    manifest: dict[str, object] = {
        "source": "baostock",
        "sourceMode": "READ_ONLY",
        "frequency": "d",
        "startDate": args.start_date,
        "endDate": args.end_date,
        "sampleSize": args.sample_size,
        "status": "RUNNING",
        "completed": [],
        "rows": 0,
        "updatedAt": datetime.now().astimezone().isoformat(),
    }
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))
        same_job = all(existing.get(key) == manifest[key] for key in ("source", "frequency", "startDate", "endDate", "sampleSize"))
        if same_job:
            manifest = existing
    completed = set(manifest.get("completed", []))
    login = bs.login()
    if login.error_code != "0":
        return {"status": "FAIL", "stage": "login", "errorCode": login.error_code, "message": login.error_msg}
    try:
        universe_query = bs.query_stock_basic()
        universe: list[list[str]] = []
        while universe_query.next():
            universe.append(universe_query.get_row_data())
        if universe_query.error_code != "0":
            return {"status": "FAIL", "stage": "universe", "errorCode": universe_query.error_code, "message": universe_query.error_msg}
        # BaoStock stock_basic columns are code, code_name, ipoDate, outDate, type, status.
        listed_stocks = [row[0] for row in universe if len(row) >= 6 and row[0] and row[4] == "1" and row[5] == "1"]
        selected = listed_stocks[: args.sample_size]
        manifest["universeRows"] = len(universe)
        manifest["listedStockRows"] = len(listed_stocks)
        manifest["selectedCodes"] = selected
        atomic_json(manifest_path, manifest)
        for code in selected:
            if code in completed:
                continue
            query = bs.query_history_k_data_plus(code, FIELDS, start_date=args.start_date, end_date=args.end_date, frequency="d", adjustflag="3")
            rows: list[list[str]] = []
            while query.next():
                rows.append(query.get_row_data())
            if query.error_code != "0":
                manifest["status"] = "FAILED"
                manifest["error"] = {"code": code, "errorCode": query.error_code, "message": query.error_msg}
                atomic_json(manifest_path, manifest)
                return manifest
            code_path = output / "daily" / f"{code.replace('.', '_')}.csv"
            code_path.parent.mkdir(parents=True, exist_ok=True)
            with code_path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(FIELDS.split(","))
                writer.writerows(rows)
            digest = hashlib.sha256(code_path.read_bytes()).hexdigest()
            manifest.setdefault("artifacts", {})[code] = {"path": str(code_path.relative_to(output)), "rows": len(rows), "sha256": digest}
            completed.add(code)
            manifest["completed"] = sorted(completed)
            manifest["rows"] = sum(item["rows"] for item in manifest["artifacts"].values())
            manifest["updatedAt"] = datetime.now().astimezone().isoformat()
            atomic_json(manifest_path, manifest)
    finally:
        bs.logout()
    manifest["status"] = "COMPLETED" if len(completed) == args.sample_size else "FAILED"
    if manifest["status"] == "COMPLETED":
        manifest.pop("error", None)
    manifest["updatedAt"] = datetime.now().astimezone().isoformat()
    atomic_json(manifest_path, manifest)
    return manifest


if __name__ == "__main__":
    try:
        result = run()
    except Exception as exc:  # pragma: no cover - CLI boundary
        result = {"status": "FAIL", "error": str(exc)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result.get("status") in {"COMPLETED", "NOT_RUN"} else 1)
