#!/usr/bin/env python3
"""Independent stdlib-only recomputation of the frozen V3.2 synthetic SMA fixture."""

import csv
import json
import math
import sys
from datetime import datetime
from pathlib import Path


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def recompute(root: Path):
    design = load_json(root / "validation-design.json")
    candidate = load_json(root / "candidate.json")
    if candidate.get("schemaVersion") != "v3.2-deterministic-sma-candidate-v1":
        raise ValueError("unsupported candidate schema")
    if candidate.get("sourceMode") != "FIXTURE" or candidate.get("algorithm") != "SMA_CROSS":
        raise ValueError("only the frozen FIXTURE SMA_CROSS candidate is supported")
    fast_window = candidate.get("parameters", {}).get("fastWindow")
    slow_window = candidate.get("parameters", {}).get("slowWindow")
    if fast_window != design["checks"]["rules"]["fastWindow"] or slow_window != design["checks"]["rules"]["slowWindow"]:
        raise ValueError("candidate windows do not match the frozen validation design")
    if candidate.get("signalTiming") != "CLOSE_T_AVAILABLE_AT_T; EXECUTE_AT_NEXT_SESSION_OPEN":
        raise ValueError("candidate timing does not match the frozen execution contract")

    series = {}
    with (root / "daily-bars.csv").open(newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != ["security", "date", "availableAt", "open", "high", "low", "close", "volume"]:
            raise ValueError("unexpected daily bar header")
        for row in reader:
            bar = {
                "security": row["security"], "date": row["date"], "availableAt": row["availableAt"],
                "open": float(row["open"]), "high": float(row["high"]), "low": float(row["low"]),
                "close": float(row["close"]), "volume": int(row["volume"]),
            }
            if any(not math.isfinite(bar[key]) or bar[key] <= 0 for key in ("open", "high", "low", "close")) or bar["volume"] <= 0:
                raise ValueError(f"invalid OHLCV values on {bar['security']} {bar['date']}")
            if not (bar["low"] <= min(bar["open"], bar["close"]) <= max(bar["open"], bar["close"]) <= bar["high"]):
                raise ValueError(f"inconsistent OHLC values on {bar['security']} {bar['date']}")
            rows = series.setdefault(bar["security"], [])
            if rows and rows[-1]["date"] >= bar["date"]:
                raise ValueError(f"non-chronological or duplicate session for {bar['security']}")
            rows.append(bar)

    test_start, test_end = design["split"]["test"]
    if not series or any(len(rows) < test_end for rows in series.values()):
        raise ValueError("fixture does not cover the frozen test window")
    checks = design["checks"]
    commission = float(checks["cost"]["commissionBpsPerSide"])
    slippage = float(checks["cost"]["slippageBpsPerSide"])
    max_participation = float(checks["capacity"]["maximumParticipation"])
    if not (math.isfinite(max_participation) and 0 < max_participation <= 1):
        raise ValueError("invalid frozen maximum participation")
    cost_rate = (commission + slippage) / 10000
    initial_capital = 100000
    quantity = 100
    trades = []
    gross_pnl = 0.0
    total_fees = 0.0
    pit_violations = []
    capacity_violations = []
    decisions_checked = 0

    for security, rows in sorted(series.items()):
        held = False
        entry_price = 0.0
        for index in range(test_start, test_end - 1):
            current = rows[index]
            cutoff = f"{current['date']}T16:00:00+08:00"
            decisions_checked += 1
            try:
                if datetime.fromisoformat(current["availableAt"]) > datetime.fromisoformat(cutoff):
                    pit_violations.append(f"{security}:{current['date']}:feature-after-decision")
            except ValueError:
                pit_violations.append(f"{security}:{current['date']}:invalid-availability-time")
            if current["availableAt"] != cutoff:
                pit_violations.append(f"{security}:{current['date']}:availability-contract-mismatch")
            history = rows[index - slow_window + 1:index + 1]
            if len(history) != slow_window or any(bar["availableAt"] > cutoff for bar in history):
                pit_violations.append(f"{security}:{current['date']}:future-or-incomplete-history")
                continue
            fast = sum(bar["close"] for bar in history[-fast_window:]) / fast_window
            slow = sum(bar["close"] for bar in history) / slow_window
            target_held = fast > slow
            if target_held == held:
                continue
            execution = rows[index + 1]
            participation = quantity / execution["volume"]
            if participation > max_participation:
                capacity_violations.append(f"{security}:{execution['date']}:{participation}")
            fee = quantity * execution["open"] * cost_rate
            total_fees += fee
            side = "BUY" if target_held else "SELL"
            if target_held:
                entry_price = execution["open"]
                held = True
            else:
                gross_pnl += quantity * (execution["open"] - entry_price)
                held = False
            trades.append({"security": security, "decisionDate": current["date"], "executionDate": execution["date"], "side": side,
                           "quantity": quantity, "executionOpen": execution["open"], "realizedVolume": execution["volume"],
                           "participation": participation, "fee": fee})
        if held:
            gross_pnl += quantity * (rows[test_end - 1]["close"] - entry_price)

    return {
        "decisionsChecked": decisions_checked,
        "ordersSubmitted": len(trades),
        "trades": trades,
        "grossReturn": gross_pnl / initial_capital,
        "netReturn": (gross_pnl - total_fees) / initial_capital,
        "totalFees": total_fees,
        "pitViolations": pit_violations,
        "capacityViolations": capacity_violations,
        "maximumParticipation": max_participation,
    }


if __name__ == "__main__":
    fixture_root = Path(sys.argv[1]).resolve()
    print(json.dumps(recompute(fixture_root), sort_keys=True, separators=(",", ":"), allow_nan=False))
