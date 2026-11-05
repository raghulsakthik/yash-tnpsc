from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


@dataclass(frozen=True)
class DocumentText:
    text: str
    method: str
    page_count: int | None
    pages_examined: int
    warnings: tuple[str, ...] = ()


def _page_count(path: Path) -> int | None:
    if not shutil.which("pdfinfo"):
        return None
    try:
        result = subprocess.run(
            ["pdfinfo", str(path)],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        for line in result.stdout.splitlines():
            if line.startswith("Pages:"):
                return int(line.split(":", 1)[1].strip())
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    return None


def extract_document_text(
    path: str | Path,
    *,
    max_pages: int = 12,
    ocr_pages: int = 4,
    timeout_seconds: int = 60,
) -> DocumentText:
    """Extract a bounded text sample for classification, not full ingestion.

    Native PDF text is preferred. OCR is a fallback for English scans only
    when English Tesseract data is installed. OCR output is always flagged for
    review; it is never treated as trusted MCQ or lesson content.
    """
    source = Path(path)
    if not source.is_file():
        return DocumentText("", "missing", None, 0, ("source-file-missing",))

    suffix = source.suffix.casefold()
    if suffix in {".txt", ".md", ".html", ".htm"}:
        try:
            text = source.read_text(encoding="utf-8", errors="replace")[:500_000]
            return DocumentText(text, "native_text", None, 1, ())
        except OSError as exc:
            return DocumentText("", "failed", None, 0, (f"read-error:{type(exc).__name__}",))

    if suffix != ".pdf":
        return DocumentText("", "unsupported", None, 0, ("unsupported-document-format",))

    page_count = _page_count(source)
    if not shutil.which("pdftotext"):
        return DocumentText("", "unavailable", page_count, 0, ("pdftotext-not-installed",))

    last_page = min(page_count or max_pages, max_pages)
    try:
        native = subprocess.run(
            ["pdftotext", "-f", "1", "-l", str(last_page), "-layout", str(source), "-"],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
        native_text = native.stdout or ""
    except (OSError, subprocess.TimeoutExpired) as exc:
        native_text = ""
        native_warning = f"pdftotext-error:{type(exc).__name__}"
    else:
        native_warning = "pdftotext-returned-error" if native.returncode else ""

    if len(re.sub(r"\s+", "", native_text)) >= 120:
        warnings = (native_warning,) if native_warning else ()
        return DocumentText(native_text[:500_000], "native_text", page_count, last_page, warnings)

    warnings = ["native-text-insufficient"]
    if native_warning:
        warnings.append(native_warning)

    if not shutil.which("pdftoppm") or not shutil.which("tesseract"):
        warnings.append("ocr-tools-not-installed")
        return DocumentText(native_text, "native_text_low", page_count, last_page, tuple(warnings))

    try:
        langs = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        ).stdout
        if not re.search(r"(?m)^eng$", langs):
            warnings.append("english-ocr-language-data-missing")
            return DocumentText(native_text, "native_text_low", page_count, last_page, tuple(warnings))

        with tempfile.TemporaryDirectory(prefix="tnpsc-classify-") as tmp:
            prefix = Path(tmp) / "page"
            ocr_last = min(page_count or ocr_pages, ocr_pages)
            render = subprocess.run(
                ["pdftoppm", "-f", "1", "-l", str(ocr_last), "-r", "120", "-png", str(source), str(prefix)],
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
            if render.returncode:
                warnings.append("pdf-page-render-failed")
                return DocumentText(native_text, "native_text_low", page_count, last_page, tuple(warnings))

            images = sorted(Path(tmp).glob("page-*.png"))
            chunks = []
            for image in images:
                result = subprocess.run(
                    ["tesseract", str(image), "stdout", "-l", "eng"],
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    check=False,
                )
                if result.stdout:
                    chunks.append(result.stdout)
            ocr_text = "\n".join(chunks)
            if not ocr_text.strip():
                warnings.append("ocr-produced-no-text")
                return DocumentText(native_text, "native_text_low", page_count, last_page, tuple(warnings))
            warnings.append("ocr-output-requires-human-verification")
            warnings.append("tamil-ocr-language-data-not-installed")
            return DocumentText(ocr_text[:500_000], "ocr", page_count, len(images), tuple(warnings))
    except (OSError, subprocess.TimeoutExpired) as exc:
        warnings.append(f"ocr-error:{type(exc).__name__}")
        return DocumentText(native_text, "native_text_low", page_count, last_page, tuple(warnings))
