"""The diagnostic must preserve, not repair, raw TDX boundary timestamps."""

import importlib.util
import struct
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "diagnose-tdx-lunch-boundary.py"
SPEC = importlib.util.spec_from_file_location("diagnose_tdx_lunch_boundary", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_extract_boundary_records_keeps_raw_1300_label_and_quantity():
    header = bytearray(33)
    struct.pack_into("<HBHI", header, 24, 0, 0, 2, 0)
    normal = struct.pack("<II7f", 20260930, 41100, 10, 11, 9, 10, 1000, 100, 0)
    abnormal = struct.pack("<II7f", 20260930, 46800, 10, 12, 9, 11, 2200, 200, 0)

    report = MODULE.extract_boundary_records(bytes(header) + normal + abnormal)

    assert report["dayLabels"] == ["11:25", "13:00"]
    assert report["boundaryRecords"][1]["timeNum"] == 46800
    assert report["boundaryRecords"][1]["label"] == "13:00"
    assert report["boundaryRecords"][1]["volume"] == 200
    assert report["boundaryRecords"][1]["rawRecordHex"] == abnormal.hex()
