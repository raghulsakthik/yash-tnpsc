from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import Page

from app.config.settings import BASE_URL
from app.engine.browser.manager import BrowserManager


@dataclass(frozen=True)
class AuthStatus:
    authenticated: bool
    checked_at: float
    current_url: str | None
    reason: str
    profile_path: str


class SessionAuthenticator:
    """Validates an existing browser session without handling credentials."""

    def __init__(self, browser: BrowserManager):
        self.browser = browser

    async def check(self, page: Page | None = None) -> AuthStatus:
        if page is None:
            page = await self.browser.open_portal()
        try:
            ok = await self.browser.session_looks_authenticated(page)
            reason = "authenticated-session" if ok else "login-required-or-unknown"
            return AuthStatus(ok, time.time(), page.url, reason, str(self.browser.profile_path))
        except Exception as exc:
            return AuthStatus(False, time.time(), page.url if page else None, f"check-error:{type(exc).__name__}", str(self.browser.profile_path))

    async def wait_for_user(self, timeout: int) -> AuthStatus:
        page = await self.browser.open_portal()
        ok = await self.browser.wait_for_manual_login(page, timeout)
        return await self.check(page) if ok else AuthStatus(False, time.time(), page.url, "manual-login-timeout", str(self.browser.profile_path))

    async def invalidate_local_session(self) -> None:
        """Clear cookies/storage only in this engine profile; never touches system browser data."""
        if self.browser.context:
            await self.browser.context.clear_cookies()
            for page in self.browser.context.pages:
                try:
                    await page.evaluate("localStorage.clear(); sessionStorage.clear();")
                except Exception:
                    pass
