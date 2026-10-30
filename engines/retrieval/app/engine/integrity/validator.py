from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    mime_type: str
    reason: str | None = None
    size: int = 0

_SIGNATURES = (
    (b'%PDF-', 'application/pdf'),
    (b'PK\x03\x04', 'application/zip'),
    (b'\x1f\x8b\x08', 'application/gzip'),
    (b'\x89PNG\r\n\x1a\n', 'image/png'),
    (b'\xff\xd8\xff', 'image/jpeg'),
    (b'GIF87a', 'image/gif'),
    (b'GIF89a', 'image/gif'),
)


def _looks_html(head: bytes) -> bool:
    sample = head[:4096].lstrip().lower()
    return sample.startswith((b'<!doctype html', b'<html', b'<head', b'<body')) or b'<html' in sample[:512]


def validate_file(path: str | Path, expected_size: int | None = None, expected_mime: str | None = None) -> ValidationResult:
    p = Path(path)
    if not p.is_file():
        return ValidationResult(False, 'application/octet-stream', 'file-not-found')
    size = p.stat().st_size
    if size <= 0:
        return ValidationResult(False, 'application/octet-stream', 'empty-file', size)
    if expected_size is not None and size != expected_size:
        return ValidationResult(False, 'application/octet-stream', f'size-mismatch:{size}!={expected_size}', size)
    with p.open('rb') as f:
        head = f.read(4096)
    if _looks_html(head):
        return ValidationResult(False, 'text/html', 'html-content-received-instead-of-file', size)
    mime = 'application/octet-stream'
    for signature, detected in _SIGNATURES:
        if head.startswith(signature):
            mime = detected
            break
    else:
        try:
            head.decode('utf-8')
            mime = 'text/plain'
        except UnicodeDecodeError:
            pass
    if expected_mime and expected_mime != mime and not (expected_mime == 'application/octet-stream'):
        return ValidationResult(False, mime, f'mime-mismatch:{mime}!={expected_mime}', size)
    return ValidationResult(True, mime, size=size)
