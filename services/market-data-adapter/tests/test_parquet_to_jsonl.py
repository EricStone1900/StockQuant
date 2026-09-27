from datetime import datetime
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from market_data_adapter.parquet_to_jsonl import MAX_BYTES, MAX_ROWS, stream_parquet

MAPPING = {
    "securityId": "code",
    "timestamp": "time",
    "open": "o",
    "high": "h",
    "low": "l",
    "close": "c",
    "volume": "vol",
    "amount": "amt",
}


def _write(path: Path, rows: int = 2) -> None:
    table = pa.table(
        {
            "code": ["600000"] * rows,
            "time": [datetime(2026, 9, 24, 9, 30 + (index % 30)) for index in range(rows)],
            "o": [10.0] * rows,
            "h": [11.0] * rows,
            "l": [9.0] * rows,
            "c": [10.5] * rows,
            "vol": [100] * rows,
            "amt": [1050.0] * rows,
        }
    )
    pq.write_table(table, path)


def test_streams_selected_columns_as_json_lines(tmp_path: Path) -> None:
    path = tmp_path / "bars.parquet"
    _write(path)
    from io import StringIO

    output = StringIO()
    count = stream_parquet(path, MAPPING, output)

    assert count == 2
    assert output.getvalue().splitlines()[0] == (
        '{"securityId":"600000","timestamp":"2026-09-24 09:30:00",'
        '"open":10.0,"high":11.0,"low":9.0,"close":10.5,"volume":100,"amount":1050.0}'
    )


def test_rejects_incomplete_or_duplicate_mappings(tmp_path: Path) -> None:
    path = tmp_path / "bars.parquet"
    _write(path)
    from io import StringIO

    with pytest.raises(ValueError, match="eight distinct"):
        stream_parquet(path, {"securityId": "code"}, StringIO())
    duplicate = {**MAPPING, "amount": "vol"}
    with pytest.raises(ValueError, match="eight distinct"):
        stream_parquet(path, duplicate, StringIO())
    with pytest.raises(ValueError, match="missing Parquet column"):
        stream_parquet(path, {**MAPPING, "timestamp": "missing"}, StringIO())


def test_rejects_empty_and_oversized_inputs(tmp_path: Path) -> None:
    empty = tmp_path / "empty.parquet"
    pq.write_table(pa.table({name: pa.array([], type=pa.string()) for name in MAPPING.values()}), empty)
    from io import StringIO

    with pytest.raises(ValueError, match="no data rows"):
        stream_parquet(empty, MAPPING, StringIO())

    too_many = tmp_path / "too-many.parquet"
    _write(too_many, MAX_ROWS + 1)
    with pytest.raises(ValueError, match="100000 data rows"):
        stream_parquet(too_many, MAPPING, StringIO())

    too_large = tmp_path / "large.parquet"
    too_large.write_bytes(b"x" * (MAX_BYTES + 1))
    with pytest.raises(ValueError, match="file size"):
        stream_parquet(too_large, MAPPING, StringIO())
