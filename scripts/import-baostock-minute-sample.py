"""Resumable, bounded BaoStock 5-minute sample importer.

The importer uses codes frozen in the archived daily-data manifest.  Each
source call is isolated and timed out so an upstream wait becomes recorded
evidence, never an indefinitely blocked capacity task.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import multiprocessing as mp
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from queue import Empty
from typing import Any

FIELDS = "date,time,code,open,high,low,close,volume,amount"
DEFAULT_SOURCE = "data/local/baostock-daily-2019-2024-v1/manifest.json"
DEFAULT_OUTPUT = "data/local/baostock-minute-20x60-v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample-size", type=int, default=20)
    parser.add_argument("--start-date", default="2024-01-02")
    parser.add_argument("--end-date", default="2024-03-29")
    parser.add_argument("--timeout-seconds", type=float, default=30)
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--retry-backoff-seconds", type=float, default=1)
    parser.add_argument("--source-manifest", default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT)
    parser.add_argument("--continue-on-error", action="store_true")
    argv = sys.argv[1:]
    return parser.parse_args(argv[1:] if argv[:1] == ["--"] else argv)


def atomic_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def _fetch(code: str, start_date: str, end_date: str, output: Any) -> None:
    try:
        import baostock as bs  # type: ignore[import-not-found]

        login = bs.login()
        if login.error_code != "0":
            output.put({"outcome": "LOGIN_ERROR", "errorCode": login.error_code, "message": login.error_msg})
            return
        try:
            query = bs.query_history_k_data_plus(code, FIELDS, start_date=start_date, end_date=end_date, frequency="5", adjustflag="3")
            rows: list[list[str]] = []
            while query.next():
                rows.append(query.get_row_data())
            if query.error_code != "0":
                output.put({"outcome": "QUERY_ERROR", "errorCode": query.error_code, "message": query.error_msg})
            else:
                output.put({"outcome": "SUCCESS", "rows": rows})
        finally:
            bs.logout()
    except Exception as exc:  # noqa: BLE001  # pragma: no cover - external SDK boundary
        output.put({"outcome": "EXCEPTION", "message": repr(exc)})


def fetch_with_timeout(context: Any, code: str, start_date: str, end_date: str, timeout_seconds: float) -> dict[str, object]:
    queue = context.Queue()
    process = context.Process(target=_fetch, args=(code, start_date, end_date, queue))
    started = time.monotonic()
    process.start()
    try:
        # Consume the result before joining.  A child that has placed a large
        # row set on a multiprocessing queue can otherwise wait for its queue
        # feeder while the parent waits in join().
        response = queue.get(timeout=timeout_seconds)
    except Empty:
        process.terminate()
        process.join(5)
        queue.close()
        return {"outcome": "TIMEOUT", "timeoutSeconds": timeout_seconds, "elapsedSeconds": round(time.monotonic() - started, 3)}
    process.join(5)
    if process.is_alive():
        process.terminate()
        process.join(5)
    queue.close()
    response["elapsedSeconds"] = round(time.monotonic() - started, 3)
    response["exitCode"] = process.exitcode
    return response


def fetch_with_retries(
    context: Any, code: str, start_date: str, end_date: str, timeout_seconds: float, max_attempts: int, retry_backoff_seconds: float
) -> dict[str, object]:
    attempts: list[dict[str, object]] = []
    for attempt in range(1, max_attempts + 1):
        response = fetch_with_timeout(context, code, start_date, end_date, timeout_seconds)
        attempts.append({key: value for key, value in response.items() if key != "rows"})
        if response.get("outcome") == "SUCCESS":
            response["attempts"] = attempts
            return response
        if attempt < max_attempts:
            time.sleep(retry_backoff_seconds * attempt)
    response["attempts"] = attempts
    return response


def validate_rows(code: str, rows: list[list[str]]) -> str | None:
    seen: set[tuple[str, str]] = set()
    if not rows:
        return "EMPTY"
    for row in rows:
        if len(row) != len(FIELDS.split(",")) or row[2] != code:
            return "SCHEMA_OR_CODE"
        key = (row[0], row[1])
        if key in seen:
            return "DUPLICATE_TIMESTAMP"
        seen.add(key)
        try:
            opening, high, low, close = (float(row[index]) for index in (3, 4, 5, 6))
        except ValueError:
            return "NON_NUMERIC_OHLC"
        if min(opening, close) < low or max(opening, close) > high:
            return "INVALID_OHLC_RANGE"
    return None


def run() -> dict[str, object]:
    args = parse_args()
    if args.sample_size < 1:
        raise ValueError("--sample-size must be positive")
    if args.max_attempts < 1 or args.retry_backoff_seconds < 0:
        raise ValueError("--max-attempts must be positive and --retry-backoff-seconds cannot be negative")
    source = json.loads(Path(args.source_manifest).read_text(encoding="utf-8"))
    codes = list(source.get("selectedCodes", []))[: args.sample_size]
    if len(codes) != args.sample_size:
        raise ValueError("source manifest does not contain enough frozen listed-stock codes")
    output = Path(args.output_dir)
    manifest_path = output / "manifest.json"
    manifest: dict[str, object] = {"source": "baostock", "sourceMode": "READ_ONLY", "frequency": "5m", "startDate": args.start_date, "endDate": args.end_date, "sampleSize": args.sample_size, "selectedCodes": codes, "status": "RUNNING", "completed": [], "rows": 0, "artifacts": {}, "updatedAt": datetime.now().astimezone().isoformat()}
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        keys = ("source", "frequency", "startDate", "endDate", "sampleSize", "selectedCodes")
        if all(previous.get(key) == manifest[key] for key in keys):
            manifest = previous
    completed = set(manifest.get("completed", []))
    context = mp.get_context("spawn")
    for code in codes:
        if code in completed:
            continue
        response = fetch_with_retries(context, code, args.start_date, args.end_date, args.timeout_seconds, args.max_attempts, args.retry_backoff_seconds)
        if response.get("outcome") != "SUCCESS":
            manifest.update({"status": "FAILED", "error": {"code": code, **response}, "updatedAt": datetime.now().astimezone().isoformat()})
            atomic_json(manifest_path, manifest)
            if not args.continue_on_error:
                return manifest
            continue
        rows = response["rows"]
        error = validate_rows(code, rows)
        if error:
            manifest.update({"status": "FAILED", "error": {"code": code, "outcome": error}, "updatedAt": datetime.now().astimezone().isoformat()})
            atomic_json(manifest_path, manifest)
            if not args.continue_on_error:
                return manifest
            continue
        path = output / "minute-5" / f"{code.replace('.', '_')}.csv"
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(FIELDS.split(","))
            writer.writerows(rows)
        artifact = {"path": str(path.relative_to(output)), "rows": len(rows), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "quality": "PASS", "sourceAttempts": response["attempts"]}
        manifest["artifacts"][code] = artifact  # type: ignore[index]
        completed.add(code)
        manifest["completed"] = sorted(completed)
        manifest["rows"] = sum(item["rows"] for item in manifest["artifacts"].values())  # type: ignore[index, union-attr]
        manifest["updatedAt"] = datetime.now().astimezone().isoformat()
        atomic_json(manifest_path, manifest)
    manifest["status"] = "COMPLETED" if len(completed) == len(codes) else "FAILED"
    if manifest["status"] == "COMPLETED":
        manifest.pop("error", None)
    manifest["updatedAt"] = datetime.now().astimezone().isoformat()
    atomic_json(manifest_path, manifest)
    return manifest


if __name__ == "__main__":
    try:
        result = run()
    except Exception as exc:  # noqa: BLE001  # pragma: no cover - CLI boundary
        result = {"status": "FAIL", "error": repr(exc)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result.get("status") == "COMPLETED" else 1)
