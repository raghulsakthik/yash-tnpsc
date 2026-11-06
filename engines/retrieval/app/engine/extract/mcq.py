from __future__ import annotations

from dataclasses import dataclass, asdict
import hashlib
import re
from bs4 import BeautifulSoup


@dataclass(frozen=True)
class MCQ:
    question: str
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    option_e: str | None = None
    answer: str | None = None
    explanation: str | None = None
    source_page: int | None = None

    @property
    def fingerprint(self) -> str:
        values = [self.question, *(getattr(self, f"option_{key}") or "" for key in "abcde")]
        normalized = " ".join(" ".join(values).lower().split())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# Some scanned/OCR-derived PDFs render option B as the digit 8.
_OPT_INLINE = re.compile(r"(?<![A-Za-z0-9])(?:\(\s*([A-E8])\s*\)|\[\s*([A-E8])\s*\]|([A-E8])\s*[\).:])\s*", re.I)
_NUM = re.compile(r"^\s*(\d{1,4})[.)\-:'’]+\s+(.+)$")
_ANSWER = re.compile(r"^\s*(?:answer|ans|correct\s+option)\s*[:.-]\s*([A-E])(?:\s|$)", re.I)


class MCQExtractor:
    """Conservative question candidate extraction with page provenance.

    Extracted candidates are not publishable MCQs: an absent answer key remains
    null, OCR-corrupted text is preserved for review, and PYQ source detection
    is handled separately by the content ingestion boundary.
    """

    def extract_html(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        return self.extract_text(soup.get_text("\n"))

    @staticmethod
    def _normalize_option_label(label: str) -> str:
        return "B" if label.upper() == "8" else label.upper()

    def extract_text(self, text: str) -> list[dict]:
        out: list[dict] = []
        pages = (text or "").split("\f")
        for page_number, page_text in enumerate(pages, 1):
            lines = [re.sub(r"\s+", " ", line).strip() for line in page_text.splitlines() if line.strip()]
            i = 0
            while i < len(lines):
                match = _NUM.match(lines[i])
                if not match:
                    i += 1
                    continue

                question_number = int(match.group(1))
                question = match.group(2).strip()
                options: dict[str, str] = {}
                answer = None
                j = i + 1

                while j < len(lines):
                    answer_match = _ANSWER.match(lines[j])
                    if answer_match:
                        answer = answer_match.group(1).upper()
                        j += 1
                        break
                    option_matches = list(_OPT_INLINE.finditer(lines[j]))
                    if option_matches and (option_matches[0].start() == 0 or len(option_matches) >= 2):
                        for option_index, option_match in enumerate(option_matches):
                            raw_label = next((group for group in option_match.groups() if group), "")
                            label = self._normalize_option_label(raw_label)
                            value_end = option_matches[option_index + 1].start() if option_index + 1 < len(option_matches) else len(lines[j])
                            value = lines[j][option_match.end():value_end].strip()
                            if label not in options and value:
                                options[label] = value
                        j += 1
                        continue

                    next_question = _NUM.match(lines[j])
                    if next_question and options:
                        break

                    # Keep wrapped question text only until the first option.
                    if not options and len(question) < 4000:
                        question += " " + lines[j]
                    j += 1

                # Do not guess a correct answer from option ordering or content.
                explanation = None

                if len(options) >= 2 and question.strip():
                    item = MCQ(
                        question=question[:4000],
                        option_a=options.get("A"),
                        option_b=options.get("B"),
                        option_c=options.get("C"),
                        option_d=options.get("D"),
                        option_e=options.get("E"),
                        answer=answer,
                        explanation=explanation,
                        source_page=page_number,
                    )
                    payload = asdict(item)
                    payload["question_number"] = question_number
                    payload["answer_verified"] = answer is not None
                    payload["needs_review"] = answer is None or any(
                        not options.get(key) for key in "ABCDE" if key in options
                    )
                    out.append(payload)

                i = max(j, i + 1)
        return out

    def extract_file(self, path: str, *, max_pages: int | None = None) -> list[dict]:
        from pathlib import Path
        import shutil
        import subprocess

        source = Path(path)
        if source.suffix.lower() in {".html", ".htm"}:
            return self.extract_html(source.read_text(errors="replace"))
        if source.suffix.lower() == ".txt":
            return self.extract_text(source.read_text(errors="replace"))
        if source.suffix.lower() == ".pdf":
            if not shutil.which("pdftotext"):
                return []
            command = ["pdftotext", "-layout"]
            if max_pages is not None:
                command.extend(["-f", "1", "-l", str(max(1, min(100, max_pages)))])
            command.extend([str(source), "-"])
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=180,
            )
            return self.extract_text(result.stdout) if result.returncode == 0 else []
        return []
