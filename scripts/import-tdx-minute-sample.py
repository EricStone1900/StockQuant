"""Import existing TongDaXin 5-minute files as a local, read-only fallback."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

FIELDS = "date,time,code,open,high,low,close,volume,amount"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tdx-dir", required=True, help="Existing TongDaXin installation or data root")
    parser.add_argument("--symbols", required=True, help="Comma-separated symbols, for example sh600000,sz000001")
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--output-dir", default="data/local/tdx-minute-5")
    argv = sys.argv[1:]
    return parser.parse_args(argv[1:] if argv[:1] == ["--"] else argv)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def normalize(symbol: str, frame: Any) -> list[list[str]]:
    rows: list[list[str]] = []
    for timestamp, item in frame.iterrows():
        date = timestamp.strftime("%Y-%m-%d")
        time = timestamp.strftime("%Y%m%d%H%M00000")
        values = [float(item[column]) for column in ("open", "high", "low", "close", "volume", "amount")]
        opening, high, low, close, volume, amount = values
        if min(opening, close) < low or max(opening, close) > high:
            raise ValueError(f"{symbol} has invalid OHLC at {timestamp}")
        if volume < 0 or amount < 0:
            raise ValueError(f"{symbol} has negative volume or amount at {timestamp}")
        rows.append([date, time, symbol, *(str(value) for value in values)])
    if not rows:
        raise ValueError(f"{symbol} has no rows in the requested date range")
    if len({(row[0], row[1]) for row in rows}) != len(rows):
        raise ValueError(f"{symbol} has duplicate timestamps")
    return rows


def run() -> dict[str, object]:
    args = parse_args()
    try:
        from mootdx.reader import Reader  # type: ignore[import-not-found]
    except ImportError as exc:
        return {"status": "NOT_RUN", "reason": str(exc)}

    tdx_dir = Path(args.tdx_dir).resolve()
    if not tdx_dir.is_dir():
        raise ValueError(f"--tdx-dir does not exist: {tdx_dir}")
    symbols = [symbol.strip().lower() for symbol in args.symbols.split(",") if symbol.strip()]
    if not symbols:
        raise ValueError("--symbols must contain at least one symbol")
    output = Path(args.output_dir)
    manifest: dict[str, object] = {
        "source": "tongdaxin-local-file",
        "sourceMode": "READ_ONLY_LOCAL",
        "frequency": "5m",
        "tdxDir": str(tdx_dir),
        "startDate": args.start_date,
        "endDate": args.end_date,
        "selectedCodes": symbols,
        "status": "RUNNING",
        "artifacts": {},
        "rows": 0,
    }
    reader = Reader.factory(tdxdir=str(tdx_dir))
    for symbol in symbols:
        source_path = reader.find_path(symbol, subdir="fzline", suffix=["lc5", "5"])
        if source_path is None:
            raise FileNotFoundError(f"no .lc5 or .5 file for {symbol} below {tdx_dir}")
        frame = reader.minute(symbol=symbol, suffix=5)
        if frame is None:
            raise ValueError(f"could not parse {source_path}")
        if args.start_date:
            frame = frame[frame.index >= args.start_date]
        if args.end_date:
            frame = frame[frame.index <= f"{args.end_date} 23:59:59"]
        rows = normalize(symbol, frame)
        target = output / "minute-5" / f"{symbol}.csv"
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(FIELDS.split(","))
            writer.writerows(rows)
        manifest["artifacts"][symbol] = {  # type: ignore[index]
            "path": str(target.relative_to(output)),
            "rows": len(rows),
            "sha256": digest(target),
            "sourceFile": str(source_path),
            "sourceSha256": digest(Path(source_path)),
            "quality": "PASS",
        }
    manifest["rows"] = sum(item["rows"] for item in manifest["artifacts"].values())  # type: ignore[index, union-attr]
    manifest["status"] = "COMPLETED"
    manifest["completedAt"] = datetime.now().astimezone().isoformat()
    atomic_json(output / "manifest.json", manifest)
    return manifest


if __name__ == "__main__":
    try:
        result = run()
    except Exception as exc:  # noqa: BLE001  # pragma: no cover - CLI boundary
        result = {"status": "FAIL", "error": repr(exc)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result.get("status") in {"COMPLETED", "NOT_RUN"} else 1)
