# Phase 35 — Safe Archive Extraction & Classifier Precision

## Objective

Make retrieved course bundles useful to the extraction and labeling pipeline without allowing broad, incidental text matches to create misleading syllabus labels.

## Delivered

- Added ZIP archive text extraction for PDF, TXT, Markdown and HTML entries.
- Archive processing is bounded: maximum 40 entries, 25 MiB declared uncompressed total, 8 MiB per entry, six pages per embedded PDF, two OCR pages per embedded PDF, and a 500,000-character aggregate text ceiling.
- Archive members are read in memory and never unpacked to filesystem paths, avoiding archive path traversal.
- Unsupported files are ignored; archives with no supported documents fail explicitly.
- Archive extraction is always review-required, even when the embedded files contain native text. OCR warnings are propagated.
- Added explicit tests for the 40-entry and 25 MiB uncompressed-size archive limits.
- Preview responses remain capped at 50,000 characters and now correctly flag when the archive extraction contains more text than the preview.
- Current-affairs resources no longer generate syllabus topic candidates from incidental body words. Exact title matches and explicit topic headings can still provide a candidate.
- Added unit tests for ZIP text extraction, unsupported archives, and current-affairs false-positive topic suppression.

## Live data validation

- Tested actual retrieved ZIP resource 432, a 20.2 MB Group II Government Study Materials archive.
- Extracted 72 pages from 175 total pages across embedded PDFs; aggregate text was 173,651 characters.
- Browser preview payload was correctly capped at 50,000 characters with preview_truncated=true.
- Classification remained review-required and unpublished. The resource was recognized as study material, but was marked out-of-curriculum because its source identifies Group II Mains while the configured canonical Mains curriculum is Group IIA; no unsupported curriculum mapping was invented.
- Re-tested two real daily current-affairs resources. Both remained General Studies supplemental resources with no spurious topic candidates.
- All preview responses remained published=false and review_required=true where applicable.

## Validation

- Retrieval Python tests: **38 passed**.
- Root Node tests and Next.js build were already green in Phase 34; this phase changes only retrieval Python code and tests.
- No retrieved resource metadata, learner content, answer keys, or publication states were modified.
- No bulk ingestion or publication was run.

## Remaining limitation

DOCX and other archive-contained formats are not yet extracted by this path. Group II Mains remains intentionally unmapped until a matching canonical syllabus is supplied. Human review is mandatory for all archive-derived content.
