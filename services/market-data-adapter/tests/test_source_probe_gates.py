"""Every standalone real-source probe must block before network access by default."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class SourceProbeGateTests(unittest.TestCase):
    def test_provider_probes_block_without_source_authorization(self):
        commands = [
            [sys.executable, "scripts/probe-minute-source-capability.py"],
            [sys.executable, "scripts/probe-baostock-stability.py"],
            [sys.executable, "scripts/probe-tdx-minute-capability.py", "--start-date", "2026-09-30", "--end-date", "2026-09-30"],
            [sys.executable, "scripts/probe-baostock.py"],
            [sys.executable, "scripts/probe-baostock-pit.py"],
        ]
        env = os.environ.copy()
        for key in (
            "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
            "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
            "STOCKQUANT_COLLECTION_DATA_VERSION",
            "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
            "STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED",
            "STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF",
            "STOCKQUANT_MARKET_RESEARCH_DATA_VERSION",
            "STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS",
        ):
            env.pop(key, None)
        for command in commands:
            with self.subTest(command=command[1]):
                completed = subprocess.run(command, cwd=REPOSITORY_ROOT, capture_output=True, text=True, timeout=5, check=False, env=env)
                self.assertEqual(completed.returncode, 2, completed.stderr + completed.stdout)
                payload = json.loads(completed.stdout)
                self.assertEqual(payload["status"], "BLOCKED")
                self.assertTrue(payload["blockedBeforeNetwork"])

    def test_importers_block_before_network_and_before_creating_output(self):
        env = os.environ.copy()
        for key in (
            "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
            "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
            "STOCKQUANT_COLLECTION_DATA_VERSION",
            "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
            "STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED",
            "STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF",
            "STOCKQUANT_MARKET_RESEARCH_DATA_VERSION",
            "STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS",
        ):
            env.pop(key, None)
        with tempfile.TemporaryDirectory() as directory:
            output_daily = Path(directory) / "daily"
            output_minute = Path(directory) / "minute"
            commands = [
                [sys.executable, "scripts/import-baostock-daily.py", "--output-dir", str(output_daily)],
                [sys.executable, "scripts/import-baostock-minute-sample.py", "--source-manifest", str(Path(directory) / "missing.json"), "--output-dir", str(output_minute)],
            ]
            for command in commands:
                with self.subTest(command=command[1]):
                    completed = subprocess.run(command, cwd=REPOSITORY_ROOT, capture_output=True, text=True, timeout=5, check=False, env=env)
                    self.assertEqual(completed.returncode, 2, completed.stderr + completed.stdout)
                    payload = json.loads(completed.stdout)
                    self.assertEqual(payload["status"], "BLOCKED")
                    self.assertTrue(payload["blockedBeforeNetwork"])
                    self.assertTrue(payload["beforeOutputWrite"])
            self.assertFalse(output_daily.exists())
            self.assertFalse(output_minute.exists())

    def test_tdx_boundary_diagnostic_blocks_without_loading_provider_or_writing_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "boundary.json"
            env = os.environ.copy()
            for key in (
                "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
                "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
                "STOCKQUANT_COLLECTION_DATA_VERSION",
                "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
            ):
                env.pop(key, None)
            completed = subprocess.run(
                [sys.executable, "scripts/diagnose-tdx-lunch-boundary.py", "--output", str(output)],
                cwd=REPOSITORY_ROOT, capture_output=True, text=True, timeout=5, check=False, env=env,
            )
            self.assertEqual(completed.returncode, 2)
            self.assertEqual(json.loads(completed.stdout)["status"], "BLOCKED")
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
