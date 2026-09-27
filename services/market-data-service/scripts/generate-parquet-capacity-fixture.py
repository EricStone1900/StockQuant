#!/usr/bin/env python3
"""Create deterministic, synthetic 100k-row Parquet input for the HTTP capacity smoke."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq


def main(path: Path) -> None:
    compression_arg = sys.argv[2] if len(sys.argv) > 2 else "zstd"
    if compression_arg not in {"zstd", "snappy", "none"}:
        raise ValueError("compression must be zstd, snappy, or none")
    dates = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-08"]
    securities: list[str] = []
    timestamps: list[datetime] = []
    prices: list[float] = []
    volumes: list[int] = []
    amounts: list[float] = []
    for day in dates:
        for slot in range(40):
            minute = (570 + slot * 5) if slot < 24 else (780 + (slot - 24) * 5)
            bar_time = datetime.fromisoformat(day) + timedelta(minutes=minute)
            for security in range(500):
                base = 10 + security / 100_000
                securities.append(f"{600000 + security:06d}.SH")
                timestamps.append(bar_time)
                prices.append(base)
                volumes.append(100 + security % 10)
                amounts.append(base * (100 + security % 10))

    table = pa.table(
        {
            "securityId": pa.array(securities, type=pa.string()),
            "timestamp": pa.array(timestamps, type=pa.timestamp("us")),
            "open": pa.array(prices, type=pa.float64()),
            "high": pa.array([value + 0.02 for value in prices], type=pa.float64()),
            "low": pa.array([value - 0.02 for value in prices], type=pa.float64()),
            "close": pa.array([value + 0.01 for value in prices], type=pa.float64()),
            "volume": pa.array(volumes, type=pa.int64()),
            "amount": pa.array(amounts, type=pa.float64()),
        }
    )
    pq.write_table(table, path, compression=None if compression_arg == "none" else compression_arg, row_group_size=10_000, use_dictionary=False)
    if table.num_rows != 100_000:
        raise RuntimeError(f"expected 100000 rows, wrote {table.num_rows}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
