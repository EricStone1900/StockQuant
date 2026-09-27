import importlib.util
import json
import os
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer
from pathlib import Path


worker_path = Path(__file__).resolve().parent / "qlib-worker.py"
spec = importlib.util.spec_from_file_location("stockquant_qlib_worker", worker_path)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
server = HTTPServer(("127.0.0.1", 0), worker.Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_port}"

def call(path, value):
    headers = {"content-type": "application/json", "authorization": f"Bearer {os.environ['STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE']}", "x-stockquant-service-id": "quant-research-service"}
    request = urllib.request.Request(f"{base}{path}", data=json.dumps(value).encode(), headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)

try:
    probe_request = urllib.request.Request(f"{base}/probe", headers={"authorization": f"Bearer {os.environ['STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE']}", "x-stockquant-service-id": "quant-research-service"})
    with urllib.request.urlopen(probe_request, timeout=5) as response:
        probe = json.load(response)
    if probe.get("status") != "READY" or probe.get("version") != "0.9.6":
        raise RuntimeError(f"unexpected Qlib probe: {probe}")
    features = [[index / 120, (index % 7) / 7, (index % 11) / 11, (index % 13) / 13, (index % 5) / 5] for index in range(120)]
    labels = [0.01 * index / 120 + 0.02 * __import__("math").sin(index / 9) for index in range(120)]
    body = {"schemaVersion": "qlib-fit-fixture-v1", "sourceMode": "FIXTURE", "featureRows": features, "labels": labels, "splits": {"train": [0, 72], "valid": [72, 96], "test": [96, 120]}}
    status, result = call("/qlib/fit-fixture", body)
    if status != 200 or result.get("modelTraining") != "PASS" or result.get("modelValidation") != "NOT_RUN" or result.get("candidateSourceExecution") != "NOT_PERFORMED" or result.get("testPredictionCount") != 24 or result.get("testPredictionsFinite") is not True:
        raise RuntimeError(f"Qlib fixture fit failed: HTTP {status} {result}")
    repeat_status, repeat_result = call("/qlib/fit-fixture", body)
    if repeat_status != 200 or repeat_result.get("testPredictionsSha256") != result.get("testPredictionsSha256") or repeat_result.get("modelSha256") != result.get("modelSha256"):
        raise RuntimeError(f"repeated Qlib fit was not deterministic: HTTP {repeat_status} {repeat_result}")
    invalid = json.loads(json.dumps(body))
    invalid["splits"]["valid"] = [70, 96]
    invalid_status, invalid_result = call("/qlib/fit-fixture", invalid)
    if invalid_status != 422 or invalid_result.get("status") != "REJECTED":
        raise RuntimeError(f"future-overlap split was not rejected: HTTP {invalid_status} {invalid_result}")
    print(json.dumps({"status": "PASS", "runtime": "locked Qlib Worker image; linux/amd64 emulated on Apple Silicon", "qlibVersion": result["qlibVersion"], "lightgbmVersion": result["lightgbmVersion"], "model": result["model"], "segments": result["segments"], "testPredictionCount": result["testPredictionCount"], "testPredictionsSha256": result["testPredictionsSha256"], "modelSha256": result["modelSha256"], "repeatFitDeterminism": "same prediction/model SHA-256", "invalidSplit": "422", "tracking": result["tracking"], "candidateSourceExecution": result["candidateSourceExecution"], "profitabilityClaim": result["profitabilityClaim"]}, sort_keys=True))
finally:
    server.shutdown()
    server.server_close()
