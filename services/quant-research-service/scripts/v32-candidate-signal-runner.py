#!/usr/bin/env python3
"""Execute the frozen V3.2 Fixture candidate in an isolated, read-only container."""

import csv
import hashlib
import json
import math
import os
import sys
from pathlib import Path

FROZEN_SOURCE = "def signal(closes, fast=5, slow=20): return sum(closes[-fast:])/fast > sum(closes[-slow:])/slow"
FROZEN_SOURCE_SHA256 = "9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff"
FROZEN_CANDIDATE_SHA256 = "ab09b5e966c0e5c179dc423a56250e08354cc20795ba12761cfab8b98ea707d4"


def read_first(paths):
    for path in paths:
        try:
            return Path(path).read_text(encoding="utf-8").strip()
        except OSError:
            pass
    raise RuntimeError(f"required cgroup observation unavailable: {paths}")


def isolation():
    mounts = [line.split() for line in Path("/proc/mounts").read_text().splitlines()]
    root = next((row for row in mounts if row[1] == "/"), None)
    if root is None or "ro" not in root[3].split(","):
        raise RuntimeError("candidate root filesystem is not read-only")
    for point in ("/fixtures", "/inputs/promotion-request.json", "/candidate/run.py"):
        row = next((item for item in mounts if item[1] == point), None)
        if row is None or "ro" not in row[3].split(","):
            raise RuntimeError(f"candidate input mount is not read-only: {point}")
    uid = os.getuid()
    if uid != 65532:
        raise RuntimeError(f"candidate runner uid mismatch: {uid}")
    memory = int(read_first(("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes")))
    if memory != 268435456:
        raise RuntimeError(f"candidate memory cgroup mismatch: {memory}")
    try:
        quota, period = read_first(("/sys/fs/cgroup/cpu.max",)).split()
        cpus = int(quota) / int(period) if quota != "max" else math.inf
    except (OSError, ValueError):
        cpus = int(read_first(("/sys/fs/cgroup/cpu/cpu.cfs_quota_us",))) / int(read_first(("/sys/fs/cgroup/cpu/cpu.cfs_period_us",)))
    pids = int(read_first(("/sys/fs/cgroup/pids.max", "/sys/fs/cgroup/pids/pids.max")))
    if cpus <= 0 or cpus > 1 or pids != 64:
        raise RuntimeError(f"candidate CPU/PID cgroup mismatch: cpus={cpus}, pids={pids}")
    routes = [line for line in Path("/proc/net/route").read_text().strip().splitlines()[1:] if line.strip()]
    ipv6 = [line for line in Path("/proc/net/if_inet6").read_text().splitlines() if line.strip()]
    if routes or any(line.split()[-1] != "lo" for line in ipv6):
        raise RuntimeError("candidate container has a non-loopback route or IPv6 address")
    counters = []
    for line in Path("/proc/net/dev").read_text().splitlines()[2:]:
        if not line.strip():
            continue
        name, raw = line.split(":", 1)
        counters.append((name.strip(), [int(value) for value in raw.split()]))
    interfaces = []
    for path in Path("/sys/class/net").iterdir():
        try:
            interfaces.append((path.name, (path / "operstate").read_text().strip()))
        except OSError:
            continue
    if not any(name == "lo" for name, _ in interfaces) or any(name != "lo" and state != "down" for name, state in interfaces):
        raise RuntimeError(f"candidate container has an active non-loopback interface: {interfaces}")
    if any(name != "lo" and any(counters) for name, counters in counters):
        raise RuntimeError("candidate container has non-loopback network traffic")
    return {"uid": uid, "rootFilesystem": "read-only", "inputs": "read-only", "network": "none", "routes": len(routes), "ipv6Addresses": len(ipv6), "nonLoopbackTrafficBytes": sum(values[0] + values[8] for name, values in counters if name != "lo"), "memoryBytes": memory, "cpuQuota": cpus, "pidsMax": pids}


def main():
    sandbox = isolation()
    fixture_root = Path(sys.argv[1]).resolve()
    request_path = Path(sys.argv[2]).resolve()
    candidate_path = Path(sys.argv[3]).resolve()
    request_data = json.loads(request_path.read_text(encoding="utf-8"))
    request = request_data["request"]
    if request.get("candidateSource") != "FIXTURE":
        raise ValueError("only FIXTURE candidate source is supported")
    candidate_bytes = candidate_path.read_bytes()
    candidate = json.loads(candidate_bytes)
    code = candidate.get("sourceCode")
    code_sha256 = hashlib.sha256(code.encode("utf-8")).hexdigest()
    if code != FROZEN_SOURCE or code_sha256 != FROZEN_SOURCE_SHA256 or hashlib.sha256(candidate_bytes).hexdigest() != FROZEN_CANDIDATE_SHA256:
        raise ValueError("candidate code or artifact is not the exact allowlisted frozen fixture")
    if request.get("codeSha256") != code_sha256 or request.get("candidateArtifact", {}).get("sha256") != hashlib.sha256(candidate_bytes).hexdigest():
        raise ValueError("PromotionRequest source hashes do not match the candidate input")
    if candidate.get("schemaVersion") != "v3.2-deterministic-sma-candidate-v1" or candidate.get("sourceMode") != "FIXTURE" or candidate.get("algorithm") != "SMA_CROSS":
        raise ValueError("unsupported fixture candidate contract")
    params = candidate.get("parameters", {})
    fast = params.get("fastWindow")
    slow = params.get("slowWindow")
    if type(fast) is not int or type(slow) is not int or fast <= 0 or fast >= slow:
        raise ValueError("invalid SMA window parameters")
    namespace = {}
    exec(compile(code, "<candidate-source>", "exec"), namespace, namespace)
    signal = namespace.get("signal")
    if not callable(signal):
        raise ValueError("candidate did not define signal(closes, fast, slow)")
    design = json.loads((fixture_root / "validation-design.json").read_text(encoding="utf-8"))
    test_start, test_end = design["split"]["test"]
    series = {}
    with (fixture_root / "daily-bars.csv").open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            series.setdefault(row["security"], []).append({"date": row["date"], "close": float(row["close"])})
    decisions = []
    for security in sorted(series):
        bars = series[security]
        for index in range(test_start, test_end - 1):
            closes = [bar["close"] for bar in bars[: index + 1]]
            output = signal(closes, fast, slow)
            if type(output) is not bool:
                raise ValueError(f"candidate signal must return bool at {security}:{bars[index]['date']}")
            decisions.append({"security": security, "index": index, "date": bars[index]["date"], "targetHeld": output})
    print(json.dumps({"status": "PASS", "promotionRequestId": request.get("promotionRequestId"), "testRunId": request.get("testRunId"), "candidateCodeSha256": code_sha256, "candidateSourceExecution": "EXECUTED_IN_ISOLATED_CONTAINER", "decisionCount": len(decisions), "decisions": decisions, "isolation": sandbox}, separators=(",", ":"), sort_keys=True))


if __name__ == "__main__":
    main()
