"""One-off owner-approved BaoStock verification; no retries or persistent activation."""
from __future__ import annotations
import argparse
import contextlib
import hashlib
import importlib.metadata
import io
import json
import os
from pathlib import Path
import signal
import socket
import sys
import time
from datetime import datetime, timedelta, timezone

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
approval = json.loads((HERE / 'source-use-approval.json').read_text())
proposal_path = ROOT / approval['proposalPath']
assert sha(proposal_path.read_bytes()) == approval['proposalSha256']
plan = json.loads(proposal_path.read_text())
assert approval['status'] == 'APPROVED_ONE_OFF'
assert plan['budget']['maxRpcRequestsIncludingPagination'] == 20
assert plan['securities'] == ['sh.600000', 'sh.600004', 'sh.600006']
assert plan['sampleFrom'] == '2024-01-02' and plan['sampleTo'] == '2024-01-08'
assert importlib.metadata.version('baostock') == '0.9.3'
import baostock as bs
import baostock.common.contants as constants
import baostock.common.context as sdk_context
import baostock.util.socketutil as transport
assert (constants.BAOSTOCK_SERVER_IP, constants.BAOSTOCK_SERVER_PORT) == ('public-api.baostock.com', 10030)

if not args.execute:
    print(json.dumps({'status': 'PREFLIGHT_PASS', 'networkCalls': 0, 'sdk': importlib.metadata.version('baostock'), 'endpoint': plan['endpoint'], 'rpcLimit': 20, 'dataCallLimit': 18, 'approval': approval['decisionId']}))
    raise SystemExit(0)

out = ROOT / plan['futureOutputDirectory']
if out.exists() or (HERE / 'probe-report.json').exists():
    raise SystemExit('Refuse to overwrite an existing one-off run or reuse its approval budget')
out.mkdir(parents=True)
now = datetime.now(timezone.utc)
state = {'rpcAttempts': 0, 'rpcTransmitted': 0, 'receivedBytes': 0, 'transmittedBytes': 0, 'lastRpc': None}
started = time.monotonic()
deadline = started + 360
receipts = []
artifacts = []
logged_in = False
stop = None
transport_failed = False

class ProbeStop(BaseException):
    pass

def timeout_handler(_signum, _frame):
    global transport_failed
    transport_failed = True
    raise ProbeStop('OPERATION_TIMEOUT')
signal.signal(signal.SIGALRM, timeout_handler)
OriginalSocket = socket.socket
class BoundedSocket(OriginalSocket):
    def connect(self, address):
        if address != ('public-api.baostock.com', 10030):
            raise ProbeStop('ENDPOINT_OUT_OF_SCOPE')
        self.settimeout(15)
        return super().connect(address)
    def send(self, data, flags=0):
        if time.monotonic() >= deadline:
            raise ProbeStop('TOTAL_TIMEOUT')
        state['rpcTransmitted'] += 1
        if state['rpcTransmitted'] > 20:
            raise ProbeStop('RPC_BUDGET_EXCEEDED')
        state['transmittedBytes'] += len(data)
        return super().send(data, flags)
    def recv(self, size, flags=0):
        if time.monotonic() >= deadline:
            raise ProbeStop('TOTAL_TIMEOUT')
        remaining = 2_000_000 - state['receivedBytes']
        data = super().recv(min(size, max(1, remaining + 1)), flags)
        state['receivedBytes'] += len(data)
        if state['receivedBytes'] > 2_000_000:
            raise ProbeStop('RESPONSE_BYTE_BUDGET_EXCEEDED')
        if not data:
            raise ProbeStop('SOCKET_CLOSED')
        return data
socket.socket = BoundedSocket
original_send = transport.send_msg

def bounded_send(message):
    if state['rpcAttempts'] >= 20:
        raise ProbeStop('RPC_BUDGET_EXCEEDED')
    if state['lastRpc'] is not None:
        time.sleep(max(0, 1 - (time.monotonic() - state['lastRpc'])))
    if time.monotonic() >= deadline:
        raise ProbeStop('TOTAL_TIMEOUT')
    state['rpcAttempts'] += 1
    state['lastRpc'] = time.monotonic()
    return original_send(message)
transport.send_msg = bounded_send

# Process-local gates only. No .env.local, Compose or automated job configuration is written.
sys.path.insert(0, str(ROOT / 'services/market-data-adapter/src'))
from market_data_adapter.authorization import missing_collection_source_authorization, missing_historical_research_source_authorization
for prefix in ['STOCKQUANT_COLLECTION', 'STOCKQUANT_MARKET_RESEARCH']:
    os.environ[prefix + '_SOURCE_USE_AUTHORIZED'] = 'true'
    os.environ[prefix + '_SOURCE_AUTHORIZATION_REF'] = str(HERE / 'source-use-approval.json')
    os.environ[prefix + '_DATA_VERSION'] = out.name
    os.environ[prefix + '_AUTHORIZED_SOURCE_IDS'] = 'baostock'
assert not missing_collection_source_authorization(['baostock'])
assert not missing_historical_research_source_authorization(['baostock'])

def call(method, params, kind, expected_fields=None):
    begin = time.monotonic()
    receipt = {'method': method, 'params': params, 'kind': kind, 'rpcBefore': state['rpcAttempts']}
    receipts.append(receipt)
    signal.setitimer(signal.ITIMER_REAL, max(0.01, min(15, deadline - begin)))
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            result = getattr(bs, method)(**params)
            receipt['errorCode'] = str(getattr(result, 'error_code', 'NO_RESULT'))
            if receipt['errorCode'] != '0':
                raise ProbeStop('SOURCE_ERROR_' + receipt['errorCode'])
            if kind == 'SESSION':
                receipt['status'] = 'SUCCESS'
                return
            fields = list(result.fields)
            receipt['fields'] = fields
            if expected_fields and not set(expected_fields).issubset(fields):
                raise ProbeStop('SCHEMA_MISMATCH')
            rows = []
            while result.next():
                row = result.get_row_data()
                if len(row) != len(fields) or len(rows) >= 1000:
                    raise ProbeStop('SCHEMA_OR_ROW_BOUND_EXCEEDED')
                rows.append(dict(zip(fields, row)))
            if result.error_code != '0':
                raise ProbeStop('SOURCE_ERROR_' + str(result.error_code))
        raw = (json.dumps({'method': method, 'params': params, 'fields': fields, 'rows': rows}, ensure_ascii=False, indent=2) + '\n').encode()
        if len(raw) > 2_000_000:
            raise ProbeStop('STRUCTURED_RESPONSE_TOO_LARGE')
        name = f'{len(artifacts) + 1:02d}-{kind.lower()}-{params["code"].replace(".", "_")}' + (f'-{params["year"]}' if 'year' in params else '') + '.json'
        with (out / name).open('xb') as handle:
            handle.write(raw)
        artifacts.append({'path': name, 'sha256': sha(raw), 'method': method, 'params': params, 'fields': fields, 'rows': len(rows)})
        receipt['rows'] = len(rows)
        receipt['responseSha256'] = sha(raw)
        receipt['status'] = 'SUCCESS'
    except ProbeStop as error:
        receipt['status'] = 'STOPPED'
        receipt['stopReason'] = str(error)
        raise
    except Exception as error:
        receipt['status'] = 'STOPPED'
        receipt['stopReason'] = type(error).__name__
        raise ProbeStop(type(error).__name__) from None
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        receipt['elapsedSeconds'] = round(time.monotonic() - begin, 3)
        receipt['rpcAfter'] = state['rpcAttempts']
        print(json.dumps(receipt, ensure_ascii=False), flush=True)

try:
    call('login', {}, 'SESSION')
    logged_in = True
    for spec in plan['operations']:
        for code in plan['securities']:
            for year in spec.get('years', [None]):
                params = {'code': code}
                if spec['method'] == 'query_history_k_data_plus':
                    params.update(fields=','.join(spec['fields']), start_date=plan['sampleFrom'], end_date=plan['sampleTo'], frequency=spec['frequency'], adjustflag=spec['adjustflag'])
                elif spec['method'] == 'query_dividend_data':
                    params.update(year=year, yearType=spec['yearType'])
                elif spec['method'] == 'query_adjust_factor':
                    params.update(start_date=spec['from'], end_date=spec['to'])
                kind = 'DAILY' if spec.get('frequency') == 'd' else 'MINUTE' if spec.get('frequency') == '5' else 'BASIC' if spec['method'] == 'query_stock_basic' else 'DIVIDEND' if year else 'FACTOR'
                call(spec['method'], params, kind, spec['fields'] if isinstance(spec['fields'], list) else None)
except ProbeStop as error:
    stop = str(error)
finally:
    if logged_in and not transport_failed and state['rpcAttempts'] < 20 and time.monotonic() < deadline:
        try:
            call('logout', {}, 'SESSION')
        except ProbeStop as error:
            stop = stop or str(error)
    connection = getattr(sdk_context, 'default_socket', None)
    if connection:
        connection.close()
    signal.setitimer(signal.ITIMER_REAL, 0)
    manifest = {'schemaVersion': 1, 'source': 'baostock', 'dataMode': 'REAL_PROVIDER_RESPONSE', 'version': out.name, 'capturedAt': now.isoformat(), 'retainUntil': (now + timedelta(days=30)).isoformat(), 'approval': approval['decisionId'], 'approvalSha256': sha((HERE / 'source-use-approval.json').read_bytes()), 'sdkVersion': importlib.metadata.version('baostock'), 'endpoint': plan['endpoint'], 'status': 'STOPPED' if stop else 'COMPLETED', 'stopReason': stop, 'transport': state, 'artifacts': artifacts}
    with (out / 'manifest.json').open('x') as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2);handle.write('\n')
    report = {'schemaVersion': 1, 'date': '2026-10-22', 'status': manifest['status'], 'stopReason': stop, 'scope': 'bounded source evidence acquisition only; not stage/human acceptance or full historical truth', 'sourceManifestPath': str((out / 'manifest.json').relative_to(ROOT)), 'sourceManifestSha256': sha((out / 'manifest.json').read_bytes()), 'scriptSha256': sha(Path(__file__).read_bytes()), 'sdkVersion': manifest['sdkVersion'], 'endpoint': plan['endpoint'], 'approval': approval['decisionId'], 'transport': state, 'receipts': receipts, 'artifacts': artifacts, 'elapsedSeconds': round(time.monotonic() - started, 3), 'positiveReplay': 'NOT_RUN', 'humanAcceptance': 'NOT_RUN', 'activeServicesTouched': False, 'modelsOrStrategiesEnabled': False}
    with (HERE / 'probe-report.json').open('x') as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2);handle.write('\n')
print(json.dumps({'status': report['status'], 'stopReason': stop, 'rpcAttempts': state['rpcAttempts'], 'rpcTransmitted': state['rpcTransmitted'], 'receivedBytes': state['receivedBytes'], 'artifacts': len(artifacts)}, ensure_ascii=False))
raise SystemExit(2 if stop else 0)
