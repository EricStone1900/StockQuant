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
