from __future__ import annotations
import asyncio, time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from playwright.async_api import BrowserContext, Page, Playwright, async_playwright, TimeoutError as PlaywrightTimeoutError
from app.config.settings import BASE_URL, BROWSER_EXECUTABLE, DATA_ROOT

@dataclass(frozen=True)
class BrowserState:
    running: bool; context_ready: bool; page_count: int; profile_path: str
    last_url: Optional[str]; browser_version: Optional[str]

class BrowserManager:
    def __init__(self, profile_path: Path | None = None, headless: bool = False):
        self.profile_path=Path(profile_path or DATA_ROOT/'browser-profile'); self.headless=headless
        self.playwright=None; self.context=None; self._lock=asyncio.Lock(); self._browser_version=None

    async def start(self):
        async with self._lock:
            if self.context: return self.context
            self.profile_path.mkdir(parents=True,exist_ok=True)
            self.playwright=await async_playwright().start()
            try:
                kw=dict(user_data_dir=str(self.profile_path),headless=self.headless,accept_downloads=True,
                        viewport={'width':1440,'height':900},args=['--disable-dev-shm-usage'])
                if BROWSER_EXECUTABLE: kw['executable_path']=BROWSER_EXECUTABLE
                self.context=await self.playwright.chromium.launch_persistent_context(**kw)
                browser=self.context.pages[0].context.browser if self.context.pages else None
                self._browser_version=browser.version if browser else None
                return self.context
            except Exception:
                await self.playwright.stop(); self.playwright=None; self.context=None; raise

    async def stop(self):
        async with self._lock:
            if self.context:
                try: await self.context.close()
                finally: self.context=None
            if self.playwright:
                await self.playwright.stop(); self.playwright=None
            self._browser_version=None

    async def new_page(self,url=None,timeout=15000):
        context=await self.start(); page=await context.new_page()
        if url:
            try: await page.goto(url,wait_until='commit',timeout=timeout)
            except PlaywrightTimeoutError: pass
        return page

    async def open_portal(self,timeout=15000): return await self.new_page(BASE_URL,timeout)

    async def session_looks_authenticated(self,page=None):
        if page is None:
            if not self.context or not self.context.pages: return False
            page=self.context.pages[-1]
        try:
            url=page.url.lower()
            if any(x in url for x in ('login','signin','sign-in','auth')): return False
            pw=await page.locator('input[type="password"]').count()
            usr=await page.locator('input[name*="user" i],input[id*="user" i],input[type="email"]').count()
            if pw or usr: return False
            if await page.get_by_text('logout',exact=False).count(): return True
            # The public site can redirect an expired session back to `/`; the
            # URL alone is therefore not sufficient evidence of authentication.
            if 'vle_candidate' not in url or 'vle_home' not in url: return False
            body = (await page.locator('body').inner_text()).lower()
            return any(marker in body for marker in ('logout', 'dashboard', 'my courses', 'profile', 'welcome'))
        except Exception: return False

    async def wait_for_manual_login(self,page=None,timeout=300):
        if page is None: page=await self.open_portal()
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            if await self.session_looks_authenticated(page): return True
            await page.wait_for_timeout(2000)
        return False

    def state(self):
        pages=self.context.pages if self.context else []
        return BrowserState(self.context is not None,self.context is not None,len(pages),str(self.profile_path),pages[-1].url if pages else None,self._browser_version)
