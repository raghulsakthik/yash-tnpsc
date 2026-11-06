import unittest
from unittest.mock import patch, MagicMock
import tempfile
from pathlib import Path

from app.engine.extract.document_text import extract_document_text


def _fake_run(lang_output: str):
    """Builds a subprocess.run stand-in that routes by command name, so the
    real OCR-language-selection branch runs against a controlled
    `tesseract --list-langs` answer instead of whatever's actually
    installed on the machine running the test."""

    def run(cmd, **kwargs):
        result = MagicMock()
        result.returncode = 0
        if cmd[0] == "pdftotext":
            result.stdout = ""  # force the OCR fallback path
        elif cmd[0] == "pdftoppm":
            # No real page images produced -- the test only cares which
            # -l flag the subsequent tesseract call receives, not OCR text.
            result.stdout = ""
        elif cmd[:2] == ["tesseract", "--list-langs"]:
            result.stdout = lang_output
        elif cmd[0] == "tesseract":
            result.stdout = "irrelevant ocr text"
        else:
            result.stdout = ""
        return result

    return run


class DocumentTextTamilOcrTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.pdf_path = Path(self.tmpdir.name) / "sample.pdf"
        self.pdf_path.write_bytes(b"%PDF-1.4\n%fake")

    def tearDown(self):
        self.tmpdir.cleanup()

    @patch("app.engine.extract.document_text.shutil.which", return_value="/usr/bin/x")
    @patch("app.engine.extract.document_text.Path.glob")
    @patch("app.engine.extract.document_text.subprocess.run")
    def test_uses_combined_tamil_english_when_tamil_data_is_installed(self, mock_run, mock_glob, _mock_which):
        mock_run.side_effect = _fake_run("eng\ntam\nosd\n")
        mock_glob.return_value = [Path(self.tmpdir.name) / "page-1.png"]

        extract_document_text(self.pdf_path)

        tesseract_ocr_calls = [c for c in mock_run.call_args_list if c.args[0][0] == "tesseract" and c.args[0][1] != "--list-langs"]
        self.assertTrue(tesseract_ocr_calls, "expected at least one real OCR invocation")
        for call in tesseract_ocr_calls:
            cmd = call.args[0]
            self.assertIn("tam+eng", cmd, f"expected combined-language OCR, got: {cmd}")

    @patch("app.engine.extract.document_text.shutil.which", return_value="/usr/bin/x")
    @patch("app.engine.extract.document_text.Path.glob")
    @patch("app.engine.extract.document_text.subprocess.run")
    def test_falls_back_to_english_only_and_discloses_it_when_tamil_data_is_missing(self, mock_run, mock_glob, _mock_which):
        mock_run.side_effect = _fake_run("eng\nosd\n")
        mock_glob.return_value = [Path(self.tmpdir.name) / "page-1.png"]

        result = extract_document_text(self.pdf_path)

        tesseract_ocr_calls = [c for c in mock_run.call_args_list if c.args[0][0] == "tesseract" and c.args[0][1] != "--list-langs"]
        self.assertTrue(tesseract_ocr_calls)
        for call in tesseract_ocr_calls:
            cmd = call.args[0]
            self.assertIn("eng", cmd)
            self.assertNotIn("tam+eng", cmd, f"no Tamil data installed, should not request it: {cmd}")
        self.assertIn("tamil-ocr-language-data-not-installed", result.warnings)


if __name__ == "__main__":
    unittest.main()
