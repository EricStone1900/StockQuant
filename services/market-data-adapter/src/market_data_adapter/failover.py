from __future__ import annotations

import time
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
        super().__init__("ALL_SOURCES_FAILED", "all configured minute sources failed")
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
    def __init__(self, minimum_interval_seconds: float = 1.0, clock: Callable[[], float] = time.monotonic, sleeper: Callable[[float], None] = time.sleep) -> None:
        self.minimum_interval_seconds = minimum_interval_seconds
        self.clock = clock
        self.sleeper = sleeper
        self.last_request: float | None = None

    def wait(self) -> None:
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


class FailoverCollector:
    def __init__(self, providers: Sequence[tuple[str, SourceClient]], timeout_seconds: float = 30.0, max_attempts: int = 3, backoff_seconds: float = 5.0, sleeper: Callable[[float], None] = time.sleep, clock: Callable[[], float] = time.monotonic) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_attempts = max_attempts
        self.backoff_seconds = backoff_seconds
        self.sleeper = sleeper
        self.clock = clock
        self.providers = [_Provider(source, client, CircuitBreaker(clock=clock), RateLimiter(clock=clock, sleeper=sleeper)) for source, client in providers]

    def collect(self, security_ids: Sequence[str], start: str, end: str) -> tuple[str, list[NormalizedBar], list[dict[str, object]]]:
        attempts: list[dict[str, object]] = []
        for provider in self.providers:
            try:
                provider.breaker.allow()
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
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "status": "PASS", "rows": len(bars)})
                    return provider.source_id, bars, attempts
                except SourceError as error:
                    provider.breaker.failure()
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "code": error.code, "retryable": error.retryable})
                    if not error.retryable or attempt == self.max_attempts:
                        break
                    self.sleeper(self.backoff_seconds * attempt)
                except Exception as error:  # noqa: BLE001
                    provider.breaker.failure()
                    attempts.append({"sourceId": provider.source_id, "attempt": attempt, "code": "ADAPTER_EXCEPTION", "error": repr(error), "retryable": True})
                    if attempt < self.max_attempts:
                        self.sleeper(self.backoff_seconds * attempt)
        raise AllSourcesFailed(attempts)
