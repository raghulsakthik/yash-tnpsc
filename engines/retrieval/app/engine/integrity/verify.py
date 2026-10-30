from __future__ import annotations
import hashlib
from pathlib import Path

def sha256_file(path: str | Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        while chunk := f.read(chunk_size): h.update(chunk)
    return h.hexdigest()

def verify(path: str | Path, expected_sha256: str | None = None, expected_size: int | None = None) -> dict:
    p=Path(path); actual=p.stat().st_size
    digest=sha256_file(p)
    return {'ok': (expected_size is None or actual==expected_size) and (expected_sha256 is None or digest.lower()==expected_sha256.lower()), 'size':actual, 'sha256':digest}
