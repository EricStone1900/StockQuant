import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "fixtures" / "v3" / "v3.2-independent-validation-v1"
SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "v32-independent-fixture-crosscheck.py"
SPEC = importlib.util.spec_from_file_location("v32_fixture_crosscheck", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class V32FixtureCrosscheckTests(unittest.TestCase):
    def test_recomputes_frozen_trade_sequence_and_metrics(self):
        result = MODULE.recompute(FIXTURE)
        self.assertEqual(result["decisionsChecked"], 70)
        self.assertEqual(result["ordersSubmitted"], 2)
        self.assertEqual([trade["side"] for trade in result["trades"]], ["BUY", "BUY"])
        self.assertAlmostEqual(result["grossReturn"], 0.003545)
        self.assertAlmostEqual(result["netReturn"], 0.003503395)
        self.assertAlmostEqual(result["totalFees"], 4.1605)
        self.assertEqual(result["pitViolations"], [])
        self.assertEqual(result["capacityViolations"], [])

    def test_rejects_non_positive_volume(self):
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "fixture"
            shutil.copytree(FIXTURE, copied)
            rows = (copied / "daily-bars.csv").read_text(encoding="utf-8").splitlines()
            cells = rows[1].split(",")
            cells[-1] = "0"
            rows[1] = ",".join(cells)
            (copied / "daily-bars.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid OHLCV"):
                MODULE.recompute(copied)

    def test_rejects_ohlc_inconsistency(self):
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "fixture"
            shutil.copytree(FIXTURE, copied)
            rows = (copied / "daily-bars.csv").read_text(encoding="utf-8").splitlines()
            cells = rows[1].split(",")
            cells[4] = "1"  # high below the positive open
            rows[1] = ",".join(cells)
            (copied / "daily-bars.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "inconsistent OHLC"):
                MODULE.recompute(copied)


if __name__ == "__main__":
    unittest.main()
