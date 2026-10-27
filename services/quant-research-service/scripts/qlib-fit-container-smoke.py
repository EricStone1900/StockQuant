import importlib.util
import json
import hashlib
import os
import threading
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import HTTPServer
from pathlib import Path
import base64


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
    fixture_path = Path("/opt/qlib/qlib-fit-input.json")
    fixture_bytes = fixture_path.read_bytes()
    expected_fixture_sha256 = "1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e"
    fixture_sha256 = hashlib.sha256(fixture_bytes).hexdigest()
    if fixture_sha256 != expected_fixture_sha256:
        raise RuntimeError(f"frozen Qlib fixture hash mismatch: {fixture_sha256}")
    body = json.loads(fixture_bytes)
    features, labels = body["featureRows"], body["labels"]
    status, result = call("/qlib/fit-fixture", body)
    if status != 200 or result.get("modelTraining") != "PASS" or result.get("modelValidation") != "NOT_RUN" or result.get("temporalValidation") != "PASS" or result.get("candidateSourceExecution") != "NOT_PERFORMED" or result.get("testPredictionCount") != 24 or result.get("testPredictionsFinite") is not True:
        raise RuntimeError(f"Qlib fixture fit failed: HTTP {status} {result}")
    # Independently reload the persisted LightGBM model string in a fresh evaluator
    # path and recompute the held-out predictions directly from the frozen rows.
    import numpy as np
    import lightgbm as lgb
    model_bytes = base64.b64decode(result["modelArtifactBase64"], validate=True)
    if hashlib.sha256(model_bytes).hexdigest() != result["modelSha256"]:
        raise RuntimeError("Qlib model artifact bytes do not match the recorded artifact hash")
    independent_model = lgb.Booster(model_str=model_bytes.decode("utf-8"))
    test_start, test_end = body["splits"]["test"]
    recomputed = np.asarray(independent_model.predict(features[test_start:test_end]), dtype=float)
    recorded = np.asarray(result["testPredictions"], dtype=float)
    if recomputed.shape != (24,) or not np.isfinite(recomputed).all() or not np.allclose(recomputed, recorded, rtol=0, atol=1e-12):
        raise RuntimeError("independent persisted-model recomputation differs from Worker predictions")
    recomputed_json = json.dumps(recomputed.tolist(), separators=(",", ":"), allow_nan=False)
    recomputed_sha256 = hashlib.sha256(recomputed_json.encode("utf-8")).hexdigest()
    if recomputed_sha256 != result["testPredictionsSha256"]:
        raise RuntimeError("independently recomputed predictions do not match the recorded canonical hash")
    repeat_status, repeat_result = call("/qlib/fit-fixture", body)
    if repeat_status != 200 or repeat_result.get("testPredictionsSha256") != result.get("testPredictionsSha256") or repeat_result.get("modelSha256") != result.get("modelSha256"):
        raise RuntimeError(f"repeated Qlib fit was not deterministic: HTTP {repeat_status} {repeat_result}")
    invalid = json.loads(json.dumps(body))
    invalid["splits"]["valid"] = [70, 96]
    invalid_status, invalid_result = call("/qlib/fit-fixture", invalid)
    if invalid_status != 422 or invalid_result.get("status") != "REJECTED":
        raise RuntimeError(f"future-overlap split was not rejected: HTTP {invalid_status} {invalid_result}")
    print(json.dumps({"status": "PASS", "runtime": "locked Qlib Worker image; linux/amd64 emulated on Apple Silicon", "fixtureSha256": fixture_sha256, "qlibVersion": result["qlibVersion"], "lightgbmVersion": result["lightgbmVersion"], "model": result["model"], "segments": result["segments"], "temporalValidation": result["temporalValidation"], "testPredictionCount": result["testPredictionCount"], "testPredictionsSha256": result["testPredictionsSha256"], "modelSha256": result["modelSha256"], "repeatFitDeterminism": "same prediction/model SHA-256", "independentModelRecompute": "PASS; fresh Booster load; 24/24 test predictions; rtol=0 atol=1e-12; canonical SHA-256 match", "invalidSplit": "422", "tracking": result["tracking"], "candidateSourceExecution": result["candidateSourceExecution"], "profitabilityClaim": result["profitabilityClaim"]}, sort_keys=True))
finally:
    server.shutdown()
    server.server_close()
