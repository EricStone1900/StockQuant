"""Read-only bounded archive audit; no Provider/model/DB calls or source mutation."""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-file', default='archive-review-v2.json', help='new JSON basename in this audit directory; existing files are never overwritten')
args = parser.parse_args()
if Path(args.output_file).name != args.output_file or not args.output_file.endswith('.json'):
    parser.error('--output-file must be a JSON basename')
ROOT = Path(__file__).resolve().parents[3]
CODES = ['sh.600000', 'sh.600004', 'sh.600006']
DATES = ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08']
MINUTE = ROOT / 'data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1'
DAILY = ROOT / 'data/local/baostock-daily-2019-2024-v1'
sha = lambda b: hashlib.sha256(b).hexdigest()
failures = []
files = []
comparisons = []
selected_rows = []
expected_times = {f'{h:02d}{m:02d}00000' for start, end in [(9 * 60 + 35, 11 * 60 + 30), (13 * 60 + 5, 15 * 60)] for minute in range(start, end + 1, 5) for h, m in [divmod(minute, 60)]}
for code in CODES:
    inputs = {}
    for kind, directory in [('minute', MINUTE), ('daily', DAILY)]:
        manifest_path = directory / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        artifact = manifest['artifacts'][code]
        path = directory / artifact['path']
        raw = path.read_bytes()
        rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines()))
        ok = sha(raw) == artifact['sha256'] and len(rows) == artifact['rows']
        if not ok:
            failures.append(f'{kind}:{code}:hash-or-row-count')
        files.append({'kind': kind, 'code': code, 'path': str(path.relative_to(ROOT)), 'sha256': sha(raw), 'rows': len(rows), 'manifestSha256': sha(manifest_path.read_bytes()), 'manifestMatch': ok})
        inputs[kind] = rows
    days = defaultdict(list)
    for row in inputs['minute']:
        if row['date'] in DATES:
            days[row['date']].append(row)
    daily = {row['date']: row for row in inputs['daily'] if row['date'] in DATES}
    for date in DATES:
        rows = days[date]
        selected_rows.extend(rows)
        expected = {date.replace('-', '') + time for time in expected_times}
        actual = [row['time'] for row in rows]
        missing = sorted(expected - set(actual))
        unexpected = sorted(set(actual) - expected)
        duplicates = len(actual) - len(set(actual))
        row_issues = []
        for row in rows:
            o, h, l, c, v, a = [Decimal(row[field]) for field in ['open', 'high', 'low', 'close', 'volume', 'amount']]
            if row['code'] != code or not all(n.is_finite() for n in [o, h, l, c, v, a]) or not (l <= min(o, c) <= max(o, c) <= h) or v < 0 or a < 0 or v != v.to_integral_value():
                row_issues.append(row['time'])
        if missing or unexpected or duplicates or row_issues:
            failures.append(f'{code}:{date}:window-or-quality')
        diff = None
        if rows and date in daily:
            rows.sort(key=lambda row: row['time'])
            agg = {'open': Decimal(rows[0]['open']), 'high': max(Decimal(r['high']) for r in rows), 'low': min(Decimal(r['low']) for r in rows), 'close': Decimal(rows[-1]['close']), 'volume': sum(Decimal(r['volume']) for r in rows), 'amount': sum(Decimal(r['amount']) for r in rows)}
            diff = {key: str(value - Decimal(daily[date][key])) for key, value in agg.items()}
        comparisons.append({'code': code, 'date': date, 'rows': len(rows), 'expectedBars': 48, 'missingBarEnds': missing, 'unexpectedBarEnds': unexpected, 'duplicates': duplicates, 'qualityIssueTimes': row_issues, 'dailyComparison': 'EXACT_MATCH' if diff and all(Decimal(d) == 0 for d in diff.values()) else 'MISMATCH' if diff else 'NOT_AVAILABLE', 'minuteMinusDaily': diff})
report = {'schemaVersion': 1, 'date': '2026-10-22', 'stage': 'V2.2', 'scope': 'read-only integrity and cross-frequency consistency; not research authorization or independent provider/market-fact verification', 'expectedWindowBasis': 'frozen 5m BAR_END assumption: 09:35..11:30 and 13:05..15:00 Asia/Shanghai; not a verified historical calendar', 'declaredUnits': {'volume': 'SHARES', 'amount': 'CNY', 'adjustment': 'RAW'}, 'securities': CODES, 'dates': DATES, 'selectedRows': len(selected_rows), 'expectedRows': 720, 'selectedRowsSha256': sha(json.dumps(selected_rows, sort_keys=True, separators=(',', ':')).encode()), 'files': files, 'comparisons': comparisons, 'contentIntegrity': 'FAIL' if failures else 'PASS', 'failures': failures, 'dailyComparisonCounts': {s: sum(c['dailyComparison'] == s for c in comparisons) for s in ['EXACT_MATCH', 'MISMATCH', 'NOT_AVAILABLE']}, 'limitations': ['Both frequencies are from the same provider; agreement is not independent truth.', 'Raw adjustment and unit metadata are absent from original CSV manifests; comparisons test consistency only.', 'Missing bars remain UNKNOWN without independent security status.', 'No verified historical security membership/listing-exit, corporate actions or security status files are present.', 'Owner confirmed no additional context evidence on 2026-10-22.', 'HISTORICAL_RESEARCH is not covered by the existing OD-008 decision.'], 'overallStatus': 'BLOCKED', 'exitCode': 2, 'positiveReplay': 'NOT_RUN', 'humanAcceptance': 'NOT_RUN', 'externalProviderCalls': 0, 'modelCalls': 0}
output = Path(__file__).with_name(args.output_file)
if output.exists():
    raise SystemExit('refuse to overwrite existing audit evidence')
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'output': str(output.relative_to(ROOT)), 'contentIntegrity': report['contentIntegrity'], 'selectedRows': report['selectedRows'], 'dailyComparisonCounts': report['dailyComparisonCounts'], 'failures': failures}, ensure_ascii=False))
raise SystemExit(1 if failures else 2)
