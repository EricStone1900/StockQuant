import unittest

from market_data_adapter.failover import AllSourcesFailed, FailoverCollector, NormalizedBar, SourceError


def bar(source: str) -> NormalizedBar:
    return NormalizedBar("600000.SH", "2026-09-11T01:30:00Z", "2026-09-11T01:35:00Z", None, "10", "11", "9", "10", "100", "1000", "raw", source)


class FakeSource:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    def fetch(self, security_ids, start, end, timeout_seconds):
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class FailoverTests(unittest.TestCase):
    def test_primary_failure_switches_to_backup_and_records_audit(self):
        primary = FakeSource([SourceError("TIMEOUT", "slow"), SourceError("TIMEOUT", "slow"), SourceError("TIMEOUT", "slow")])
        backup = FakeSource([[bar("sina")]])
        collector = FailoverCollector([("baostock", primary), ("sina", backup)], max_attempts=3, backoff_seconds=0, sleeper=lambda _: None)
        source, bars, attempts = collector.collect(["600000.SH"], "2026-09-11", "2026-09-11")
        self.assertEqual(source, "sina")
        self.assertEqual(len(bars), 1)
        self.assertEqual(primary.calls, 3)
        self.assertEqual(attempts[-1]["sourceId"], "sina")

    def test_circuit_opens_after_three_failures_and_half_open_recovers(self):
        clock = [0.0]
        primary = FakeSource([SourceError("TIMEOUT", "slow")] * 3 + [[bar("baostock")]])
        backup = FakeSource([SourceError("TIMEOUT", "backup")] * 3)
        collector = FailoverCollector([("baostock", primary), ("sina", backup)], max_attempts=1, backoff_seconds=0, sleeper=lambda _: None, clock=lambda: clock[0])
        for _ in range(3):
            with self.assertRaises(AllSourcesFailed):
                collector.collect(["600000.SH"], "2026-09-11", "2026-09-11")
        clock[0] = 301.0
        source, _, _ = collector.collect(["600000.SH"], "2026-09-11", "2026-09-11")
        self.assertEqual(source, "baostock")

    def test_empty_or_mismatched_bars_are_not_accepted(self):
        primary = FakeSource([[]])
        backup = FakeSource([[bar("wrong-source")]])
        collector = FailoverCollector([("baostock", primary), ("sina", backup)], max_attempts=1, backoff_seconds=0, sleeper=lambda _: None)
        with self.assertRaises(AllSourcesFailed) as failure:
            collector.collect(["600000.SH"], "2026-09-11", "2026-09-11")
        self.assertEqual([item["code"] for item in failure.exception.attempts], ["EMPTY_RESULT", "SOURCE_MISMATCH"])


if __name__ == "__main__":
    unittest.main()
