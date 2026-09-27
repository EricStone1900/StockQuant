from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import time
from pathlib import Path

import pyarrow as pa
import pyarrow.csv as pacsv
import pyarrow.parquet as pq


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=Path("data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1"))
    args = parser.parse_args()
    root = args.dataset.resolve(strict=True)
    manifest_path = root / "manifest.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("source") != "baostock" or manifest.get("status") != "COMPLETED" or manifest.get("frequency") != "5m":
        raise ValueError("source manifest must be a completed BaoStock 5m archive")
    codes = manifest.get("selectedCodes")
    artifacts = manifest.get("artifacts")
    if not isinstance(codes, list) or len(codes) != 500 or not isinstance(artifacts, dict):
        raise ValueError("benchmark requires the frozen 500-security archive")

    columns = ["date", "time", "code", "open", "high", "low", "close", "volume", "amount"]
    schema = pa.schema([(name, pa.string()) for name in columns])
    tables = []
    source_files_verified = 0
    source_bytes = 0
    fingerprint = hashlib.sha256()
    started = time.perf_counter()
    for code in codes:
        info = artifacts.get(code)
        if not isinstance(info, dict) or info.get("quality") != "PASS":
            raise ValueError(f"missing or non-PASS source manifest entry: {code}")
        relative = Path(info["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"unsafe source path: {code}")
        source = (root / relative).resolve(strict=True)
        if not source.is_relative_to(root) or not source.is_file():
            raise ValueError(f"source file is missing or not regular: {code}")
        raw = source.read_bytes()
        digest = sha256(raw)
        if digest != info.get("sha256") or ("bytes" in info and len(raw) != info.get("bytes")):
            raise ValueError(f"source file differs from frozen manifest: {code}")
        fingerprint.update(code.encode())
        fingerprint.update(bytes.fromhex(digest))
        source_bytes += len(raw)
        source_files_verified += 1
        table = pacsv.read_csv(source, convert_options=pacsv.ConvertOptions(column_types=schema))
        if table.column_names != columns or table.num_rows != info.get("rows") or table.num_rows != 2880:
            raise ValueError(f"CSV schema or 60-day row count mismatch: {code}")
        tables.append(table)
    combined = pa.concat_tables(tables)
    if combined.num_rows != manifest.get("rows") or combined.num_rows != 1_440_000:
        raise ValueError("combined row count differs from the frozen archive manifest")
    source_read_ms = round((time.perf_counter() - started) * 1000)

    results = []
    with tempfile.TemporaryDirectory(prefix="stockquant-baostock-parquet-") as temporary:
        directory = Path(temporary)
        for codec in ("NONE", "SNAPPY", "ZSTD"):
            output = directory / f"minute-{codec.lower()}.parquet"
            started = time.perf_counter()
            pq.write_table(combined, output, compression=None if codec == "NONE" else codec.lower(), row_group_size=65_536, use_dictionary=True)
            write_ms = round((time.perf_counter() - started) * 1000)
            started = time.perf_counter()
            restored = pq.read_table(output)
            readback_ms = round((time.perf_counter() - started) * 1000)
            if not restored.equals(combined):
                raise ValueError(f"Parquet round-trip mismatch: {codec}")
            results.append({"codec": codec, "bytes": output.stat().st_size, "sha256": sha256(output.read_bytes()), "writeMs": write_ms, "readbackMs": readback_ms, "rowGroups": pq.ParquetFile(output).metadata.num_row_groups, "roundTripExact": True})
    none_bytes = next(item["bytes"] for item in results if item["codec"] == "NONE")
    for item in results:
        item["csvToParquetRatio"] = round(source_bytes / item["bytes"], 3)
        item["ratioVsUncompressedParquet"] = round(none_bytes / item["bytes"], 3)
    print(json.dumps({"source": manifest["source"], "sourceMode": manifest.get("sourceMode"), "manifestSha256": sha256(manifest_bytes), "datasetFingerprint": fingerprint.hexdigest(), "securityCount": len(codes), "rows": combined.num_rows, "sourceCsvBytes": source_bytes, "sourceReadMs": source_read_ms, "sourceFilesVerified": source_files_verified, "licenseEvidence": "No explicit license statement in frozen source manifest; license remains UNCONFIRMED; researchUseAllowed=false", "parquet": results}, indent=2))


if __name__ == "__main__":
    main()
