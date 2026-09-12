from __future__ import annotations

import json
import multiprocessing as mp
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from queue import Empty
from typing import Any, Sequence

from .failover import NormalizedBar, SourceError

FIELDS = "date,time,code,open,high,low,close,volume,amount"


def _bar_end(start: str) -> str:
    value = datetime.fromisoformat(start.replace("Z", "+00:00")) + timedelta(minutes=5)
    return value.isoformat().replace("+00:00", "Z")


def normalize_baostock(rows: Sequence[Sequence[str]], source_id: str = "baostock") -> list[NormalizedBar]:
    result: list[NormalizedBar] = []
    for row in rows:
        if len(row) != 9:
            raise SourceError("SCHEMA_INVALID", "BaoStock row does not contain the required 9 fields", retryable=False)
        date, clock, code, open_, high, low, close, volume, amount = row
        start = f"{date}T{clock[:2]}:{clock[2:4]}:{clock[4:6]}+08:00"
        market, number = code.split(".", 1)
        result.append(NormalizedBar(f"{number}.{market.upper()}", start, _bar_end(start), None, open_, high, low, close, volume, amount, "raw", source_id))
    return result


def normalize_sina(items: Sequence[dict[str, Any]], security_id: str, source_id: str = "sina") -> list[NormalizedBar]:
    result: list[NormalizedBar] = []
    for item in items:
        required = ("day", "open", "high", "low", "close", "volume", "amount")
        if any(key not in item for key in required):
            raise SourceError("SCHEMA_INVALID", "Sina response misses a required OHLCV/amount field", retryable=False)
        start = str(item["day"]).replace(" ", "T") + "+08:00"
        result.append(NormalizedBar(security_id, start, _bar_end(start), None, str(item["open"]), str(item["high"]), str(item["low"]), str(item["close"]), str(item["volume"]), str(item["amount"]), "raw", source_id))
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


def _baostock_child(code: str, start: str, end: str, output: Any) -> None:
    try:
        import baostock as bs  # type: ignore[import-not-found]
        login = bs.login()
        if login.error_code != "0":
            output.put({"error": "LOGIN_FAILED", "message": login.error_msg})
            return
        try:
            query = bs.query_history_k_data_plus(code, FIELDS, start_date=start, end_date=end, frequency="5", adjustflag="3")
            rows: list[list[str]] = []
            while query.next():
                rows.append(query.get_row_data())
            output.put({"rows": rows, "errorCode": query.error_code, "message": query.error_msg})
        finally:
            bs.logout()
    except Exception as error:  # noqa: BLE001
        output.put({"error": "ADAPTER_EXCEPTION", "message": repr(error)})


class BaoStockMinuteClient:
    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        context = mp.get_context("spawn")
        bars: list[NormalizedBar] = []
        for security_id in security_ids:
            queue = context.Queue()
            process = context.Process(target=_baostock_child, args=(baostock_symbol(security_id), start, end, queue))
            process.start()
            try:
                response = queue.get(timeout=timeout_seconds)
            except Empty:
                process.terminate()
                process.join(5)
                raise SourceError("TIMEOUT", f"BaoStock query timed out for {security_id}")
            finally:
                if process.is_alive():
                    process.terminate()
                    process.join(5)
                queue.close()
            if response.get("error") or response.get("errorCode") != "0":
                raise SourceError(str(response.get("error") or "QUERY_FAILED"), str(response.get("message", "BaoStock query failed")))
            bars.extend(normalize_baostock(response["rows"]))
        return filter_range(bars, start, end)


class SinaMinuteClient:
    def __init__(self, opener=urllib.request.urlopen) -> None:
        self.opener = opener

    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]:
        bars: list[NormalizedBar] = []
        for security_id in security_ids:
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
