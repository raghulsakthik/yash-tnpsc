from __future__ import annotations
import asyncio, random
from dataclasses import dataclass
from urllib.parse import urlparse
from .policy import RetryPolicy

@dataclass(frozen=True)
class RetryResult:
    attempts: int
    status: str
    error: str | None = None

class HostRateLimiter:
    def __init__(self, requests_per_second: float = 1.0):
        self.interval = 1.0 / max(requests_per_second, 0.1)
        self._locks: dict[str, asyncio.Lock] = {}
        self._last: dict[str, float] = {}

    async def wait(self, url: str) -> None:
        import time
        host = urlparse(url).netloc.lower()
        lock = self._locks.setdefault(host, asyncio.Lock())
        async with lock:
            now = time.monotonic()
            delay = self.interval - (now - self._last.get(host, 0.0))
            if delay > 0:
                await asyncio.sleep(delay)
            self._last[host] = time.monotonic()

class RecoveryManager:
    def __init__(self, policy: RetryPolicy | None = None, concurrency: int = 2, rate_limit_rps: float = 1.0):
        self.policy = policy or RetryPolicy()
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.limiter = HostRateLimiter(rate_limit_rps)

    async def run(self, operation, url: str) -> tuple[object, RetryResult]:
        last_error = None
        async with self.semaphore:
            for attempt in range(1, self.policy.max_attempts + 1):
                await self.limiter.wait(url)
                try:
                    result = await operation()
                    status = getattr(result, 'status', None)
                    error = getattr(result, 'error', None)
                    if status not in ('failed', 'blocked') or not self.policy.retryable(error or ''):
                        return result, RetryResult(attempt, status or 'unknown', error)
                    last_error = error or 'retryable-failure'
                except Exception as exc:
                    last_error = f'{type(exc).__name__}: {exc}'
                    if not self.policy.retryable(last_error):
                        break
                if attempt < self.policy.max_attempts:
                    base = self.policy.delay(attempt)
                    await asyncio.sleep(base * (0.8 + random.random() * 0.4))
        return None, RetryResult(self.policy.max_attempts, 'failed', last_error)
