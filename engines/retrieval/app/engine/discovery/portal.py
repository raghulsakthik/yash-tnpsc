from __future__ import annotations
from dataclasses import dataclass, asdict
from urllib.parse import urljoin, urlparse, urldefrag
from playwright.async_api import Page

@dataclass(frozen=True)
class DiscoveredLink:
    url: str
    text: str
    source_url: str
    kind: str = 'link'
    score: int = 0

class PortalDiscovery:
    ALLOWED_HOST = 'tamilnaducareerservices.tn.gov.in'
    TARGET_TERMS = ('tnpsc','group ii','group 2','group iia','group 2a','question','paper','mock','mcq','practice','study','material','syllabus','test','lesson')

    def _score(self, text: str, url: str) -> int:
        hay = f'{text} {url}'.lower()
        hay = hay.replace('_', ' ').replace('-', ' ').replace('/', ' ')
        return sum(1 for term in self.TARGET_TERMS if term in hay)

    def _normalize(self, source: str, href: str) -> str | None:
        if not href or href.startswith(('#','javascript:','mailto:','tel:')):
            return None
        u, _ = urldefrag(urljoin(source, href.strip()))
        p = urlparse(u)
        if p.scheme not in ('http','https') or p.netloc.lower() != self.ALLOWED_HOST:
            return None
        return u

    async def collect(self, page: Page) -> list[dict]:
        source = page.url
        rows, seen = [], set()
        for a in await page.locator('a[href]').all():
            try:
                href = await a.get_attribute('href')
                text = (await a.inner_text()).strip()
            except Exception:
                continue
            u = self._normalize(source, href or '')
            if not u or u in seen:
                continue
            seen.add(u)
            score = self._score(text, u)
            if score:
                rows.append(asdict(DiscoveredLink(u, text, source, 'target', score)))
        rows.sort(key=lambda x: (-x['score'], x['url']))
        return rows

    async def crawl(self, start_page: Page, max_pages: int = 25) -> list[dict]:
        queue = [start_page]
        visited, links = set(), {}
        while queue and len(visited) < max_pages:
            page = queue.pop(0)
            try:
                url = page.url
                if url in visited:
                    continue
                visited.add(url)
                for item in await self.collect(page):
                    links[item['url']] = item
                    if len(visited) + len(queue) < max_pages and item['score'] >= 2:
                        try:
                            child = await page.context.new_page()
                            await child.goto(item['url'], wait_until='commit', timeout=10000)
                            queue.append(child)
                        except Exception:
                            try:
                                await child.close()
                            except Exception:
                                pass
            finally:
                if page is not start_page:
                    try: await page.close()
                    except Exception: pass
        return sorted(links.values(), key=lambda x: (-x['score'], x['url']))
