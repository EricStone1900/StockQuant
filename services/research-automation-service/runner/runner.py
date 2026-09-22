"""Small, policy-first entrypoint for an isolated V3.1 experiment Runner."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


JOB_PATH = Path(os.environ.get("STOCKQUANT_RUNNER_JOB", "/run/input/job.json"))
CODE_ROOT = Path("/run/input/code").resolve()
OUTPUT_ROOT = Path("/run/output").resolve()


def fail(message: str) -> int:
    print(json.dumps({"status": "REJECTED", "reason": message}, sort_keys=True))
    return 2


def main() -> int:
    if not JOB_PATH.is_file():
        return fail("job file is missing")
    try:
        job = json.loads(JOB_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return fail(f"invalid job: {exc}")

    if job.get("network_policy") != "DENY":
        return fail("network_policy must be DENY")
    script_name = job.get("script")
    if not isinstance(script_name, str) or not script_name.endswith(".py"):
        return fail("script must be a Python file")
    script = (CODE_ROOT / script_name).resolve()
    if CODE_ROOT not in script.parents or not script.is_file():
        return fail("script must stay under /run/input/code")
    namespace = job.get("artifact_namespace")
    if not isinstance(namespace, str) or not namespace.startswith("v31/"):
        return fail("artifact_namespace must use the v31/ prefix")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "HOME": "/tmp",
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "STOCKQUANT_ARTIFACT_NAMESPACE": namespace,
        "STOCKQUANT_OUTPUT_DIR": str(OUTPUT_ROOT),
    }
    timeout = int(job.get("timeout_seconds", 300))
    if timeout < 1 or timeout > 3600:
        return fail("timeout_seconds must be between 1 and 3600")
    try:
        completed = subprocess.run(
            [sys.executable, str(script)],
            cwd=str(CODE_ROOT),
            env=env,
            check=False,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return fail("runner timeout")
    status = "COMPLETED" if completed.returncode == 0 else "FAILED"
    print(json.dumps({"status": status, "exit_code": completed.returncode}, sort_keys=True))
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
