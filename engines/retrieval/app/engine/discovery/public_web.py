from __future__ import annotations
from dataclasses import dataclass, asdict
from urllib.parse import urlparse, urldefrag
import re
import aiohttp
from bs4 import BeautifulSoup
from app.engine.classification.resource import ResourceClassifier
classifier=ResourceClassifier()

@dataclass(frozen=True)
class PublicResult:
    url: str
    title: str
    source_url: str
    score: int
    exam: str | None = None
    group_name: str | None = None
    resource_type: str | None = None
    subject: str | None = None

class PublicWebConnector:
    ALLOWED_SCHEMES = {'http','https'}
    BLOCKED_EXT = {'.exe','.apk','.dmg','.iso','.bin','.torrent'}
    TERMS = ('tnpsc','group ii','group 2','group iia','group 2a','previous year','question paper','pyq','mock test','mcq','practice','study material','syllabus')
    def normalize(self, url: str) -> str | None:
        try:
            u, _ = urldefrag(url.strip()); p=urlparse(u)
            if p.scheme not in self.ALLOWED_SCHEMES or not p.netloc: return None
            if any(p.path.lower().endswith(x) for x in self.BLOCKED_EXT): return None
            return u
        except Exception: return None
    def score(self, text: str, url: str) -> int:
        hay=f'{text} {url}'.lower()
        return sum(1 for t in self.TERMS if t in hay)
    async def fetch(self, session: aiohttp.ClientSession, url: str) -> str | None:
        try:
            async with session.get(url, allow_redirects=True) as r:
                if r.status != 200 or 'text/html' not in r.headers.get('content-type','').lower(): return None
                return await r.text(errors='replace')
        except (aiohttp.ClientError, TimeoutError): return None
    async def search(self, query: str, max_results: int = 20) -> list[dict]:
        # Uses public DuckDuckGo HTML results only; no authentication or bypassing.
        q=' '.join(query.split())
        endpoint='https://html.duckduckgo.com/html/'
        timeout=aiohttp.ClientTimeout(total=20)
        headers={'User-Agent':'TNPSC-Material-Engine/1.0 (local research client)'}
        out=[]; seen=set()
        async with aiohttp.ClientSession(timeout=timeout,headers=headers) as s:
            try:
                async with s.post(endpoint,data={'q':q},allow_redirects=True) as r:
                    if r.status != 200: return []
                    html=await r.text(errors='replace')
            except (aiohttp.ClientError, TimeoutError): return []
        soup=BeautifulSoup(html,'html.parser')
        for a in soup.select('a.result__a'):
            href=a.get('href'); url=self.normalize(href or '')
            if not url or url in seen: continue
            title=a.get_text(' ',strip=True); score=self.score(title,url)
            if score < 2: continue
            seen.add(url); c=classifier.classify(title,url)
            out.append(asdict(PublicResult(url,title,url,score,c.get('exam'),c.get('group_name'),c.get('resource_type'),c.get('subject'))))
            if len(out)>=max_results: break
        return out
