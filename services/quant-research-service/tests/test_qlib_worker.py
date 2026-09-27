import json
import os
import secrets
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.request import Request, urlopen


WORKER = Path(__file__).resolve().parents[1] / "qlib-worker.py"
BARS = [
    {"timestamp": f"2024-01-0{day}T09:31:00+08:00", "open": str(10 + day / 10), "close": str(10.1 + day / 10), "volume": 1000}
    for day in range(1, 6)
]


class QlibWorkerBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
        cls.quant_token = secrets.token_urlsafe(48)
        env = dict(os.environ, QLIB_BIND_HOST="127.0.0.1", QLIB_PORT=str(cls.port), STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE=cls.quant_token)
        cls.process = subprocess.Popen([sys.executable, str(WORKER)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.base = f"http://127.0.0.1:{cls.port}"
        for _ in range(40):
            if cls.process.poll() is not None:
                raise RuntimeError("Qlib worker exited before tests started")
            try:
                request = Request(f"{cls.base}/probe", headers={"authorization": f"Bearer {cls.quant_token}", "x-stockquant-service-id": "quant-research-service"})
                with urlopen(request, timeout=0.25):
                    break
            except Exception:
                time.sleep(0.05)
        else:
            cls.process.terminate()
            raise RuntimeError("Qlib worker did not start")

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)

    def post(self, path, body, token="USE_TEST_TOKEN", service_id="quant-research-service"):
        headers = {"content-type": "application/json"}
        if token == "USE_TEST_TOKEN":
            token = self.quant_token
        if token is not None:
            headers["authorization"] = f"Bearer {token}"
        if service_id is not None:
            headers["x-stockquant-service-id"] = service_id
        request = Request(f"{self.base}{path}", data=json.dumps(body).encode(), headers=headers)
        with urlopen(request, timeout=5) as response:
            return json.load(response)

    def post_status(self, path, body, token=None, service_id="quant-research-service"):
        try:
            return 200, self.post(path, body, token, service_id)
        except Exception as error:
            if hasattr(error, "code"):
                return error.code, json.load(error)
            raise

    def test_training_route_is_explicitly_a_fixture_summary(self):
        result = self.post("/train", {"bars": BARS})
        self.assertEqual(result["status"], "FIXTURE_ONLY")
        self.assertEqual(result["adapter"], "fixture-summary")
        self.assertEqual(result["modelTraining"], "NOT_RUN")
        self.assertEqual(result["artifact"]["algorithm"], "open-price-mean-summary")
        self.assertNotIn("qlibVersion", result["artifact"])

    def test_all_worker_operations_require_the_quant_service_identity(self):
        for path, method, body in (("/probe", "GET", None), ("/train", "POST", {"bars": BARS}), ("/validate", "POST", {"bars": BARS, "artifactHash": "0" * 64})):
            request = Request(f"{self.base}{path}", data=json.dumps(body).encode() if body is not None else None, method=method)
            try:
                urlopen(request, timeout=5)
                self.fail(f"anonymous {method} {path} unexpectedly succeeded")
            except Exception as error:
                self.assertEqual(error.code, 403, f"anonymous {method} {path} should be forbidden")

        request = Request(f"{self.base}/train", data=json.dumps({"bars": BARS}).encode(), headers={"content-type": "application/json", "authorization": f"Bearer {self.quant_token}", "x-stockquant-service-id": "platform-api-service"})
        with self.assertRaises(Exception) as raised:
            urlopen(request, timeout=5)
        self.assertEqual(raised.exception.code, 403)

    def test_hash_reproduction_does_not_claim_independent_model_validation(self):
        trained = self.post("/train", {"bars": BARS})
        result = self.post("/validate", {"bars": BARS, "artifactHash": trained["artifact"]["artifactHash"]})
        self.assertEqual(result["status"], "HASH_MATCH")
        self.assertEqual(result["method"], "FIXTURE_SUMMARY_HASH_RECOMPUTATION")
        self.assertEqual(result["independentModelValidation"], "NOT_RUN")

    def test_probe_reports_backend_unavailable_when_qlib_is_missing(self):
        request = Request(f"{self.base}/probe", headers={"authorization": f"Bearer {self.quant_token}", "x-stockquant-service-id": "quant-research-service"})
        with urlopen(request, timeout=5) as response:
            result = json.load(response)
        self.assertEqual(result["status"], "NOT_RUN")
        self.assertIn("No module named 'qlib'", result["detail"])

    def test_qlib_fit_requires_quant_research_service_bearer_and_rejects_invalid_fixture(self):
        fixture = {"schemaVersion": "qlib-fit-fixture-v1", "sourceMode": "FIXTURE", "featureRows": [[float(i)] for i in range(30)], "labels": [float(i) for i in range(30)], "splits": {"train": [0, 20], "valid": [20, 25], "test": [25, 30]}}
        self.assertEqual(self.post_status("/qlib/fit-fixture", fixture, None)[0], 403)
        self.assertEqual(self.post_status("/qlib/fit-fixture", fixture, "wrong-token-value" * 3)[0], 403)
        self.assertEqual(self.post_status("/qlib/fit-fixture", fixture, self.quant_token, "platform-api-service")[0], 403)
        invalid = json.loads(json.dumps(fixture))
        invalid["splits"]["valid"] = [18, 25]
        status, result = self.post_status("/qlib/fit-fixture", invalid, self.quant_token)
        self.assertEqual(status, 422)
        self.assertEqual(result["status"], "REJECTED")
        status, result = self.post_status("/qlib/fit-fixture", fixture, self.quant_token)
        self.assertEqual(status, 503)
        self.assertEqual(result["status"], "NOT_RUN")


if __name__ == "__main__":
    unittest.main()
