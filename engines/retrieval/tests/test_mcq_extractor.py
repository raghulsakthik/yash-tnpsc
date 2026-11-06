import unittest

from app.engine.extract.mcq import MCQExtractor


class MCQExtractorTests(unittest.TestCase):
    def setUp(self):
        self.extractor = MCQExtractor()

    def test_extracts_five_options_and_preserves_page_number(self):
        text = (
            "12. Which statement is correct?\n"
            "(A) First option\n"
            "(B) Second option\n"
            "(C) Third option\n"
            "(D) Fourth option\n"
            "(E) Answer not known\n"
            "\f"
            "13. Next question?\n"
            "(A) Alpha\n(B) Beta\n(C) Gamma\n(D) Delta\n"
        )
        items = self.extractor.extract_text(text)
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["option_e"], "Answer not known")
        self.assertEqual(items[0]["source_page"], 1)
        self.assertEqual(items[1]["source_page"], 2)

    def test_splits_multiple_options_printed_on_the_same_pdf_text_line(self):
        items = self.extractor.extract_text(
            "1. What is the SI unit of electric charge?\n"
            "(A) Ampere (B) Volt (C) Coulomb (D) Ohm\n"
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["option_a"], "Ampere")
        self.assertEqual(items[0]["option_b"], "Volt")
        self.assertEqual(items[0]["option_c"], "Coulomb")
        self.assertEqual(items[0]["option_d"], "Ohm")

    def test_normalizes_ocr_digit_eight_to_option_b(self):
        items = self.extractor.extract_text(
            "7. Question text?\n(A) Alpha\n(8) Beta\n(C) Gamma\n(D) Delta\n"
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["option_b"], "Beta")

    def test_never_invents_an_answer_when_no_answer_key_exists(self):
        items = self.extractor.extract_text(
            "1. Question?\n(A) Alpha\n(B) Beta\n(C) Gamma\n(D) Delta\n"
        )
        self.assertIsNone(items[0]["answer"])
        self.assertFalse(items[0]["answer_verified"])
        self.assertTrue(items[0]["needs_review"])

    def test_pdf_file_extraction_can_be_bounded_to_first_pages(self):
        import tempfile
        from pathlib import Path
        from types import SimpleNamespace
        from unittest.mock import patch
        import shutil
        import subprocess

        with tempfile.TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "sample.pdf"
            pdf.write_bytes(b"%PDF-test")
            with patch.object(shutil, "which", return_value="/usr/bin/pdftotext"), patch.object(
                subprocess,
                "run",
                return_value=SimpleNamespace(returncode=0, stdout="1. Question?\\n(A) One\\n(B) Two\\n"),
            ) as run:
                self.extractor.extract_file(str(pdf), max_pages=12)
        command = run.call_args.args[0]
        self.assertIn("-f", command)
        self.assertIn("1", command)
        self.assertIn("-l", command)
        self.assertIn("12", command)

    def test_reads_explicit_answer_marker(self):
        items = self.extractor.extract_text(
            "1. Question?\n(A) Alpha\n(B) Beta\n(C) Gamma\n(D) Delta\nAnswer: C\n"
        )
        self.assertEqual(items[0]["answer"], "C")
        self.assertTrue(items[0]["answer_verified"])


if __name__ == "__main__":
    unittest.main()
