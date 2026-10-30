from __future__ import annotations

from app.config.settings import BROWSER_HEADLESS, BROWSER_LOGIN_TIMEOUT, BROWSER_PROFILE
from .manager import BrowserManager


class BrowserService:
    def __init__(self) -> None:
        self.manager = BrowserManager(BROWSER_PROFILE, BROWSER_HEADLESS)

    async def status(self) -> dict:
        state = self.manager.state()
        return {
            "running": state.running,
            "context_ready": state.context_ready,
            "page_count": state.page_count,
            "profile_path": state.profile_path,
            "last_url": state.last_url,
            "browser_version": state.browser_version,
        }

    async def check_login(self) -> bool:
        page = await self.manager.open_portal()
        return await self.manager.session_looks_authenticated(page)

    async def login(self) -> bool:
        page = await self.manager.open_portal()
        return await self.manager.wait_for_manual_login(page, BROWSER_LOGIN_TIMEOUT)

    async def close(self) -> None:
        await self.manager.stop()


service = BrowserService()
