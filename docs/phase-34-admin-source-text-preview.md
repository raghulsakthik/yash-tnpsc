# Phase 34 — Admin Source Text Preview

## Objective

Allow a content administrator to inspect extracted text from a retrieved TNPSC source in the browser before sending the document into the content-processing pipeline.

## Delivered

- Added a **Preview text** action to the existing Admin → TNPSC Source Library without replacing the existing layout or changing the analysis action.
- Added an authenticated Next.js preview route guarded by CONTENT_CREATE.
- The Next.js route proxies to the retrieval engine's existing classify-resource endpoint; no learner-facing route was added.
- Increased the returned review sample from 1,200 to at most 50,000 characters and added an explicit truncation flag.
- The preview displays extraction method, examined/total pages, extracted character count, warnings, classification details and the extracted text.
- Added an explicit human-review / not-published notice. Previewing does not create a processing batch, approve content, or publish anything.
- Kept the extraction bounded by the existing retrieval extractor limits. It is not represented as full-document ingestion.

## Validation

- Root Node suite: **415 passed, 0 failed**.
- Retrieval Python suite: **33 passed**.
- Next.js production build: **PASS**, including the admin retrieval page and authenticated preview API.
- Python syntax check and preview API JavaScript syntax check: PASS.
- git diff check: PASS.

## Live retrieval-engine validation

- The repository's old retrieval virtual environment had a stale interpreter path. A clean runtime environment was created under /tmp and installed from the existing requirements file; no repository dependency or lockfile changed.
- Started the retrieval engine bound to 127.0.0.1:8000 with the user-managed TNPSC_TESSDATA_DIR.
- Health endpoint: PASS. Inventory reported 265 complete resources, 200 blocked, 3 duplicate, 5 failed and 1 quarantined.
- Live preview endpoint for a retrieved Group 2A mock-test PDF: HTTP 200, native-text extraction, 12 of 16 pages examined, 50,849 extracted characters, 50,000-character preview, truncation correctly flagged, review_required true and published false.
- Live preview endpoint for the official 2025 Tamil Group 2 prelims GT paper: HTTP 200, OCR, 4 of 136 pages examined, 4,052 characters, Tamil script present, review_required true and published false.
- Live preview endpoint for the official 2025 English Group 2 prelims GE paper: HTTP 200, OCR, 4 of 136 pages examined, 4,091 characters, English booklet text present, review_required true and published false.

The engine is currently bound to localhost only. OCR remains review-required, and the preview is capped at 50,000 characters. The Next.js production build includes the authenticated proxy route; a browser-level authenticated request still requires the app's PostgreSQL service and a valid admin session.

## Safety boundary

This phase is inspection-only. It does not alter resource metadata, import extracted text into learner content, mark answer keys as verified, or publish lessons/MCQs. The existing human review and publication gates remain authoritative.
