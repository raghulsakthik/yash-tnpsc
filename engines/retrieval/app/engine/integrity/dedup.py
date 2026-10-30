from __future__ import annotations
import hashlib
import os
from pathlib import Path
from app.db.repository import Repository


def sha256_file(path: str | Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def register_or_find_duplicate(repo: Repository, resource_id: int, path: str | Path) -> tuple[str, int | None]:
    p = Path(path)
    digest = sha256_file(p)
    size = p.stat().st_size
    with repo.db.connection() as c:
        row = c.execute('SELECT resource_id FROM content_hashes WHERE sha256=?', (digest,)).fetchone()
        if row and int(row['resource_id']) != resource_id:
            return digest, int(row['resource_id'])
        c.execute('INSERT INTO content_hashes(sha256,resource_id,size) VALUES(?,?,?) ON CONFLICT(sha256) DO UPDATE SET size=excluded.size', (digest, resource_id, size))
        return digest, None
