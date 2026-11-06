import unittest
import os
from unittest.mock import patch

from app.engine.extract.document_text import _select_ocr_language, _tesseract_data_args


class OcrLanguageSelectionTests(unittest.TestCase):
    def test_tamil_scan_never_falls_back_to_english_ocr(self):
        language, warning = _select_ocr_language('ta', {'eng', 'osd'})
        self.assertIsNone(language)
        self.assertEqual(warning, 'tamil-ocr-language-data-missing')

    def test_tamil_scan_uses_tamil_data_when_installed(self):
        self.assertEqual(_select_ocr_language('ta', {'eng', 'tam'}), ('tam', None))

    def test_english_scan_uses_english_data(self):
        self.assertEqual(_select_ocr_language('en', {'eng', 'osd'}), ('eng', None))

    def test_missing_english_data_fails_closed(self):
        self.assertEqual(_select_ocr_language('en', {'osd'}), (None, 'english-ocr-language-data-missing'))

    def test_unknown_language_is_flagged_even_when_english_ocr_is_used(self):
        self.assertEqual(_select_ocr_language(None, {'eng', 'osd'}), ('eng', 'ocr-language-not-confirmed'))

    def test_configured_tessdata_directory_is_passed_to_tesseract(self):
        with patch.dict(os.environ, {'TNPSC_TESSDATA_DIR': '/usr/share/tesseract-ocr/5/tessdata'}):
            self.assertEqual(_tesseract_data_args(), ['--tessdata-dir', '/usr/share/tesseract-ocr/5/tessdata'])

    def test_missing_tessdata_override_uses_system_default(self):
        with patch.dict(os.environ, {'TNPSC_TESSDATA_DIR': '/tmp/does-not-exist'}):
            self.assertEqual(_tesseract_data_args(), [])


if __name__ == '__main__':
    unittest.main()


class ZipDocumentExtractionTests(unittest.TestCase):
    def test_zip_with_text_material_returns_bounded_reviewable_archive_text(self):
        import tempfile
        import zipfile
        from pathlib import Path
        from app.engine.extract.document_text import extract_document_text

        with tempfile.TemporaryDirectory() as tmp:
            archive_path = Path(tmp) / "course-materials.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("notes/topic.md", "Topic: Fundamental Rights\\nConstitutional protections and duties.")
                archive.writestr("ignored.bin", b"binary payload")
            result = extract_document_text(archive_path)
        self.assertEqual(result.method, "archive")
        self.assertIn("Fundamental Rights", result.text)
        self.assertIn("archive-extraction-requires-human-verification", result.warnings)

    def test_zip_with_no_supported_documents_is_not_silently_accepted(self):
        import tempfile
        import zipfile
        from pathlib import Path
        from app.engine.extract.document_text import extract_document_text

        with tempfile.TemporaryDirectory() as tmp:
            archive_path = Path(tmp) / "unsupported.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("payload.bin", b"not a document")
            result = extract_document_text(archive_path)
        self.assertEqual(result.method, "unsupported")
        self.assertIn("archive-has-no-supported-documents", result.warnings)

    def test_zip_rejects_archives_with_too_many_entries(self):
        import tempfile
        import zipfile
        from pathlib import Path
        from app.engine.extract.document_text import extract_document_text

        with tempfile.TemporaryDirectory() as tmp:
            archive_path = Path(tmp) / "too-many.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                for index in range(41):
                    archive.writestr(f"notes/{index}.txt", "short note")
            result = extract_document_text(archive_path)
        self.assertEqual(result.method, "failed")
        self.assertIn("archive-entry-limit-exceeded", result.warnings)

    def test_zip_rejects_excessive_declared_uncompressed_size(self):
        import tempfile
        import zipfile
        from pathlib import Path
        from app.engine.extract.document_text import extract_document_text

        with tempfile.TemporaryDirectory() as tmp:
            archive_path = Path(tmp) / "oversized.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("notes/oversized.txt", b"x" * (26 * 1024 * 1024))
            result = extract_document_text(archive_path)
        self.assertEqual(result.method, "failed")
        self.assertIn("archive-uncompressed-size-limit-exceeded", result.warnings)
