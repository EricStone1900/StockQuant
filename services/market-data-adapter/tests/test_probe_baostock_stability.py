import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "probe-baostock-stability.py"
SPEC = importlib.util.spec_from_file_location("probe_baostock_stability", SCRIPT)
assert SPEC and SPEC.loader
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class FakePagedQuery:
    def __init__(self, pages):
        self.pages = pages
        self.page = 0
        self.row = 0
        self.next_calls = 0
        self.rows_read = []

    def next(self):
        self.next_calls += 1
        if self.next_calls > 10:
            raise AssertionError("query cursor was not advanced with get_row_data")
        if self.row < len(self.pages[self.page]):
            return True
        if self.page + 1 < len(self.pages):
            self.page += 1
            self.row = 0
            return True
        return False

    def get_row_data(self):
        value = self.pages[self.page][self.row]
        self.row += 1
        self.rows_read.append(value)
        return value


class StabilityProbeTests(unittest.TestCase):
    def test_consume_query_rows_advances_across_pages(self):
        query = FakePagedQuery([["first", "second"], ["third"]])
        self.assertEqual(probe.consume_query_rows(query), 3)
        self.assertEqual(query.rows_read, ["first", "second", "third"])


if __name__ == "__main__":
    unittest.main()
