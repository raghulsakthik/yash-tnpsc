# Retrieval extraction and language-safety sample — 6 November 2026

## Sample method

A bounded, read-only sample was extracted from the local retrieval SQLite inventory. It selected the first six completed resources in each available resource type (three MCQ resources existed), for **27 files** total. Each PDF sample used at most 8 native-text pages and at most 2 OCR pages, with a 25-second per-command timeout. No retrieval metadata, platform rows, or learner content was modified.

## Results

| Resource type | Sampled | Native text | OCR |
|---|---:|---:|---:|
| Current affairs | 6 | 6 | 0 |
| MCQ | 3 | 3 | 0 |
| Mock tests | 6 | 6 | 0 |
| Question papers | 6 | 0 | 6 |
| Study material | 6 | 6 | 0 |
| **Total** | **27** | **21** | **6** |

The sampled study-material, mock-test, MCQ, and current-affairs PDFs had usable native text in the first examined pages. All six sampled official question papers required OCR; the bounded OCR sample returned only 2,620–4,051 characters from documents with 96–152 pages. Those are partial extracts, not complete question-paper conversions.

## Defects found and fixed

1. The resource preview only forced review for `ocr`; it could leave `native_text_low`, extraction warnings, or page-limited native text without a mandatory review flag. A conservative extraction review gate now requires human verification for OCR, low-confidence extraction, any extraction warning, and incomplete page coverage.
2. The OCR fallback previously always invoked English Tesseract and attached a Tamil-language-data warning even when the file was known to be Tamil. The extractor now accepts a language hint. Known Tamil scans use `tam` only when that language pack exists; if it is missing, extraction stops at `native_text_low` and does **not** run English OCR over Tamil pages.
3. Official TNPSC paper filename codes `GE` and `GT` were not mapped to English/Tamil language. The classifier now recognises these codes in a Group II/IIA prelims/mains paper context.
4. The resource preview now classifies the title first to obtain a language hint, extracts with that hint, then applies the final text-based course classification and extraction review gate.

## Real-file regression check

- `Group 2 2025 Prelims GE GS official.pdf` (resource 364): classified `en`; OCR fallback ran; output remained `review_required=true` with OCR and partial-document reasons.
- `Group 2 2025 Prelims GT GS official.pdf` (resource 365): classified `ta`; because `tam` is not installed, output remained `native_text_low` with only 8 native characters and `tamil-ocr-language-data-missing`; English OCR was not attempted; `review_required=true`.

## Automated verification

- Retrieval Python unit suite: **31 passed, 0 failed**.
- Added tests cover GE/GT detection, Tamil OCR fail-closed behavior, unknown-language warning, partial extraction, OCR review, low-confidence review, and preservation of existing review requirements.
- Python compilation of the changed API route and extraction modules: passed.

## Remaining constraints

- Tesseract `tam` language data is not installed. Tamil scanned PDFs remain unextractable automatically and must be held for a proper Tamil OCR installation or manual transcription.
- The 27-file sample is a bounded sample, not a full extraction audit of all 265 completed downloads.
- The preview examines only a limited number of pages. Partial extraction is now always review-required; it must not be treated as exhaustive content conversion.
- The production Next.js PDF extractor remains native-text-only. This change hardens the retrieval engine's `/discovery/classify-resource/{id}` preview path; it does not silently add OCR to the production upload service.
- No resource was published or attached to a learner topic by this audit.
