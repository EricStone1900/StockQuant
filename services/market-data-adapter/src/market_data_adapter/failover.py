from __future__ import annotations

import time
import json
import os
import fcntl
import random
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Callable, Protocol, Sequence


@dataclass(frozen=True)
class NormalizedBar:
    security_id: str
    bar_start: str
    bar_end: str
    available_at: str | None
    open: str
    high: str
    low: str
    close: str
    volume: str
    amount: str | None
    adjustment: str
    source_id: str


class SourceError(RuntimeError):
    def __init__(self, code: str, message: str, retryable: bool = True) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class AllSourcesFailed(SourceError):
    def __init__(self, attempts: list[dict[str, object]]) -> None:
        codes = [str(item.get("code")) for item in attempts if item.get("code")]
        out_of_range = bool(codes) and all(code == "EMPTY_RESULT" for code in codes)
        super().__init__("OUT_OF_SOURCE_RANGE" if out_of_range else "ALL_SOURCES_FAILED", "all configured minute sources returned no bars" if out_of_range else "all configured minute sources failed", retryable=not out_of_range)
        self.attempts = attempts


class SourceClient(Protocol):
    def fetch(self, security_ids: Sequence[str], start: str, end: str, timeout_seconds: float) -> list[NormalizedBar]: ...


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 300.0, clock: Callable[[], float] = time.monotonic) -> None:
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.clock = clock
        self.failures = 0
        self.state = "CLOSED"
        self.opened_at: float | None = None

    def allow(self) -> None:
        if self.state != "OPEN":
            return
        assert self.opened_at is not None
        if self.clock() - self.opened_at < self.cooldown_seconds:
            raise SourceError("CIRCUIT_OPEN", "source circuit is cooling down", retryable=False)
        self.state = "HALF_OPEN"

    def success(self) -> None:
        self.failures = 0
        self.state = "CLOSED"
        self.opened_at = None

    def failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            self.opened_at = self.clock()


class RateLimiter:
    def __init__(self, minimum_interval_seconds: float = 1.0, clock: Callable[[], float] = time.monotonic, sleeper: Callable[[float], None] = time.sleep, state_path: str | None = None, key: str = "default", wall_clock: Callable[[], float] = time.time) -> None:
        self.minimum_interval_seconds = minimum_interval_seconds
        self.clock = clock
        self.sleeper = sleeper
        self.last_request: float | None = None
        self.state_path = state_path
        self.key = key
        # The in-process clock remains monotonic, but persisted timestamps must
        # survive a host/container reboot.  Callers can inject this clock for
        # deterministic tests.
        self.wall_clock = wall_clock

    def wait(self) -> None:
        if self.state_path:
            directory = os.path.dirname(self.state_path)
            if directory:
                os.makedirs(directory, exist_ok=True)
            with open(self.state_path, "a+", encoding="utf-8") as handle:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
                try:
                    handle.seek(0)
                    try:
                        state = json.load(handle)
                    except (json.JSONDecodeError, OSError):
                        state = {}
                    previous = state.get(self.key)
                    previous_at = None
                    if isinstance(previous, dict) and previous.get("clock") == "unix":
                        candidate = previous.get("at")
                        if isinstance(candidate, (int, float)):
                            previous_at = float(candidate)
                        now = self.wall_clock()
                    elif isinstance(previous, (int, float)):
                        # Migrate the old monotonic format safely.  A reboot
                        # can make the new monotonic value smaller than the
                        # persisted one; that old value must not cause a
                        # multi-hour sleep.
                        previous_at = float(previous)
                        now = self.clock()
                        if now < previous_at:
                            previous_at = None
                    else:
                        now = self.wall_clock()
                    if previous_at is not None:
                        remaining = self.minimum_interval_seconds - (now - previous_at)
                        if remaining > 0:
                            self.sleeper(remaining)
                    state[self.key] = {"at": self.wall_clock(), "clock": "unix"}
                    handle.seek(0)
                    handle.truncate()
                    json.dump(state, handle)
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            return
        now = self.clock()
        if self.last_request is not None:
            remaining = self.minimum_interval_seconds - (now - self.last_request)
            if remaining > 0:
                self.sleeper(remaining)
        self.last_request = self.clock()


@dataclass
class _Provider:
    source_id: str
    client: SourceClient
    breaker: CircuitBreaker
    limiter: RateLimiter
    last_success_at: float | None = None
    last_failure_at: float | None = None
    last_error_code: str | None = None


class FailoverCollector:
    def __init__(self, providers: Sequence[tuple[str, SourceClient]], timeout_seconds: float = 30.0, max_attempts: int = 3, backoff_seconds: float = 5.0, sleeper: Callable[[float], None] = time.sleep, clock: Callable[[], float] = time.monotonic, health_path: str | None = None, backoff_jitter_seconds: float = 0.0) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_attempts = max_attempts
        self.backoff_seconds = backoff_seconds
        self.sleeper = sleeper
        self.clock = clock
        self.health_path = health_path
        self.backoff_jitter_seconds = max(0.0, backoff_jitter_seconds)
        rate_path = f"{health_path}.rate" if health_path else None
        self.providers = [_Provider(source, client, CircuitBreaker(clock=clock), RateLimiter(clock=clock, sleeper=sleeper, state_path=rate_path, key=f"rate:{source}")) for source, client in providers]
        self._health_dirty: set[str] = set()
        self._load_health()

    def _load_health(self) -> None:
        if not self.health_path or not os.path.exists(self.health_path):
            return
        try:
            with open(self.health_path, encoding="utf-8") as handle:
                state = json.load(handle)
            for provider in self.providers:
                saved = state.get(provider.source_id, {})
                provider.breaker.failures = int(saved.get("failures", 0))
                provider.breaker.state = str(saved.get("state", "CLOSED"))
                if provider.breaker.state == "OPEN":
                    elapsed = max(0.0, time.time() - float(saved.get("openedAt", time.time())))
                    provider.breaker.opened_at = self.clock() - elapsed
                provider.last_success_at = saved.get("lastSuccessAt")
                provider.last_failure_at = saved.get("lastFailureAt")
                provider.last_error_code = saved.get("lastErrorCode")
        except (OSError, ValueError, TypeError):
            return

    def _save_health(self) -> None:
        if not self.health_path:
            return
        directory = os.path.dirname(self.health_path) or "."
        os.makedirs(directory, exist_ok=True)
        lock_path = self.health_path + ".lock"
        with open(lock_path, "a+", encoding="utf-8") as lock_handle:
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX)
            state = {}
            try:
                with open(self.health_path, encoding="utf-8") as handle:
                    state = json.load(handle)
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                state = {}
            for provider in self.providers:
                if provider.source_id not in self._health_dirty:
                    continue
                opened_at = None
                if provider.breaker.opened_at is not None:
                    opened_at = time.time() - max(0.0, self.clock() - provider.breaker.opened_at)
                previous = state.get(provider.source_id, {})
                previous_failures = int(previous.get("failures", 0) or 0)
                if provider.breaker.state == "CLOSED":
                    # CLOSED also covers failures below the threshold. Only a
                    # real success may reset persisted failures.
                    succeeded = (
                        provider.last_success_at is not None
                        and (provider.last_failure_at is None or provider.last_success_at >= provider.last_failure_at)
                    )
                    failures = 0 if succeeded else max(provider.breaker.failures, previous_failures)
                    circuit_state = "CLOSED"
                else:
                    # Merge failure observations made by another process while
                    # this worker was running so an older snapshot cannot erase
                    # a concurrent circuit-open event.
                    failures = max(provider.breaker.failures, previous_failures)
                    circuit_state = "OPEN"
                state[provider.source_id] = {
                    "failures": failures,
                    "state": circuit_state,
                    "openedAt": opened_at if circuit_state == "OPEN" else None,
                    "lastSuccessAt": provider.last_success_at,
                    "lastFailureAt": provider.last_failure_at,
                    "lastErrorCode": provider.last_error_code,
                }
            temporary = f"{self.health_path}.{os.getpid()}.tmp"
            with open(temporary, "w", encoding="utf-8") as handle:
                json.dump(state, handle, separators=(",", ":"))
            os.replace(temporary, self.health_path)
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)

    @contextmanager
    def _half_open_guard(self, source_id: str):
        """Allow only one process to run a persisted half-open probe."""
        if not self.health_path:
            yield True
            return
        path = f"{self.health_path}.{source_id}.probe.lock"
        handle = open(path, "a+", encoding="utf-8")
        acquired = False
        try:
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
            except BlockingIOError:
                yield False
                return
            yield True
        finally:
            if acquired:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            handle.close()

    def collect(self, security_ids: Sequence[str], start: str, end: str) -> tuple[str, list[NormalizedBar], list[dict[str, object]]]:
        attempts: list[dict[str, object]] = []
        for provider in self.providers:
            probe_guard = None
            try:
                provider.breaker.allow()
                if provider.breaker.state == "HALF_OPEN":
                    probe_guard = self._half_open_guard(provider.source_id)
                    if not probe_guard.__enter__():
                        attempts.append({"sourceId": provider.source_id, "code": "CIRCUIT_PROBE_IN_PROGRESS", "retryable": False})
                        continue
            except SourceError as error:
                attempts.append({"sourceId": provider.source_id, "code": error.code, "retryable": error.retryable})
                continue
            for attempt in range(1, self.max_attempts + 1):
                provider.limiter.wait()
                try:
                    bars = provider.client.fetch(security_ids, start, end, self.timeout_seconds)
                    if not bars:
                        raise SourceError("EMPTY_RESULT", "source returned no bars")
                    if any(bar.source_id != provider.source_id for bar in bars):
                        raise SourceError("SOURCE_MISMATCH", "normalized bar source does not match adapter", retryable=False)
                    provider.breaker.success()
                    provider.last_success_at = time.time()
                    provider.last_error_code = None
                    self._health_dirty.add(provider.source_id)
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "status": "PASS", "rows": len(bars)})
                    self._save_health()
                    if probe_guard is not None:
                        probe_guard.__exit__(None, None, None)
                    return provider.source_id, bars, attempts
                except SourceError as error:
                    provider.breaker.failure()
                    provider.last_failure_at = time.time()
                    provider.last_error_code = error.code
                    self._health_dirty.add(provider.source_id)
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "code": error.code, "retryable": error.retryable})
                    if not error.retryable or attempt == self.max_attempts:
                        break
                    self.sleeper(self.backoff_seconds * (2 ** (attempt - 1)) + random.uniform(0.0, self.backoff_jitter_seconds))
                except Exception as error:  # noqa: BLE001
                    provider.breaker.failure()
                    provider.last_failure_at = time.time()
                    provider.last_error_code = "ADAPTER_EXCEPTION"
                    self._health_dirty.add(provider.source_id)
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "code": "ADAPTER_EXCEPTION", "error": repr(error), "retryable": True})
                    if attempt < self.max_attempts:
                        self.sleeper(self.backoff_seconds * (2 ** (attempt - 1)) + random.uniform(0.0, self.backoff_jitter_seconds))
            if probe_guard is not None:
                probe_guard.__exit__(None, None, None)
        self._save_health()
        raise AllSourcesFailed(attempts)
