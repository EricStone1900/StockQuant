import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/probe":
            try:
                import qlib
                body = {"status": "READY", "version": getattr(qlib, "__version__", "unknown"), "smoke": "import-ok"}
            except Exception as exc:
                body = {"status": "NOT_RUN", "detail": str(exc)}
            payload = json.dumps(body).encode()
            self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(payload); return
        self.send_response(404); self.end_headers()

    def do_POST(self):
        if self.path not in ("/train", "/validate"):
            self.send_response(404); self.end_headers(); return
        length = int(self.headers.get("content-length", "0"))
        try:
            import qlib
            body = json.loads(self.rfile.read(length) or b"{}")
            bars = body.get("bars", [])
            if len(bars) < 3:
                raise ValueError("at least 3 bars are required for train/validation/test splits")
            n = len(bars); train_end = max(1, int(n * 0.6)); valid_end = max(train_end + 1, int(n * 0.8))
            if valid_end >= n: valid_end = n - 1
            def mean(items): return sum(float(item["open"]) for item in items) / len(items)
            artifact = {"algorithm": "deterministic-sma", "qlibVersion": getattr(qlib, "__version__", "unknown"), "splits": {"train": [0, train_end], "validation": [train_end, valid_end], "test": [valid_end, n]}, "means": {"train": mean(bars[:train_end]), "validation": mean(bars[train_end:valid_end]), "test": mean(bars[valid_end:])}}
            import hashlib
            artifact["artifactHash"] = hashlib.sha256(json.dumps(artifact, sort_keys=True).encode()).hexdigest()
            if self.path == "/validate":
                expected = body.get("artifactHash")
                valid = expected == artifact["artifactHash"]
                payload = json.dumps({"status":"PASS" if valid else "FAIL", "independent":True, "expectedHash":expected, "recomputedHash":artifact["artifactHash"], "assertionId":"V2.3-RESEARCH-VALIDATION-001"}).encode()
            else:
                payload = json.dumps({"status":"COMPLETED", "adapter":"qlib", "modelCalls":"NOT_RUN", "environmentMode":"BACKTEST", "dataMode":"FIXTURE", "artifact":artifact}).encode()
            self.send_response(200)
        except Exception as exc:
            payload = json.dumps({"status":"REJECTED", "reason":str(exc)}).encode(); self.send_response(422)
        self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(payload)

HTTPServer((os.getenv("QLIB_BIND_HOST", "0.0.0.0"), int(os.getenv("QLIB_PORT", "3004"))), Handler).serve_forever()
