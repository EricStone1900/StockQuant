import json
import unittest

from market_data_adapter.providers import baostock_symbol, normalize_baostock, normalize_sina, SinaMinuteClient, sina_symbol


class Response:
    status = 200

    def __init__(self, body):
        self.body = body.encode()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.body


class ProviderTests(unittest.TestCase):
    def test_normalizes_baostock_and_sina_to_same_contract(self):
        baostock = normalize_baostock([["2026-09-11", "093500", "sh.600000", "10", "11", "9", "10", "100", "1000"]])
        sina = normalize_sina([{"day": "2026-09-11 09:35:00", "open": 10, "high": 11, "low": 9, "close": 10, "volume": 100, "amount": 1000}], "600000.SH")
        self.assertEqual(baostock[0].security_id, sina[0].security_id)
        self.assertEqual(baostock[0].bar_start, "2026-09-11T09:30:00+08:00")
        self.assertEqual(baostock[0].bar_end, "2026-09-11T09:35:00+08:00")
        self.assertEqual(sina[0].bar_start, "2026-09-11T09:30:00+08:00")
        self.assertEqual(baostock[0].bar_end, sina[0].bar_end)
        self.assertEqual(baostock[0].adjustment, "raw")

    def test_sina_client_parses_jsonp_and_preserves_amount(self):
        payload = [{"day": "2026-09-11 09:30:00", "open": "10", "high": "11", "low": "9", "close": "10", "volume": "100", "amount": "1000"}]
        client = SinaMinuteClient(opener=lambda request, timeout: Response("=(" + json.dumps(payload) + ");"))
        bars = client.fetch(["600000.SH"], "2026-09-11", "2026-09-11", 1)
        self.assertEqual(len(bars), 1)
        self.assertEqual(bars[0].amount, "1000")
        self.assertEqual(bars[0].source_id, "sina")

    def test_translates_public_symbols_for_each_provider(self):
        self.assertEqual(baostock_symbol("600000.SH"), "sh.600000")
        self.assertEqual(sina_symbol("000001.SZ"), "sz000001")


if __name__ == "__main__":
    unittest.main()
