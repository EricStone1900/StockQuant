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

HTTPServer((os.getenv("QLIB_BIND_HOST", "0.0.0.0"), int(os.getenv("QLIB_PORT", "3004"))), Handler).serve_forever()
