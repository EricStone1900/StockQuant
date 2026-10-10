import hashlib
import hmac
import base64
import json
import math
import os
import re
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

MAX_BODY_BYTES = 1_048_576
MAX_ROWS = 10_000
MAX_FEATURES = 16


def _timestamp(value, field):
    if not isinstance(value, str) or not value.endswith("Z") and not re.search(r"[+-]\d{2}:\d{2}$", value):
        raise ValueError(f"{field} must be an ISO-8601 timestamp with an explicit UTC offset")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError as exc:
        raise ValueError(f"{field} must be a valid ISO-8601 timestamp") from exc


def validate_temporal_metadata(metadata, ranges):
    if metadata is None:
        return "NOT_RUN"
    if not isinstance(metadata, list) or not metadata:
        raise ValueError("temporalMetadata must contain one row per sample")
    parsed = []
    for index, row in enumerate(metadata):
        if not isinstance(row, dict) or set(row) != {"decisionAt", "featureAvailableAt", "labelAvailableAt"}:
            raise ValueError(f"temporalMetadata[{index}] fields are invalid")
        decision = _timestamp(row["decisionAt"], f"temporalMetadata[{index}].decisionAt")
        feature_available = _timestamp(row["featureAvailableAt"], f"temporalMetadata[{index}].featureAvailableAt")
        label_available = _timestamp(row["labelAvailableAt"], f"temporalMetadata[{index}].labelAvailableAt")
        if feature_available > decision:
            raise ValueError(f"feature data is not available at decision for row {index}")
        if label_available < decision:
            raise ValueError(f"label availability precedes decision for row {index}")
        if parsed and decision < parsed[-1][0]:
            raise ValueError("decisionAt timestamps must be non-decreasing")
        parsed.append((decision, label_available))
    if ranges[-1][1] != len(parsed):
        raise ValueError("temporalMetadata row count must match featureRows")
    for prior, following in ((ranges[0], ranges[1]), (ranges[1], ranges[2])):
        cutoff = parsed[following[0]][0]
        if any(parsed[index][1] >= cutoff for index in range(prior[0], prior[1])):
            raise ValueError("prior split labels are not strictly available before the next split begins")
    return "PASS"


def parse_fit_fixture(value):
    required = {"schemaVersion", "sourceMode", "featureRows", "labels", "splits"}
    if not isinstance(value, dict) or not required.issubset(value) or set(value) - required - {"temporalMetadata"}:
        raise ValueError("fit request fields are invalid")
    if value["schemaVersion"] != "qlib-fit-fixture-v1" or value["sourceMode"] != "FIXTURE":
        raise ValueError("only the versioned FIXTURE model-fit path is enabled")
    features, labels = value["featureRows"], value["labels"]
    if not isinstance(features, list) or not isinstance(labels, list) or len(features) != len(labels) or not (30 <= len(features) <= MAX_ROWS):
        raise ValueError("featureRows and labels must have the same row count between 30 and 10000")
    if not isinstance(features[0], list) or not (1 <= len(features[0]) <= MAX_FEATURES):
        raise ValueError("featureRows must contain 1 to 16 numeric features per row")
    feature_count = len(features[0])
    if any(not isinstance(row, list) or len(row) != feature_count or any(isinstance(item, bool) or not isinstance(item, (int, float)) or not math.isfinite(item) for item in row) for row in features):
        raise ValueError("featureRows contain inconsistent dimensions or non-finite values")
    if any(isinstance(label, bool) or not isinstance(label, (int, float)) or not math.isfinite(label) for label in labels):
        raise ValueError("labels must be finite numbers")
    splits = value["splits"]
    if not isinstance(splits, dict) or set(splits) != {"train", "valid", "test"}:
        raise ValueError("train, valid, and test splits are required")
    ranges = []
    for name in ("train", "valid", "test"):
        segment = splits[name]
        if not isinstance(segment, list) or len(segment) != 2 or any(type(index) is not int for index in segment):
            raise ValueError(f"{name} split must be a pair of integer offsets")
        start, end = segment
        if end <= start:
            raise ValueError(f"{name} split must be non-empty")
        ranges.append((start, end))
    if ranges != [(0, ranges[0][1]), (ranges[0][1], ranges[1][1]), (ranges[1][1], len(features))] or ranges[-1][1] != len(features):
        raise ValueError("splits must be contiguous, ordered, non-overlapping, and cover all rows")
    if ranges[0][1] < 20 or ranges[1][1] - ranges[1][0] < 5 or ranges[2][1] - ranges[2][0] < 5:
        raise ValueError("train requires at least 20 rows; valid and test require at least 5 rows each")
    validate_temporal_metadata(value.get("temporalMetadata"), ranges)
    return features, labels, ranges


def fit_fixture_with_qlib(body):
    try:
        test_delay_ms = int(os.environ.get("STOCKQUANT_TEST_FIT_DELAY_MS", "0"))
    except ValueError as exc:
        raise ValueError("test fit delay must be an integer from 0 to 10000 milliseconds") from exc
    if test_delay_ms < 0 or test_delay_ms > 10_000:
        raise ValueError("test fit delay must be an integer from 0 to 10000 milliseconds")
    if test_delay_ms:
        time.sleep(test_delay_ms / 1000)
    features, labels, ranges = parse_fit_fixture(body)
    temporal_validation = validate_temporal_metadata(body.get("temporalMetadata"), ranges)
    import numpy as np
    import pandas as pd
    import qlib
    import lightgbm
    from qlib.config import REG_CN
    from qlib.contrib.model.gbdt import LGBModel
    from qlib.workflow import R

    class InMemoryDataset:
        segments = {name: bounds for name, bounds in zip(("train", "valid", "test"), ranges)}

        def prepare(self, segment, col_set, data_key=None):
            start, end = self.segments[segment]
            index = pd.MultiIndex.from_product([["FIXTURE"], range(start, end)], names=["instrument", "datetime"])
            columns = pd.MultiIndex.from_tuples(
                [("feature", f"f{index}") for index in range(len(features[0]))] + [("label", "LABEL")]
            )
            frame = pd.DataFrame(np.column_stack((features[start:end], labels[start:end])), index=index, columns=columns)
            return frame["feature"] if col_set == "feature" else frame.loc[:, ["feature", "label"]]

    qlib.init(
        provider_uri={"1d": "/tmp/stockquant-qlib-provider"},
        region=REG_CN,
        exp_manager={
            "class": "MLflowExpManager",
            "module_path": "qlib.workflow.expm",
            "kwargs": {"uri": "sqlite:////tmp/stockquant-qlib-tracking.db", "default_exp_name": "stockquant-fixture-fit"},
        },
    )
    evaluation = {}
    with R.start(experiment_name="stockquant-fixture-fit"):
        model = LGBModel(
            loss="mse", early_stopping_rounds=2, num_boost_round=3,
            num_threads=1, num_leaves=7, min_data_in_leaf=1, verbosity=-1, seed=20260927,
        )
        model.fit(InMemoryDataset(), verbose_eval=False, evals_result=evaluation)
        predictions = model.predict(InMemoryDataset(), segment="test").to_numpy(dtype=float)
        serialized_model = model.model.model_to_string().encode("utf-8")
    if len(predictions) != ranges[2][1] - ranges[2][0] or not np.isfinite(predictions).all():
        raise RuntimeError("Qlib returned an invalid test prediction vector")
    prediction_json = json.dumps(predictions.tolist(), separators=(",", ":"), allow_nan=False)
    return {
        "schemaVersion": "qlib-fit-fixture-result-v1",
        "status": "COMPLETED",
        "sourceMode": "FIXTURE",
        "modelTraining": "PASS",
        "modelValidation": "NOT_RUN",
        "temporalValidation": temporal_validation,
        "candidateSourceExecution": "NOT_PERFORMED",
        "qlibVersion": getattr(qlib, "__version__", "unknown"),
        "lightgbmVersion": lightgbm.__version__,
        "model": "qlib.contrib.model.gbdt.LGBModel",
        "segments": {name: {"start": bounds[0], "end": bounds[1], "rows": bounds[1] - bounds[0]} for name, bounds in zip(("train", "valid", "test"), ranges)},
        "testPredictionCount": int(len(predictions)),
        "testPredictionsFinite": True,
        "testPredictionsSha256": hashlib.sha256(prediction_json.encode("utf-8")).hexdigest(),
        "modelSha256": hashlib.sha256(serialized_model).hexdigest(),
        "modelArtifactBase64": base64.b64encode(serialized_model).decode("ascii"),
        "testPredictionsCanonicalJson": prediction_json,
        "testPredictions": [float(value) for value in predictions.tolist()],
        "evaluationMetrics": evaluation,
        "tracking": "temporary SQLite under /tmp; removed with the worker container",
        "profitabilityClaim": "NOT_MADE",
    }


def run_fixed_rdagent_compatibility_probe():
    """Execute only this worker's fixed compatibility snippet; no caller code is accepted."""
    source = "value = sum((19, 23))\n"
    namespace = {}
    exec(compile(source, "<stockquant-fixed-rdagent-probe>", "exec"), {"__builtins__": {"sum": sum}}, namespace)
    value = namespace.get("value")
    return {
        "status": "READY" if value == 42 else "FAILED",
        "result": "fixed-probe-ok" if value == 42 else "fixed-probe-failed",
        "value": value if type(value) is int else None,
        "sourceSha256": hashlib.sha256(source.encode()).hexdigest(),
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        payload = json.dumps(body, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def authorized_quant_service(self):
        expected = os.getenv("STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE", "").strip()
        supplied = self.headers.get("authorization", "")
        service_id = self.headers.get("x-stockquant-service-id", "")
        if len(expected) < 32:
            self.send_json(503, {"status": "NOT_RUN", "reason": "quant-research-service Worker identity is not configured"})
            return False
        if service_id != "quant-research-service" or not supplied.startswith("Bearer ") or not hmac.compare_digest(supplied[7:], expected):
            self.send_json(403, {"status": "FORBIDDEN", "reason": "quant-research-service identity or route scope is not allowed"})
            return False
        return True

    def do_GET(self):
        if self.path != "/probe":
            self.send_json(404, {"status": "NOT_FOUND"})
            return
        if not self.authorized_quant_service():
            return
        code_probe = run_fixed_rdagent_compatibility_probe()
        docker_socket_mounted = os.path.exists("/var/run/docker.sock")
        try:
            import qlib
            import lightgbm
            from qlib.contrib.model.gbdt import LGBModel
            body = {"status": "READY", "version": getattr(qlib, "__version__", "unknown"), "modelBackend": f"{LGBModel.__module__}.{LGBModel.__name__}", "lightgbmVersion": lightgbm.__version__, "smoke": "qlib-model-import-ok", "codeProbe": code_probe, "dockerSocketMounted": docker_socket_mounted}
            self.send_json(200, body)
        except Exception as exc:
            self.send_json(200, {"status": "NOT_RUN", "detail": str(exc), "codeProbe": code_probe, "dockerSocketMounted": docker_socket_mounted})

    def do_POST(self):
        if self.path not in ("/train", "/validate", "/qlib/fit-fixture"):
            self.send_json(404, {"status": "NOT_FOUND"})
            return
        if not self.authorized_quant_service():
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                self.send_json(413 if length > MAX_BODY_BYTES else 422, {"status": "REJECTED", "reason": "request body length is invalid or exceeds 1 MiB"})
                return
            body = json.loads(self.rfile.read(length))
            if self.path == "/qlib/fit-fixture":
                try:
                    self.send_json(200, fit_fixture_with_qlib(body))
                except (ImportError, ModuleNotFoundError, OSError) as exc:
                    self.send_json(503, {"status": "NOT_RUN", "reason": "Qlib runtime is unavailable", "detail": str(exc)})
                except ValueError as exc:
                    self.send_json(422, {"status": "REJECTED", "reason": str(exc)})
                except Exception as exc:
                    self.send_json(500, {"status": "FAILED", "reason": str(exc)})
                return
            bars = body.get("bars", [])
            if len(bars) < 3:
                raise ValueError("at least 3 bars are required for train/validation/test splits")
            n = len(bars)
            train_end = max(1, int(n * 0.6))
            valid_end = max(train_end + 1, int(n * 0.8))
            if valid_end >= n:
                valid_end = n - 1
            def mean(items):
                return sum(float(item["open"]) for item in items) / len(items)
            artifact = {"algorithm": "open-price-mean-summary", "dataMode": "FIXTURE", "splits": {"train": [0, train_end], "validation": [train_end, valid_end], "test": [valid_end, n]}, "means": {"train": mean(bars[:train_end]), "validation": mean(bars[train_end:valid_end]), "test": mean(bars[valid_end:])}}
            artifact["artifactHash"] = hashlib.sha256(json.dumps(artifact, sort_keys=True).encode()).hexdigest()
            if self.path == "/validate":
                expected = body.get("artifactHash")
                valid = expected == artifact["artifactHash"]
                payload = {"status": "HASH_MATCH" if valid else "HASH_MISMATCH", "method": "FIXTURE_SUMMARY_HASH_RECOMPUTATION", "independentModelValidation": "NOT_RUN", "expectedHash": expected, "recomputedHash": artifact["artifactHash"], "assertionId": "V2.3-FIXTURE-SUMMARY-HASH-001"}
            else:
                payload = {"status": "FIXTURE_ONLY", "adapter": "fixture-summary", "modelTraining": "NOT_RUN", "modelCalls": "NOT_RUN", "environmentMode": "BACKTEST", "dataMode": "FIXTURE", "artifact": artifact}
            self.send_json(200, payload)
        except Exception as exc:
            self.send_json(422, {"status": "REJECTED", "reason": str(exc)})


if __name__ == "__main__":
    HTTPServer((os.getenv("QLIB_BIND_HOST", "0.0.0.0"), int(os.getenv("QLIB_PORT", "3004"))), Handler).serve_forever()
