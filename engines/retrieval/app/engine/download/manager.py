from __future__ import annotations
import asyncio, hashlib, os, shutil, time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse
import aiohttp

from app.config.settings import DATA_ROOT

MIN_FREE_BYTES = int(os.getenv('TNPSC_MIN_FREE_BYTES', str(2 * 1024**3)))
EMERGENCY_FREE_BYTES = int(os.getenv('TNPSC_EMERGENCY_FREE_BYTES', str(1 * 1024**3)))
CHUNK_SIZE = 1024 * 1024
MAX_REDIRECTS = 8
# A bare aiohttp client sends no User-Agent at all, which plenty of real
# sites (Wikipedia's REST API among them) reject outright with a 403
# rather than silently allow -- a sensible default descriptive UA fixes
# that for any source, not just the TN portal this engine was built for.
DEFAULT_USER_AGENT = 'tnpsc-material-engine/0.3 (+https://github.com/raghulsakthik/yash-tnpsc; educational content retrieval)'

@dataclass(frozen=True)
class DownloadResult:
    status: str
    url: str
    path: str | None
    bytes_downloaded: int
    total_bytes: int | None
    sha256: str | None
    error: str | None = None

class DiskSafetyError(RuntimeError): pass

class ResumableDownloader:
    def __init__(self, root: Path | None = None):
        self.root = Path(root or DATA_ROOT)
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def free_bytes(self) -> int:
        return shutil.disk_usage(self.root).free

    def ensure_space(self, expected_size: int | None = None) -> None:
        free = self.free_bytes()
        if free <= EMERGENCY_FREE_BYTES:
            raise DiskSafetyError(f'emergency disk stop: {free} bytes free')
        required = max(MIN_FREE_BYTES, (expected_size or 0) + MIN_FREE_BYTES)
        if free < required:
            raise DiskSafetyError(f'insufficient disk space: {free} free, {required} required')

    @staticmethod
    def safe_name(name: str) -> str:
        name = ''.join(c if c.isalnum() or c in ' ._-()[]' else '_' for c in name).strip(' .')
        return (name or 'download')[:180]

    async def download(self, url: str, destination: Path, expected_size: int | None = None, headers: dict | None = None) -> DownloadResult:
        if urlparse(url).scheme not in ('http', 'https'):
            return DownloadResult('blocked', url, None, 0, None, None, 'unsupported-url-scheme')
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        temp = destination.with_name(destination.name + '.part')
        async with self._lock:
            try:
                self.ensure_space(expected_size)
                offset = temp.stat().st_size if temp.exists() else 0
                timeout = aiohttp.ClientTimeout(total=None, connect=30, sock_read=60)
                session_headers = {'User-Agent': DEFAULT_USER_AGENT, **(headers or {})}
                async with aiohttp.ClientSession(timeout=timeout, headers=session_headers, raise_for_status=False) as session:
                    current = url
                    for _ in range(MAX_REDIRECTS + 1):
                        range_headers = {'Range': f'bytes={offset}-'} if offset else {}
                        async with session.get(current, headers=range_headers, allow_redirects=False) as r:
                            if r.status in (301,302,303,307,308):
                                location = r.headers.get('Location')
                                if not location: return DownloadResult('failed', url, None, offset, None, None, 'redirect-without-location')
                                current = str(__import__('urllib.parse', fromlist=['urljoin']).urljoin(current, location)); continue
                            if r.status == 416 and offset:
                                temp.unlink(missing_ok=True); offset = 0; continue
                            if r.status not in (200,206):
                                return DownloadResult('failed', url, None, offset, None, None, f'http-{r.status}')
                            if offset and r.status == 200:
                                offset = 0; temp.unlink(missing_ok=True)
                            total = None
                            if r.status == 206 and r.headers.get('Content-Range'):
                                try: total = int(r.headers['Content-Range'].split('/')[-1])
                                except ValueError: total = None
                            elif r.headers.get('Content-Length'):
                                total = offset + int(r.headers['Content-Length'])
                            mode = 'ab' if offset else 'wb'
                            downloaded = offset
                            hasher = hashlib.sha256()
                            if offset:
                                with temp.open('rb') as existing:
                                    while True:
                                        b = existing.read(CHUNK_SIZE)
                                        if not b: break
                                        hasher.update(b)
                            with temp.open(mode) as f:
                                async for chunk in r.content.iter_chunked(CHUNK_SIZE):
                                    self.ensure_space(len(chunk))
                                    f.write(chunk); downloaded += len(chunk); hasher.update(chunk)
                            if total is not None and downloaded != total:
                                return DownloadResult('failed', url, None, downloaded, total, None, 'incomplete-download')
                            os.replace(temp, destination)
                            return DownloadResult('complete', url, str(destination), downloaded, total, hasher.hexdigest())
                    return DownloadResult('failed', url, None, offset, None, None, 'too-many-redirects')
            except DiskSafetyError as e:
                return DownloadResult('blocked', url, None, temp.stat().st_size if temp.exists() else 0, None, None, str(e))
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as e:
                return DownloadResult('failed', url, None, temp.stat().st_size if temp.exists() else 0, None, None, f'{type(e).__name__}: {e}')
