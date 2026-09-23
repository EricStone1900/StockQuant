from __future__ import annotations

import json
import multiprocessing as mp
import sys
import urllib.parse
import urllib.request
from contextlib import nullcontext, redirect_stdout
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from queue import Empty
from collections.abc import Mapping
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


def _baostock_endpoint(date_value: str, clock: str) -> str:
    """Normalize BaoStock's legacy and current intraday time fields."""
    normalized_date = date_value.replace("-", "")
    normalized_clock = str(clock).strip()
    if len(normalized_clock) == 17 and normalized_clock.isdigit():
        if normalized_clock[:8] != normalized_date:
            raise SourceError("SCHEMA_INVALID", "BaoStock time field date does not match its date field", retryable=False)
        normalized_clock = normalized_clock[8:14]
    elif len(normalized_clock) >= 6 and normalized_clock[:6].isdigit():
        normalized_clock = normalized_clock[:6]
    else:
        raise SourceError("SCHEMA_INVALID", "BaoStock time field is not HHMMSS or YYYYMMDDHHMMSSmmm", retryable=False)
    return f"{date_value}T{normalized_clock[:2]}:{normalized_clock[2:4]}:{normalized_clock[4:6]}+08:00"


def normalize_baostock(rows: Sequence[Sequence[str]], source_id: str = "baostock") -> list[NormalizedBar]:
    result: list[NormalizedBar] = []
    for row in rows:
        if len(row) != 9:
            raise SourceError("SCHEMA_INVALID", "BaoStock row does not contain the required 9 fields", retryable=False)
        date, clock, code, open_, high, low, close, volume, amount = row
        endpoint = _baostock_endpoint(date, clock)
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


def tdx_symbol(security_id: str) -> tuple[str, str]:
    """Convert the canonical security id to the TDX market/code pair."""
    number, market = security_id.upper().split(".", 1)
    if market not in {"SH", "SZ", "BJ"} or not number.isdigit() or len(number) != 6:
        raise SourceError("SYMBOL_INVALID", f"unsupported A-share security id: {security_id}", retryable=False)
    return market, number


def _tdx_timestamp(value: Any, row: Mapping[str, Any]) -> datetime:
    candidate = value
    if candidate is None:
        candidate = row.get("date")
        clock = row.get("time") or row.get("minute")
        if clock is not None:
            candidate = f"{candidate} {clock}"
    if isinstance(candidate, datetime):
        parsed = candidate
    else:
        text = str(candidate).strip().replace("/", "-")
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone(timedelta(hours=8)))
    return parsed


def _tdx_records(items: Any) -> list[Mapping[str, Any]]:
    if hasattr(items, "to_dict"):
        items = items.to_dict(orient="records")
    if not isinstance(items, (list, tuple)):
        raise SourceError("SCHEMA_INVALID", "TDX response is not a row collection", retryable=False)
    if not all(isinstance(item, Mapping) for item in items):
        raise SourceError("SCHEMA_INVALID", "TDX response rows are not mappings", retryable=False)
    return list(items)


def normalize_tdx(items: Any, security_id: str, source_id: str = "tdx", bar_time: str = "end") -> list[NormalizedBar]:
    """Normalize easy-tdx rows into the existing half-open minute contract."""
    result: list[NormalizedBar] = []
    for row in _tdx_records(items):
        timestamp = _tdx_timestamp(row.get("datetime") or row.get("date_time") or row.get("time"), row)
        if bar_time == "end":
            start = timestamp - timedelta(minutes=5)
            end = timestamp
        elif bar_time == "start":
            start = timestamp
            end = timestamp + timedelta(minutes=5)
        else:
            raise SourceError("SCHEMA_INVALID", f"unsupported TDX bar time mode: {bar_time}", retryable=False)
        def required(name: str, *aliases: str) -> str:
            for key in (name, *aliases):
                value = row.get(key)
                if value is not None:
                    return str(value)
            raise SourceError("SCHEMA_INVALID", f"TDX row misses {name}", retryable=False)
        amount = row.get("amount")
        result.append(NormalizedBar(
            security_id,
            start.isoformat(),
            end.isoformat(),
            None,
            required("open"),
            required("high"),
            required("low"),
            required("close"),
            required("vol", "volume"),
            None if amount is None else str(amount),
            "raw",
            source_id,
        ))
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


def _validate_baostock_results(results: Any, codes: Sequence[str]) -> None:
    """Reject missing batches or malformed rows before they look successful."""
    if not isinstance(results, dict):
        raise SourceError("PAGINATION_INVALID", "BaoStock response did not contain a result map", retryable=False)
    expected = set(codes)
    actual = set(results)
    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)
    if missing or unexpected:
        details = []
        if missing:
            details.append(f"missing={','.join(missing)}")
        if unexpected:
            details.append(f"unexpected={','.join(unexpected)}")
        raise SourceError("PAGINATION_INCOMPLETE", f"BaoStock result batches are incomplete ({'; '.join(details)})", retryable=False)
    for code in codes:
        rows = results[code]
        if not isinstance(rows, list):
            raise SourceError("PAGINATION_INVALID", f"BaoStock result batch is not a row list for {code}", retryable=False)
        for row in rows:
            if not isinstance(row, (list, tuple)) or len(row) != len(FIELDS.split(",")):
                raise SourceError("SCHEMA_INVALID", f"BaoStock row is malformed for {code}", retryable=False)
            if str(row[2]).lower() != code.lower():
                raise SourceError("SCHEMA_INVALID", f"BaoStock row code does not match batch {code}", retryable=False)


def _normalize_baostock_result(code: str, rows: Sequence[Sequence[str]]) -> list[NormalizedBar]:
    _validate_baostock_results({code: list(rows)}, [code])
    try:
        normalized = normalize_baostock(rows)
    except SourceError:
        raise
    except (IndexError, TypeError, ValueError) as error:
        raise SourceError("SCHEMA_INVALID", f"BaoStock response could not be normalized for {code}: {error}", retryable=False) from error
    seen: set[tuple[str, str]] = set()
    for bar in normalized:
        key = (bar.security_id, bar.bar_end)
        if key in seen:
            raise SourceError("DUPLICATE_BAR", f"BaoStock returned a duplicate bar for {code} at {bar.bar_end}", retryable=False)
        seen.add(key)
    return normalized


def _baostock_child(codes: Sequence[str], start: str, end: str, output: Any) -> None:
    # BaoStock prints login/logout diagnostics. A spawned worker inherits the
    # CLI's stdout, which must contain exactly one JSON response for the TS
    # executor. Keep SDK diagnostics on stderr even when login fails.
    with redirect_stdout(sys.stderr):
        try:
            import baostock as bs  # type: ignore[import-not-found,import-untyped]
            login = bs.login()
            if login.error_code != "0":
                output.put({"error": "LOGIN_FAILED", "errorCode": login.error_code, "message": login.error_msg})
                return
            try:
                results: dict[str, Any] = {}
                for code in codes:
                    query = bs.query_history_k_data_plus(code, FIELDS, start_date=start, end_date=end, frequency="5", adjustflag="3")
                    rows: list[list[str]] = []
                    while True:
                        if not query.next():
                            break
                        row = query.get_row_data()
                        if not isinstance(row, (list, tuple)) or len(row) != len(FIELDS.split(",")):
                            output.put({"error": "PAGINATION_INVALID", "code": code, "message": "BaoStock returned a malformed row"})
                            return
                        rows.append([str(value) for value in row])
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
            provider_codes = [baostock_symbol(item) for item in batch]
            results = response.get("results")
            _validate_baostock_results(results, provider_codes)
            for code in provider_codes:
                bars.extend(_normalize_baostock_result(code, results[code]))
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


class TdxMinuteClient:
    """Read-only 5-minute bars through the optional easy-tdx client."""

    def __init__(self, client_factory=None, minimum_interval_seconds: float = 1.0, sleeper=None, clock=None, count: int = 800) -> None:
        import time
        self.client_factory = client_factory
        self.count = max(48, min(int(count), 800))
        self.limiter = RateLimiter(minimum_interval_seconds, clock=clock or time.monotonic, sleeper=sleeper or time.sleep)
        self.last_host: str | None = None
        self.last_latency_ms: float | None = None

    def _default_client_factory(self, timeout_seconds: float = 15.0):
        try:
            from easy_tdx import MacClient  # type: ignore[import-not-found]
        except ImportError as error:
            raise SourceError("DEPENDENCY_MISSING", "easy-tdx is not installed", retryable=False) from error
        return MacClient.from_best_host(timeout=timeout_seconds, ping_timeout=min(timeout_seconds, 3.0))

    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        try:
            start_date = date.fromisoformat(start)
            end_date = date.fromisoformat(end)
        except ValueError as error:
            raise SourceError("INVALID_DATE_RANGE", f"TDX dates must be ISO dates: {start!r}, {end!r}", retryable=False) from error
        if end_date < start_date:
            raise SourceError("INVALID_DATE_RANGE", f"TDX end date precedes start date: {start!r}, {end!r}", retryable=False)
        factory = self.client_factory or (lambda: self._default_client_factory(timeout_seconds))
        import time
        self.last_host = None
        self.last_latency_ms = None
        started = time.monotonic()
        client = factory()
        self.last_latency_ms = round((time.monotonic() - started) * 1000, 3)
        host = getattr(client, "_host", None)
        if host is not None:
            self.last_host = str(host)
        context = client if hasattr(client, "__enter__") else nullcontext(client)
        bars: list[NormalizedBar] = []
        try:
            with context as connection:
                for security_id in security_ids:
                    self.limiter.wait()
                    market, number = tdx_symbol(security_id)
                    try:
                        frame, bar_time = self._fetch_kline(connection, market, number, timeout_seconds)
                        normalized = normalize_tdx(frame, security_id, bar_time=bar_time)
                        filtered = filter_range(normalized, start, end)
                        if not filtered:
                            raise SourceError("EMPTY_RESULT", f"TDX returned no bars for {security_id}")
                        bars.extend(filtered)
                    except SourceError:
                        raise
                    except Exception as error:  # noqa: BLE001
                        error_name = type(error).__name__
                        if error_name in {"TimeoutError", "Timeout", "TdxConnectionError", "ConnectionError"} or isinstance(error, (TimeoutError, OSError)):
                            raise SourceError("TCP_CONNECTION_FAILED", repr(error)) from error
                        raise SourceError("TDX_PROTOCOL_ERROR", repr(error)) from error
        finally:
            close = getattr(client, "close", None)
            if callable(close) and not hasattr(client, "__exit__"):
                close()
        return bars

    def _fetch_kline(self, client: Any, market: str, number: str, timeout_seconds: float) -> tuple[Any, str]:
        # easy-tdx exposes both the newer MacClient API and the standard TDX
        # client. Keep the provider boundary tolerant while the exact package
        # version is frozen and verified in the environment.
        try:
            from easy_tdx import Market, Period  # type: ignore[import-not-found]
            market_value = getattr(Market, market)
            period = getattr(Period, "MIN_5")
        except ImportError as error:
            raise SourceError("DEPENDENCY_MISSING", "easy-tdx is not installed", retryable=False) from error
        if hasattr(client, "get_stock_kline"):
            try:
                return client.get_stock_kline(market_value, number, period, count=self.count, bar_time="end"), "end"
            except TypeError:
                # easy-tdx's MacClient returns MAC K-line timestamps at the
                # bar close (09:35 ... 15:00 for a normal A-share session).
                return client.get_stock_kline(market_value, number, period, count=self.count), "end"
        if hasattr(client, "get_security_bars"):
            try:
                from easy_tdx import KlineCategory  # type: ignore[import-not-found]
                category = getattr(KlineCategory, "MIN_5")
                return client.get_security_bars(market_value, number, category, 0, self.count, bar_time="end"), "end"
            except TypeError:
                return client.get_security_bars(market_value, number, category, 0, self.count), "end"
        raise SourceError("DEPENDENCY_API_UNSUPPORTED", "easy-tdx client has no supported K-line method", retryable=False)
