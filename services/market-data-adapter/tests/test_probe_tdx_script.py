import importlib.util
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[2].parent / "scripts" / "probe-tdx-minute-capability.py"
SPEC = importlib.util.spec_from_file_location("probe_tdx_minute_capability", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_partial_probe_is_incomplete_exit_code():
    assert MODULE.exit_code_for_status("PARTIAL") == 2
    assert MODULE.exit_code_for_status("NOT_RUN") == 2


def test_probe_timeout_scales_with_sequential_security_requests():
    assert MODULE.subprocess_timeout_seconds(20, 10) == 229


def test_probe_status_exit_codes_preserve_pass_and_fail():
    assert MODULE.exit_code_for_status("PASS") == 0
    assert MODULE.exit_code_for_status("FAIL") == 1


def test_integrity_requires_full_window_for_each_security():
    expected = MODULE.expected_bar_ends("2026-09-24", "2026-09-24", "full")
    assert len(expected) == 48
    rows = [{"securityId": "600000.SH", "barEnd": value} for value in sorted(expected)]
    result = MODULE.validate_bars(rows, ["600000.SH"], "2026-09-24", "2026-09-24", "full")
    assert result["status"] == "PASS"


def test_integrity_reports_missing_duplicate_and_unexpected_bars():
    rows = [
        {"securityId": "600000.SH", "barEnd": "2026-09-24T09:35:00+08:00"},
        {"securityId": "600000.SH", "barEnd": "2026-09-24T09:35:00+08:00"},
        {"securityId": "600000.SH", "barEnd": "2026-09-24T12:00:00+08:00"},
    ]
    result = MODULE.validate_bars(rows, ["600000.SH"], "2026-09-24", "2026-09-24", "morning")
    assert result["status"] == "PARTIAL"
    assert result["duplicates"]
    assert result["unexpected"]
    assert result["missing"]
