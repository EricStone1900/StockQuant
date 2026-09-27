"""Stream selected columns from a bounded minute-bar Parquet file as JSONL."""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, TextIO

import pyarrow.parquet as pq  # type: ignore[import-untyped]

FIELDS = ("securityId", "timestamp", "open", "high", "low", "close", "volume", "amount")
MAX_BYTES = 64 * 1024 * 1024
MAX_ROWS = 100_000
BATCH_SIZE = 1_000


def _wire(value: Any) -> str | int | float | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        if isinstance(value, datetime) and value.tzinfo is not None:
            raise ValueError("timestamp column must be timezone-naive and interpreted as Asia/Shanghai")
        return value.isoformat(sep=" ") if isinstance(value, datetime) else value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (str, int, float)) and not isinstance(value, bool):
        return value
    raise ValueError(f"unsupported Parquet scalar type: {type(value).__name__}")


def stream_parquet(path: Path, mapping: dict[str, str], output: TextIO) -> int:
    if set(mapping) != set(FIELDS) or len(set(mapping.values())) != len(FIELDS):
        raise ValueError("mapping must select eight distinct columns for all required minute fields")
    size = path.stat().st_size
    if size < 1 or size > MAX_BYTES:
        raise ValueError(f"Parquet file size must be between 1 and {MAX_BYTES} bytes")
    parquet = pq.ParquetFile(path)
    names = parquet.schema_arrow.names
    if len(names) != len(set(names)):
        raise ValueError("Parquet column names must be unique")
    if any(column not in names for column in mapping.values()):
        raise ValueError("mapping names a missing Parquet column")
    selected = [mapping[field] for field in FIELDS]
    count = 0
    for batch in parquet.iter_batches(batch_size=BATCH_SIZE, columns=selected, use_threads=False):
        for row in batch.to_pylist():
            count += 1
            if count > MAX_ROWS:
                raise ValueError(f"Parquet exceeds {MAX_ROWS} data rows")
            values = {field: _wire(row[mapping[field]]) for field in FIELDS}
            output.write(json.dumps(values, ensure_ascii=False, separators=(",", ":")) + "\n")
    if count == 0:
        raise ValueError("Parquet file has no data rows")
    return count


def main() -> int:
    try:
        request = json.loads(sys.stdin.readline())
        path = Path(request["path"])
        mapping = request["mapping"]
        if not path.is_absolute() or not path.is_file() or path.is_symlink():
            raise ValueError("Parquet input must be an existing regular file")
        if not isinstance(mapping, dict) or any(not isinstance(key, str) or not isinstance(value, str) for key, value in mapping.items()):
            raise ValueError("mapping must be a string-to-string object")
        count = stream_parquet(path, mapping, sys.stdout)
        sys.stderr.write(json.dumps({"status": "COMPLETED", "rows": count}) + "\n")
        return 0
    except Exception as error:  # noqa: BLE001 - emit a bounded machine-readable CLI error
        sys.stderr.write(json.dumps({"status": "REJECTED", "reason": str(error)[:1000]}) + "\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
