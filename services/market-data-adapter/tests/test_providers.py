import json
import os
import unittest
import urllib.parse
from unittest.mock import patch

from market_data_adapter.cli import source_ids_from_request, wire_bar
from market_data_adapter.failover import NormalizedBar, SourceError
from market_data_adapter.providers import EastmoneyMinuteClient, BaoStockMinuteClient, _normalize_baostock_result, _validate_baostock_results, baostock_source_error, baostock_symbol, eastmoney_symbol, normalize_baostock, normalize_eastmoney, normalize_sina, SinaMinuteClient, sina_symbol


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

    def json(self):
        return json.loads(self.body.decode())

    def raise_for_status(self):
        return None


class ProviderTests(unittest.TestCase):
    def test_baostock_source_error_preserves_provider_error_code(self):
        failure = baostock_source_error({"error": "LOGIN_FAILED", "errorCode": "10002007", "message": "网络接收错误。"})
        self.assertEqual(failure.code, "10002007")
        self.assertIn("LOGIN_FAILED", str(failure))
        self.assertIn("网络接收错误", str(failure))

    def test_baostock_source_error_falls_back_to_category_when_code_missing(self):
        failure = baostock_source_error({"error": "ADAPTER_EXCEPTION", "message": "socket closed"})
        self.assertEqual(failure.code, "ADAPTER_EXCEPTION")

    def test_source_selection_rejects_explicit_empty_values(self):
        for value in ([], ""):
            with self.subTest(value=value), self.assertRaises(SourceError) as failure:
                source_ids_from_request({"sources": value})
            self.assertEqual(failure.exception.code, "INVALID_REQUEST")

    def test_source_selection_preserves_explicit_order_and_does_not_use_environment(self):
        with patch.dict(os.environ, {"STOCKQUANT_COLLECTION_SOURCES": "eastmoney"}):
            self.assertEqual(source_ids_from_request({"sources": ["sina", "baostock"]}), ["sina", "baostock"])

    def test_source_selection_uses_environment_only_when_request_omits_field(self):
        with patch.dict(os.environ, {"STOCKQUANT_COLLECTION_SOURCES": "eastmoney,sina"}):
            self.assertEqual(source_ids_from_request({}), ["eastmoney", "sina"])

    def test_source_selection_rejects_non_strings_unknown_and_duplicate_values(self):
        for value in (["sina", "sina"], ["unknown"], [1]):
            with self.subTest(value=value), self.assertRaises(SourceError) as failure:
                source_ids_from_request({"sources": value})
            self.assertEqual(failure.exception.code, "INVALID_REQUEST")

    def test_serializes_adapter_boundary_with_camel_case_field_names(self):
        payload = wire_bar(NormalizedBar("600000.SH", "2026-09-11T09:30:00+08:00", "2026-09-11T09:35:00+08:00", None, "10", "11", "9", "10", "100", "1000", "raw", "sina"))
        self.assertEqual(payload["securityId"], "600000.SH")
        self.assertEqual(payload["barStart"], "2026-09-11T09:30:00+08:00")
        self.assertEqual(payload["barEnd"], "2026-09-11T09:35:00+08:00")
        self.assertNotIn("bar_start", payload)

    def test_normalizes_baostock_and_sina_to_same_contract(self):
        baostock = normalize_baostock([["2026-09-11", "093500", "sh.600000", "10", "11", "9", "10", "100", "1000"]])
        sina = normalize_sina([{"day": "2026-09-11 09:35:00", "open": 10, "high": 11, "low": 9, "close": 10, "volume": 100, "amount": 1000}], "600000.SH")
        self.assertEqual(baostock[0].security_id, sina[0].security_id)
        self.assertEqual(baostock[0].bar_start, "2026-09-11T09:30:00+08:00")
        self.assertEqual(baostock[0].bar_end, "2026-09-11T09:35:00+08:00")
        self.assertEqual(sina[0].bar_start, "2026-09-11T09:30:00+08:00")
        self.assertEqual(baostock[0].bar_end, sina[0].bar_end)
        self.assertEqual(baostock[0].adjustment, "raw")

    def test_normalizes_current_baostock_timestamp_with_embedded_date(self):
        bars = normalize_baostock([["2024-01-02", "20240102093500000", "sh.600000", "10", "11", "9", "10", "100", "1000"]])
        self.assertEqual(bars[0].bar_start, "2024-01-02T09:30:00+08:00")
        self.assertEqual(bars[0].bar_end, "2024-01-02T09:35:00+08:00")

    def test_rejects_baostock_timestamp_with_mismatched_embedded_date(self):
        with self.assertRaises(SourceError) as failure:
            normalize_baostock([["2024-01-02", "20240103093500000", "sh.600000", "10", "11", "9", "10", "100", "1000"]])
        self.assertEqual(failure.exception.code, "SCHEMA_INVALID")

    def test_sina_client_parses_jsonp_and_preserves_amount(self):
        payload = [{"day": "2026-09-11 09:30:00", "open": "10", "high": "11", "low": "9", "close": "10", "volume": "100", "amount": "1000"}]
        client = SinaMinuteClient(opener=lambda request, timeout: Response("=(" + json.dumps(payload) + ");"))
        bars = client.fetch(["600000.SH"], "2026-09-11", "2026-09-11", 1)
        self.assertEqual(len(bars), 1)
        self.assertEqual(bars[0].amount, "1000")
        self.assertEqual(bars[0].source_id, "sina")

    def test_sina_client_limits_each_security(self):
        payload = [{"day": "2026-09-11 09:30:00", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1, "amount": 1}]
        waits = []
        client = SinaMinuteClient(opener=lambda request, timeout: Response("=(" + json.dumps(payload) + ");"), minimum_interval_seconds=1, sleeper=waits.append, clock=lambda: 0)
        client.fetch(["600000.SH", "000001.SZ"], "2026-09-11", "2026-09-11", 1)
        self.assertEqual(waits, [1])

    def test_normalizes_eastmoney_timestamp_and_converts_volume_lots_to_shares(self):
        bars = normalize_eastmoney(["2026-09-11 09:35,10,10.5,11,9,100,1000,0,0,0,0"], "600000.SH")
        self.assertEqual(bars[0].security_id, "600000.SH")
        self.assertEqual(bars[0].bar_start, "2026-09-11T09:30:00+08:00")
        self.assertEqual(bars[0].bar_end, "2026-09-11T09:35:00+08:00")
        self.assertEqual(bars[0].volume, "10000")
        self.assertEqual(bars[0].amount, "1000")
        self.assertEqual(bars[0].source_id, "eastmoney")

    def test_eastmoney_client_parses_public_kline_payload(self):
        payload = {"data": {"klines": ["2026-09-11 09:35,10,10.5,11,9,100,1000,0,0,0,0"]}}
        client = EastmoneyMinuteClient(requester=lambda url, params, headers, timeout: Response(json.dumps(payload)))
        bars = client.fetch(["600000.SH"], "2026-09-11", "2026-09-11", 1)
        self.assertEqual(len(bars), 1)
        self.assertEqual(bars[0].volume, "10000")
        self.assertEqual(bars[0].source_id, "eastmoney")

    def test_eastmoney_client_bounds_provider_request_to_requested_dates(self):
        payload = {"data": {"klines": ["2026-09-18 09:35,10,10.5,11,9,100,1000,0,0,0,0"]}}
        urls = []

        def requester(url, params, headers, timeout):
            urls.append(url)
            return Response(json.dumps(payload))

        client = EastmoneyMinuteClient(requester=requester)
        client.fetch(["600000.SH"], "2026-09-18", "2026-09-19", 1)
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(urls[0]).query)
        self.assertEqual(query["beg"], ["20260918"])
        self.assertEqual(query["end"], ["20260919"])
        self.assertNotEqual(query["beg"], ["0"])

    def test_eastmoney_connection_error_is_retryable(self):
        def requester(url, params, headers, timeout):
            raise ConnectionError("remote closed")

        with self.assertRaises(SourceError) as failure:
            EastmoneyMinuteClient(requester=requester).fetch(["600000.SH"], "2026-09-18", "2026-09-19", 1)
        self.assertEqual(failure.exception.code, "HTTP_CONNECTION_FAILED")
        self.assertTrue(failure.exception.retryable)

    def test_translates_public_symbols_for_each_provider(self):
        self.assertEqual(baostock_symbol("600000.SH"), "sh.600000")
        self.assertEqual(sina_symbol("000001.SZ"), "sz000001")
        self.assertEqual(eastmoney_symbol("600000.SH"), "1.600000")
        self.assertEqual(eastmoney_symbol("000001.SZ"), "0.000001")

    def test_baostock_uses_bounded_batches(self):
        client = BaoStockMinuteClient(batch_size=4)
        self.assertEqual(client.batch_size, 4)

    def test_baostock_rejects_missing_result_batch(self):
        with self.assertRaises(SourceError) as failure:
            _validate_baostock_results({"sh.600000": []}, ["sh.600000", "sz.000001"])
        self.assertEqual(failure.exception.code, "PAGINATION_INCOMPLETE")

    def test_baostock_rejects_malformed_or_mismatched_rows(self):
        row = ["2026-09-11", "093500", "sz.000001", "10", "11", "9", "10", "100", "1000"]
        with self.assertRaises(SourceError) as failure:
            _validate_baostock_results({"sh.600000": [row]}, ["sh.600000"])
        self.assertEqual(failure.exception.code, "SCHEMA_INVALID")

        with self.assertRaises(SourceError) as failure:
            _validate_baostock_results({"sh.600000": [["2026-09-11"]]}, ["sh.600000"])
        self.assertEqual(failure.exception.code, "SCHEMA_INVALID")

    def test_baostock_rejects_duplicate_bar_in_batch(self):
        row = ["2026-09-11", "093500", "sh.600000", "10", "11", "9", "10", "100", "1000"]
        with self.assertRaises(SourceError) as failure:
            _normalize_baostock_result("sh.600000", [row, row])
        self.assertEqual(failure.exception.code, "DUPLICATE_BAR")


if __name__ == "__main__":
    unittest.main()
