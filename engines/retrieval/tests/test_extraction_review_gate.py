import unittest
from types import SimpleNamespace

from app.engine.extract.review_gate import enforce_extraction_review


class ExtractionReviewGateTests(unittest.TestCase):
    def classification(self):
        return {"topic_id": "polity.fundamental-rights", "review_required": False, "reasons": ()}

    def extraction(self, method="native_text", page_count=8, pages_examined=8, warnings=()):
        return SimpleNamespace(method=method, page_count=page_count, pages_examined=pages_examined, warnings=warnings)

    def test_complete_native_text_can_keep_an_exact_mapping(self):
        result = enforce_extraction_review(self.classification(), self.extraction())
        self.assertFalse(result["review_required"])
        self.assertEqual(result["topic_id"], "polity.fundamental-rights")

    def test_ocr_always_requires_human_verification(self):
        result = enforce_extraction_review(self.classification(), self.extraction(method="ocr", pages_examined=2, page_count=100))
        self.assertTrue(result["review_required"])
        self.assertIn("ocr-content-requires-human-verification", result["reasons"])
        self.assertIn("partial-document-extraction-requires-human-verification", result["reasons"])

    def test_low_confidence_native_text_requires_human_verification(self):
        result = enforce_extraction_review(self.classification(), self.extraction(method="native_text_low"))
        self.assertTrue(result["review_required"])
        self.assertIn("low-confidence-extraction-requires-human-verification", result["reasons"])

    def test_page_limited_native_text_requires_human_verification(self):
        result = enforce_extraction_review(self.classification(), self.extraction(page_count=80, pages_examined=12))
        self.assertTrue(result["review_required"])
        self.assertIn("partial-document-extraction-requires-human-verification", result["reasons"])

    def test_extraction_warnings_force_review_even_when_native_text_exists(self):
        result = enforce_extraction_review(self.classification(), self.extraction(warnings=("native-text-insufficient", "tamil-ocr-language-data-not-installed")))
        self.assertTrue(result["review_required"])
        self.assertIn("extraction-warning:tamil-ocr-language-data-not-installed", result["reasons"])

    def test_existing_review_requirement_is_never_relaxed(self):
        classification = {"topic_id": "x", "review_required": True, "reasons": ("ambiguous-topic",)}
        result = enforce_extraction_review(classification, self.extraction())
        self.assertTrue(result["review_required"])
        self.assertIn("ambiguous-topic", result["reasons"])


if __name__ == "__main__":
    unittest.main()
