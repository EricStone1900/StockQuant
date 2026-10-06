import importlib.util
import math
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


WORKER = Path(__file__).resolve().parents[1] / "qlib-worker.py"
SPEC = importlib.util.spec_from_file_location("stockquant_qlib_worker_fit", WORKER)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def payload():
    origin = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return {
        "schemaVersion": "qlib-fit-fixture-v1",
        "sourceMode": "FIXTURE",
        "featureRows": [[float(index), float(index % 7)] for index in range(120)],
        "labels": [math.sin(index / 8) for index in range(120)],
        "splits": {"train": [0, 72], "valid": [72, 96], "test": [96, 120]},
        "temporalMetadata": [
            {
                "decisionAt": (origin + timedelta(hours=index)).isoformat().replace("+00:00", "Z"),
                "featureAvailableAt": (origin + timedelta(hours=index, minutes=-1)).isoformat().replace("+00:00", "Z"),
                "labelAvailableAt": (origin + timedelta(hours=index, minutes=30)).isoformat().replace("+00:00", "Z"),
            }
            for index in range(120)
        ],
    }


class QlibFitFixtureInputTests(unittest.TestCase):
    def test_accepts_a_complete_contiguous_train_valid_test_fixture(self):
        features, labels, ranges = MODULE.parse_fit_fixture(payload())
        self.assertEqual((len(features), len(labels), ranges), (120, 120, [(0, 72), (72, 96), (96, 120)]))

    def test_missing_temporal_metadata_stays_explicitly_not_run(self):
        candidate = payload()
        candidate.pop("temporalMetadata")
        _, _, ranges = MODULE.parse_fit_fixture(candidate)
        self.assertEqual(MODULE.validate_temporal_metadata(candidate.get("temporalMetadata"), ranges), "NOT_RUN")

        candidate["temporalMetadata"] = []
        with self.assertRaisesRegex(ValueError, "must contain one row per sample"):
            MODULE.parse_fit_fixture(candidate)

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

    def test_temporal_metadata_checks_feature_cutoff_label_availability_and_order(self):
        candidate = payload()
        self.assertEqual(MODULE.validate_temporal_metadata(candidate["temporalMetadata"], [(0, 72), (72, 96), (96, 120)]), "PASS")
        candidate["temporalMetadata"][0]["featureAvailableAt"] = candidate["temporalMetadata"][0]["decisionAt"] + ""
        candidate["temporalMetadata"][0]["featureAvailableAt"] = "2026-01-01T00:01:00Z"
        with self.assertRaisesRegex(ValueError, "not available at decision"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["temporalMetadata"][71]["labelAvailableAt"] = "2026-01-04T00:00:00Z"
        with self.assertRaisesRegex(ValueError, "not strictly available before the next split"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["temporalMetadata"][71]["labelAvailableAt"] = "2026-01-04T01:00:00Z"
        with self.assertRaisesRegex(ValueError, "not strictly available before the next split"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["temporalMetadata"][12]["decisionAt"] = candidate["temporalMetadata"][11]["decisionAt"]
        candidate["temporalMetadata"][12]["featureAvailableAt"] = candidate["temporalMetadata"][11]["featureAvailableAt"]
        with self.assertRaisesRegex(ValueError, "strictly increasing"):
            MODULE.parse_fit_fixture(candidate)
        candidate = payload()
        candidate["temporalMetadata"][0]["decisionAt"] = "2026-01-01T00:00:00"
        with self.assertRaisesRegex(ValueError, "explicit UTC offset"):
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
