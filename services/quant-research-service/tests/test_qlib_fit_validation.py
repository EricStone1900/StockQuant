import importlib.util
import math
import unittest
from pathlib import Path


WORKER = Path(__file__).resolve().parents[1] / "qlib-worker.py"
SPEC = importlib.util.spec_from_file_location("stockquant_qlib_worker_fit", WORKER)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def payload():
    return {
        "schemaVersion": "qlib-fit-fixture-v1",
        "sourceMode": "FIXTURE",
        "featureRows": [[float(index), float(index % 7)] for index in range(120)],
        "labels": [math.sin(index / 8) for index in range(120)],
        "splits": {"train": [0, 72], "valid": [72, 96], "test": [96, 120]},
    }


class QlibFitFixtureInputTests(unittest.TestCase):
    def test_accepts_a_complete_contiguous_train_valid_test_fixture(self):
        features, labels, ranges = MODULE.parse_fit_fixture(payload())
        self.assertEqual((len(features), len(labels), ranges), (120, 120, [(0, 72), (72, 96), (96, 120)]))

    def test_rejects_non_fixture_modes_unknown_fields_and_source_code(self):
        candidate = payload()
        candidate["sourceMode"] = "REAL_CANDIDATE"
        with self.assertRaisesRegex(ValueError, "only the versioned FIXTURE"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["candidateSource"] = "RD_AGENT"
        with self.assertRaisesRegex(ValueError, "fields are invalid"):
            MODULE.parse_fit_fixture(candidate)

    def test_rejects_future_leaking_or_incomplete_splits(self):
        candidate = payload()
        candidate["splits"] = {"train": [0, 72], "valid": [70, 96], "test": [96, 120]}
        with self.assertRaisesRegex(ValueError, "contiguous, ordered"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["splits"]["test"] = [96, 119]
        with self.assertRaisesRegex(ValueError, "cover all rows"):
            MODULE.parse_fit_fixture(candidate)

    def test_rejects_unbounded_or_non_finite_data(self):
        candidate = payload()
        candidate["featureRows"][0][0] = float("nan")
        with self.assertRaisesRegex(ValueError, "non-finite"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["labels"][0] = float("inf")
        with self.assertRaisesRegex(ValueError, "finite numbers"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["featureRows"] = candidate["featureRows"][:29]
        candidate["labels"] = candidate["labels"][:29]
        with self.assertRaisesRegex(ValueError, "between 30 and 10000"):
            MODULE.parse_fit_fixture(candidate)


if __name__ == "__main__":
    unittest.main()
