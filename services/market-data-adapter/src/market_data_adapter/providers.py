from __future__ import annotations

import json
import multiprocessing as mp
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from queue import Empty
from typing import Any, Sequence

from .failover import NormalizedBar, SourceError, RateLimiter

FIELDS = "date,time,code,open,high,low,close,volume,amount"


def _bar_window(endpoint: str) -> tuple[str, str]:
    """Convert provider end timestamps to the canonical half-open bar window.

    BaoStock and Sina expose the timestamp at the end of a 5-minute candle
    (for example, 09:35 represents 09:30–09:35).  The domain contract stores
    both boundaries explicitly, so normalize the endpoint before filtering.
    """
    end = datetime.fromisoformat(endpoint.replace("Z", "+00:00"))
    start = end - timedelta(minutes=5)
    return start.isoformat().replace("+00:00", "Z"), end.isoformat().replace("+00:00", "Z")


def normalize_baostock(rows: Sequence[Sequence[str]], source_id: str = "baostock") -> list[NormalizedBar]:
    result: list[NormalizedBar] = []
    for row in rows:
        if len(row) != 9:
            raise SourceError("SCHEMA_INVALID", "BaoStock row does not contain the required 9 fields", retryable=False)
        date, clock, code, open_, high, low, close, volume, amount = row
        endpoint = f"{date}T{clock[:2]}:{clock[2:4]}:{clock[4:6]}+08:00"
        start, end = _bar_window(endpoint)
        market, number = code.split(".", 1)
        result.append(NormalizedBar(f"{number}.{market.upper()}", start, end, None, open_, high, low, close, volume, amount, "raw", source_id))
    return result


def normalize_sina(items: Sequence[dict[str, Any]], security_id: str, source_id: str = "sina") -> list[NormalizedBar]:
    result: list[NormalizedBar] = []
    for item in items:
        required = ("day", "open", "high", "low", "close", "volume", "amount")
        if any(key not in item for key in required):
            raise SourceError("SCHEMA_INVALID", "Sina response misses a required OHLCV/amount field", retryable=False)
        endpoint = str(item["day"]).replace(" ", "T") + "+08:00"
        start, end = _bar_window(endpoint)
        result.append(NormalizedBar(security_id, start, end, None, str(item["open"]), str(item["high"]), str(item["low"]), str(item["close"]), str(item["volume"]), str(item["amount"]), "raw", source_id))
    return result


def eastmoney_symbol(security_id: str) -> str:
    """Convert the public 600000.SH form to Eastmoney's numeric secid."""
    number, market = security_id.upper().split(".", 1)
    if market not in {"SH", "SZ"} or not number.isdigit() or len(number) != 6:
        raise SourceError("SYMBOL_INVALID", f"unsupported A-share security id: {security_id}", retryable=False)
    return f"{1 if market == 'SH' else 0}.{number}"


def _eastmoney_volume(value: str) -> str:
    """Eastmoney stock K-lines report volume in lots; canonical bars use shares."""
    try:
        normalized = Decimal(value) * Decimal(100)
    except (InvalidOperation, ValueError) as error:
        raise SourceError("SCHEMA_INVALID", f"Eastmoney volume is not numeric: {value!r}", retryable=False) from error
    return format(normalized, "f")


def normalize_eastmoney(items: Sequence[str], security_id: str, source_id: str = "eastmoney") -> list[NormalizedBar]:
    """Normalize Eastmoney kline strings: time, OHLC, volume(lots), amount, ..."""
    result: list[NormalizedBar] = []
    for item in items:
        fields = item.split(",")
        if len(fields) < 7:
            raise SourceError("SCHEMA_INVALID", "Eastmoney row misses OHLCV/amount fields", retryable=False)
        timestamp, opening, close, high, low, volume, amount = fields[:7]
        try:
            endpoint = datetime.fromisoformat(timestamp.replace(" ", "T")).replace(tzinfo=None).isoformat() + "+08:00"
        except ValueError as error:
            raise SourceError("SCHEMA_INVALID", f"Eastmoney timestamp is invalid: {timestamp!r}", retryable=False) from error
        start, end = _bar_window(endpoint)
        result.append(NormalizedBar(security_id, start, end, None, opening, high, low, close, _eastmoney_volume(volume), amount, "raw", source_id))
    return result


def baostock_symbol(security_id: str) -> str:
    """Convert the public 600000.SH form to BaoStock's sh.600000 form."""
    number, market = security_id.upper().split(".", 1)
    if market not in {"SH", "SZ"} or not number.isdigit() or len(number) != 6:
        raise SourceError("SYMBOL_INVALID", f"unsupported A-share security id: {security_id}", retryable=False)
    return f"{market.lower()}.{number}"


def sina_symbol(security_id: str) -> str:
    """Convert the public 600000.SH form to Sina's sh600000 form."""
    number, market = security_id.upper().split(".", 1)
    if market not in {"SH", "SZ"} or not number.isdigit() or len(number) != 6:
        raise SourceError("SYMBOL_INVALID", f"unsupported A-share security id: {security_id}", retryable=False)
    return f"{market.lower()}{number}"


def filter_range(bars: Sequence[NormalizedBar], start: str, end: str) -> list[NormalizedBar]:
    """Providers may return a rolling window; retain only the requested local dates."""
    return [bar for bar in bars if start <= bar.bar_start[:10] <= end]


def _baostock_child(codes: Sequence[str], start: str, end: str, output: Any) -> None:
    try:
        import baostock as bs  # type: ignore[import-not-found]
        login = bs.login()
        if login.error_code != "0":
            output.put({"error": "LOGIN_FAILED", "errorCode": login.error_code, "message": login.error_msg})
            return
        try:
            results: dict[str, Any] = {}
            for code in codes:
                query = bs.query_history_k_data_plus(code, FIELDS, start_date=start, end_date=end, frequency="5", adjustflag="3")
                rows: list[list[str]] = []
                while query.next():
                    rows.append(query.get_row_data())
                if query.error_code != "0":
                    output.put({"error": "QUERY_FAILED", "code": code, "errorCode": query.error_code, "message": query.error_msg})
                    return
                results[code] = rows
            output.put({"results": results})
        finally:
            bs.logout()
    except Exception as error:  # noqa: BLE001
        output.put({"error": "ADAPTER_EXCEPTION", "message": repr(error)})


def baostock_source_error(response: dict[str, Any]) -> SourceError:
    """Convert a child response while retaining BaoStock's original error code."""
    code = str(response.get("errorCode") or response.get("error") or "BAOSTOCK_UNKNOWN")
    category = str(response.get("error") or "BAOSTOCK_ERROR")
    message = str(response.get("message") or "BaoStock query failed")
    return SourceError(code, f"{category}: {message}")


class BaoStockMinuteClient:
    def __init__(self, minimum_interval_seconds: float = 0.0, sleeper=None, clock=None, batch_size: int = 5) -> None:
        import time
        self.limiter = RateLimiter(minimum_interval_seconds, clock=clock or time.monotonic, sleeper=sleeper or time.sleep)
        self.batch_size = max(1, int(batch_size))

    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        context = mp.get_context("spawn")
        bars: list[NormalizedBar] = []
        for offset in range(0, len(security_ids), self.batch_size):
            batch = list(security_ids[offset : offset + self.batch_size])
            self.limiter.wait()
            queue = context.Queue()
            process = context.Process(target=_baostock_child, args=([baostock_symbol(item) for item in batch], start, end, queue))
            process.start()
            try:
                response = queue.get(timeout=timeout_seconds)
            except Empty:
                process.terminate()
                process.join(5)
                raise SourceError("TIMEOUT", f"BaoStock query timed out for batch {','.join(batch)}")
            finally:
                if process.is_alive():
                    process.terminate()
                    process.join(5)
                queue.close()
            if response.get("error"):
                raise baostock_source_error(response)
            for rows in response.get("results", {}).values():
                bars.extend(normalize_baostock(rows))
        return filter_range(bars, start, end)


class SinaMinuteClient:
    def __init__(self, opener=urllib.request.urlopen, minimum_interval_seconds: float = 0.0, sleeper=None, clock=None) -> None:
        import time
        self.opener = opener
        self.limiter = RateLimiter(minimum_interval_seconds, clock=clock or time.monotonic, sleeper=sleeper or time.sleep)

    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        bars: list[NormalizedBar] = []
        for security_id in security_ids:
            self.limiter.wait()
            symbol = sina_symbol(security_id)
            url = "https://quotes.sina.cn/cn/api/jsonp_v2.php/=/CN_MarketDataService.getKLineData?" + urllib.parse.urlencode({"symbol": symbol, "scale": 5, "datalen": 1970})
            try:
                request = urllib.request.Request(url, headers={"User-Agent": "StockQuant-DC04/1.0"})
                with self.opener(request, timeout=timeout_seconds) as response:
                    body = response.read().decode("utf-8")
                payload = body.split("=(", 1)[1].rsplit(");", 1)[0] if "=(" in body else body
                bars.extend(filter_range(normalize_sina(json.loads(payload), security_id), start, end))
            except SourceError:
                raise
            except Exception as error:  # noqa: BLE001
                raise SourceError("HTTP_OR_PARSE_FAILED", repr(error)) from error
        return bars


class EastmoneyMinuteClient:
    """Read-only Eastmoney 5-minute klines through its public JSON endpoint."""

    def __init__(self, requester=None, minimum_interval_seconds: float = 0.0, sleeper=None, clock=None) -> None:
        import time
        if requester is None:
            import requests
            requester = requests.get
        self.requester = requester
        self.limiter = RateLimiter(minimum_interval_seconds, clock=clock or time.monotonic, sleeper=sleeper or time.sleep)

    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        bars: list[NormalizedBar] = []
        try:
            beg = date.fromisoformat(start).strftime("%Y%m%d")
            finish = date.fromisoformat(end).strftime("%Y%m%d")
        except ValueError as error:
            raise SourceError("INVALID_DATE_RANGE", f"Eastmoney dates must be ISO dates: {start!r}, {end!r}", retryable=False) from error
        if finish < beg:
            raise SourceError("INVALID_DATE_RANGE", f"Eastmoney end date precedes start date: {start!r}, {end!r}", retryable=False)
        for security_id in security_ids:
            self.limiter.wait()
            params = {
                "fields1": "f1,f2,f3,f4,f5,f6",
                "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
                "ut": "7eea3edcaed734bea9cbfc24409ed989",
                "klt": "5",
                "fqt": "0",
                "secid": eastmoney_symbol(security_id),
                # Bound the provider query to the requested window.  The API
                # closes connections for the unbounded 0..20500000 range.
                "beg": beg,
                "end": finish,
            }
            url = "https://push2his.eastmoney.com/api/qt/stock/kline/get?" + urllib.parse.urlencode(params)
            try:
                response = self.requester(url, params=None, headers={"User-Agent": "StockQuant-DC04/1.0", "Referer": "https://quote.eastmoney.com/"}, timeout=timeout_seconds)
                response.raise_for_status()
                payload = response.json()
                rows = ((payload.get("data") or {}).get("klines") or [])
                if not rows:
                    raise SourceError("EMPTY_RESULT", f"Eastmoney returned no bars for {security_id}")
                bars.extend(filter_range(normalize_eastmoney(rows, security_id), start, end))
            except SourceError:
                raise
            except Exception as error:
                # Eastmoney intermittently closes the connection (especially
                # under rate limiting).  Preserve this as a retryable network
                # failure so FailoverCollector applies backoff instead of
                # recording a generic adapter defect.
                error_name = type(error).__name__
                if error_name in {"ConnectionError", "ConnectTimeout", "ReadTimeout", "Timeout"} or isinstance(error, (TimeoutError, OSError)):
                    raise SourceError("HTTP_CONNECTION_FAILED", repr(error)) from error
                raise SourceError("HTTP_OR_PARSE_FAILED", repr(error)) from error
        return bars
