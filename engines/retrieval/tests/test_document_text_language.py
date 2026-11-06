import unittest

from app.engine.extract.document_text import _select_ocr_language


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


if __name__ == '__main__':
    unittest.main()
