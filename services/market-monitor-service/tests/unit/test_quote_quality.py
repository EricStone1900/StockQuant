from __future__ import annotations

import unittest

from stockquant_market_monitor.domain.quote_quality import (
    QuoteObservation,
    evaluate_quote_quality,
)


def observation(
    security_id: str,
    *,
    freshness: str = "FRESH",
    status: str = "READY",
    age_seconds: int | None = 12,
) -> QuoteObservation:
    return QuoteObservation(
        security_id=security_id,
        snapshot_id=f"snapshot-{security_id}",
        source_id="fixture:v2.1-snapshot-sampling-1",
        data_mode="FIXTURE",
        observed_at="2026-10-16T01:50:00Z",
        available_at="2026-10-16T01:50:01Z",
        age_seconds=age_seconds,
        freshness=freshness,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
    )


class QuoteQualityTests(unittest.TestCase):
    def test_fresh_observations_produce_complete_quality_projection(self) -> None:
        result = evaluate_quote_quality(
            ["600000.SH", "000001.SZ"],
            [observation("600000.SH", age_seconds=12), observation("000001.SZ", age_seconds=20)],
        )

        self.assertEqual(result.status, "READY")
        self.assertEqual(result.coverage_ratio, 1.0)
        self.assertEqual(result.max_age_seconds, 20)
        self.assertEqual(result.anomalies, ())

    def test_stale_unknown_and_missing_quotes_never_count_as_ready(self) -> None:
        result = evaluate_quote_quality(
            ["600000.SH", "000001.SZ", "600519.SH", "000002.SZ"],
            [
                observation("600000.SH", freshness="STALE", status="STALE", age_seconds=1800),
                observation("000001.SZ", freshness="UNKNOWN", status="UNKNOWN", age_seconds=None),
                observation("600519.SH"),
            ],
        )

        self.assertEqual(result.status, "PARTIAL")
        self.assertEqual(result.fresh_count, 1)
        self.assertEqual(result.coverage_ratio, 0.25)
        self.assertEqual(
            [item.code for item in result.anomalies],
            ["QUOTE_STALE", "QUOTE_TIME_UNKNOWN", "QUOTE_MISSING"],
        )

    def test_empty_or_all_invalid_inputs_fail_closed(self) -> None:
        empty = evaluate_quote_quality([], [])
        unknown = evaluate_quote_quality(
            ["600000.SH"],
            [observation("600000.SH", freshness="UNKNOWN", status="UNKNOWN", age_seconds=None)],
        )

        self.assertEqual(empty.status, "UNAVAILABLE")
        self.assertEqual(empty.coverage_ratio, 0)
        self.assertEqual(unknown.status, "UNAVAILABLE")
        self.assertIsNone(unknown.max_age_seconds)

    def test_duplicate_expected_or_actual_observations_are_rejected(self) -> None:
        quote = observation("600000.SH")
        with self.assertRaisesRegex(ValueError, "unique"):
            evaluate_quote_quality(["600000.SH", "600000.SH"], [quote])
        with self.assertRaisesRegex(ValueError, "one observation"):
            evaluate_quote_quality(["600000.SH"], [quote, quote])

if __name__ == "__main__":
    unittest.main()
