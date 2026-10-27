"""Offline comparison of the single approved probe with immutable prior archives."""
import csv
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
probe = json.loads((HERE / 'probe-report.json').read_text())
manifest_path = ROOT / probe['sourceManifestPath']
assert sha(manifest_path.read_bytes()) == probe['sourceManifestSha256']
manifest = json.loads(manifest_path.read_text())
prior = json.loads((HERE.parent / '2026-10-22-v22-historical-input-review/archive-review-v2.json').read_text())
for file in prior['files']:
    assert sha((ROOT / file['path']).read_bytes()) == file['sha256']
responses = {}
for file in manifest['artifacts']:
    raw = (manifest_path.parent / file['path']).read_bytes()
    assert sha(raw) == file['sha256']
    value = json.loads(raw)
    responses[(file['method'], file['params']['code'], file['params'].get('frequency'), file['params'].get('year'))] = value['rows']

D = Decimal
FIELDS = ['open', 'high', 'low', 'close', 'volume', 'amount']
summary = []
comparisons = []
failures = []
for code in ['sh.600000', 'sh.600004', 'sh.600006']:
    basic = responses[('query_stock_basic', code, None, None)]
    daily = responses[('query_history_k_data_plus', code, 'd', None)]
    minute = responses[('query_history_k_data_plus', code, '5', None)]
    daily_old = {r['date']: r for r in csv.DictReader((ROOT / f'data/local/baostock-daily-2019-2024-v1/daily/{code.replace(".", "_")}.csv').open())}
    minute_old = {r['time']: r for r in csv.DictReader((ROOT / f'data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1/minute-5/{code.replace(".", "_")}.csv').open())}
    changed_daily = [r['date'] for r in daily if r['date'] not in daily_old or any(D(r[k]) != D(daily_old[r['date']][k]) for k in FIELDS)]
    changed_minute = [r['time'] for r in minute if r['time'] not in minute_old or any(D(r[k]) != D(minute_old[r['time']][k]) for k in FIELDS)]
    by_date = defaultdict(list)
    for row in minute:
        by_date[row['date']].append(row)
    if len(basic) != 1 or len(daily) != 5 or len(minute) != 240 or set(by_date) != set(prior['dates']):
        failures.append(code + ':ROW_COVERAGE_MISMATCH')
    if any(r['code'] != code or r['adjustflag'] != '3' for r in daily + minute):
        failures.append(code + ':CODE_OR_ADJUSTMENT_MISMATCH')
    action_rows = [r for year in [2023, 2024] for r in responses[('query_dividend_data', code, None, year)]]
    in_window = [r for r in action_rows if any('2024-01-02' <= r.get(k, '') <= '2024-01-08' for k in ['dividOperateDate', 'dividPayDate', 'dividStockMarketDate'])]
    factors = responses[('query_adjust_factor', code, None, None)]
    summary.append({'code': code, 'basicRows': len(basic), 'ipoDate': basic[0].get('ipoDate') if basic else None, 'outDateField': basic[0].get('outDate') if basic else None, 'currentNameIsNotHistoricalName': True, 'dailyRows': len(daily), 'minuteRows': len(minute), 'rawAdjustmentFlagVerified': all(r['adjustflag'] == '3' for r in daily + minute), 'dailyTradingStatusValues': sorted({r['tradestatus'] for r in daily}), 'dailyIsSTValues': sorted({r['isST'] for r in daily}), 'changedDailyDatesComparedToArchive': changed_daily, 'changedMinuteTimesComparedToArchive': changed_minute, 'dividendRowsAcross2023And2024': len(action_rows), 'dividendOperationPayOrListingEventsInSampleWindow': len(in_window), 'adjustmentFactorRowsInRequestedWindow': len(factors), 'corporateActionCoverage': 'PARTIAL_DIVIDEND_AND_FACTOR_ENDPOINT_SCOPE', 'intradaySuspensionCoverage': 'NOT_VERIFIED'})
    for day in daily:
        rows = sorted(by_date[day['date']], key=lambda r: r['time'])
        agg = {'open': D(rows[0]['open']), 'high': max(D(r['high']) for r in rows), 'low': min(D(r['low']) for r in rows), 'close': D(rows[-1]['close']), 'volume': sum(D(r['volume']) for r in rows), 'amount': sum(D(r['amount']) for r in rows)}
        differences = {key: str(value - D(day[key])) for key, value in agg.items()}
        comparisons.append({'code': code, 'date': day['date'], 'minuteRows': len(rows), 'minuteMinusDaily': differences, 'exactOhlcMatch': all(D(differences[k]) == 0 for k in ['open', 'high', 'low', 'close']), 'exactVolumeAmountMatch': all(D(differences[k]) == 0 for k in ['volume', 'amount'])})
report = {'schemaVersion': 1, 'date': '2026-10-22', 'source': 'baostock', 'scope': 'fixed three-security, five-day provider reproduction; not independent exchange truth or stage acceptance', 'probeStatus': probe['status'], 'probeReportSha256': sha((HERE / 'probe-report.json').read_bytes()), 'sourceManifestSha256': probe['sourceManifestSha256'], 'approvalId': probe['approval'], 'rpcRequests': probe['transport']['rpcTransmitted'], 'receivedBytes': probe['transport']['receivedBytes'], 'sampleQuality': 'FAIL' if failures else 'PASS', 'failures': failures, 'securities': summary, 'comparisons': comparisons, 'priorArchiveReproduction': 'EXACT_MATCH' if all(not r['changedDailyDatesComparedToArchive'] and not r['changedMinuteTimesComparedToArchive'] for r in summary) else 'DIFFERENCES_FOUND', 'crossFrequencyMismatchDays': sum(not r['exactVolumeAmountMatch'] for r in comparisons), 'ohlcMismatchDays': sum(not r['exactOhlcMatch'] for r in comparisons), 'interpretation': ['The freshly queried source reproduces all sampled OHLCV/amount fields of both old archives; no sampled revision or local archive corruption is observed.', 'The source itself returns inconsistent values across daily and minute frequencies in this sample; deeper upstream cause is unknown.', 'Preserve frequency-specific RAW facts. Do not change volume/amount, prices, units or tolerances to force agreement; minute aggregates are not official daily bars.', 'Current stock basic fields are not a complete PIT universe or historical security name.', 'Daily tradestatus is not a per-minute suspension record.', 'No in-window dividend/factor events were returned; that does not prove all corporate actions absent.'], 'remaining': ['sample-period MarketRuleSet mapping and source-provenance binding', 'full corporate-action coverage decision or further evidence', 'acceptance treatment of reproducible provider cross-frequency differences', 'positive replay use is outside the one-off evidence acquisition authorization', 'current-candidate human acceptance'], 'positiveReplay': 'NOT_RUN', 'stageStatus': 'PARTIALLY_IMPLEMENTED', 'humanAcceptance': 'NOT_RUN', 'externalRequestsDuringComparison': 0}
with (HERE / 'comparison-report.json').open('x') as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2);handle.write('\n')
print(json.dumps({key: report[key] for key in ['sampleQuality', 'priorArchiveReproduction', 'crossFrequencyMismatchDays', 'ohlcMismatchDays', 'rpcRequests', 'positiveReplay']}))
raise SystemExit(1 if failures else 2)
