"""Bounded read-only easy-tdx capability probe.

The probe runs the existing JSON-lines adapter boundary, so it exercises the
same normalization and failure contract as a collection run without creating a
run, publishing an Artifact, or changing a source circuit in the service.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--security-ids", default="600000.SH,000001.SZ,600519.SH")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--timeout-seconds", type=float, default=10.0)
    parser.add_argument("--output")
    argv = sys.argv[1:]
    return parser.parse_args(argv[1:] if argv[:1] == ["--"] else argv)


def run() -> dict[str, object]:
    args = parse_args()
    security_ids = [item.strip().upper() for item in args.security_ids.split(",") if item.strip()]
    if not security_ids:
        raise ValueError("--security-ids must contain at least one security")
    request = {
        "sources": ["tdx"],
        "securityIds": security_ids,
        "startDate": args.start_date,
        "endDate": args.end_date,
        "timeoutSeconds": args.timeout_seconds,
        "maxAttempts": 1,
        "tdxIntervalSeconds": 1.0,
        "tdxBarCount": 800,
        "healthPath": "/tmp/stockquant-tdx-probe-health.json",
    }
    try:
        completed = subprocess.run(
            [sys.executable, "-m", "market_data_adapter.cli"],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            timeout=max(5.0, args.timeout_seconds * 2),
            check=False,
        )
        payload = json.loads(completed.stdout)
        status = "PASS" if completed.returncode == 0 and payload.get("status") == "COMPLETED" else "PARTIAL"
        result: dict[str, object] = {
            "probe": "tdx-minute-capability",
            "status": status,
            "source": "tdx",
            "securityIds": security_ids,
            "window": {"startDate": args.start_date, "endDate": args.end_date},
            "probedAt": datetime.now().astimezone().isoformat(),
            "adapterExitCode": completed.returncode,
            "sourceId": payload.get("sourceId"),
            "attempts": payload.get("attempts", []),
            "rows": len(payload.get("bars", [])) if isinstance(payload.get("bars"), list) else 0,
            "stderr": completed.stderr[-2000:],
        }
    except subprocess.TimeoutExpired as error:
        result = {
            "probe": "tdx-minute-capability",
            "status": "FAIL",
            "source": "tdx",
            "securityIds": security_ids,
            "window": {"startDate": args.start_date, "endDate": args.end_date},
            "probedAt": datetime.now().astimezone().isoformat(),
            "error": f"probe timed out: {error}",
        }
    except (json.JSONDecodeError, OSError) as error:
        result = {
            "probe": "tdx-minute-capability",
            "status": "FAIL",
            "source": "tdx",
            "securityIds": security_ids,
            "window": {"startDate": args.start_date, "endDate": args.end_date},
            "probedAt": datetime.now().astimezone().isoformat(),
            "error": repr(error),
        }
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    result["resultSha256"] = hashlib.sha256(encoded.encode()).hexdigest()
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    output = run()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output["status"] in {"PASS", "PARTIAL"} else 1)
