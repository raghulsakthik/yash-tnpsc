from dataclasses import dataclass

@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 5
    base_delay: float = 2.0
    max_delay: float = 60.0
    def delay(self, attempt: int) -> float:
        return min(self.max_delay, self.base_delay * (2 ** max(0, attempt - 1)))
    def retryable(self, error: str) -> bool:
        e=error.lower()
        return not any(x in e for x in ('http-401','http-403','http-404','unsupported-url-scheme','emergency disk stop'))
