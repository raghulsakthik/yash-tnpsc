# Tamil and English OCR Runtime Smoke Test — 2026-11-07

## Environment preparation

- Kept the system Tesseract installation unchanged; no administrator privileges were required.
- Created a user-managed trained-data directory outside the repository and configured it with `TNPSC_TESSDATA_DIR`.
- Added `tam.traineddata` from the upstream `tesseract-ocr/tessdata_fast` repository and copied the machine's existing `eng.traineddata` into the same managed directory.
- Confirmed Tesseract lists both `eng` and `tam` when pointed at that directory.
- Installed `pytest` into the temporary retrieval test virtual environment only. No application dependency or lockfile changed.

## Real document extraction

Both source files are locally available official TNPSC Group 2A 2025 prelims papers. The smoke test deliberately used the existing bounded classifier extraction settings (`max_pages=12`, `ocr_pages=2`); it did not attempt a full 136-page OCR ingestion.

| Source | Language hint | Extractor method | PDF pages | OCR pages examined | Extracted chars | Review warning |
|---|---|---:|---:|---:|---:|---|
| `group2a-2025-prelims-gt-gs.pdf` | `ta` | OCR | 136 | 2 | 3,080 | `ocr-output-requires-human-verification` |
| `group2a-2025-prelims-ge-gs.pdf` | `en` | OCR | 136 | 2 | 2,723 | `ocr-output-requires-human-verification` |

The Tamil output contained recognizable Tamil script and the paper heading/instructions. The English output contained the English question-booklet heading and section names. OCR quality is not certified by this smoke test; both outputs remain review-required and partial by design.

## Verification

- Retrieval Python tests: **33 passed**.
- Node test suite: **415 passed, 0 failed** (same working tree; rerun after OCR data setup was not needed because only external test/runtime data was added).
- Gemini live provider smoke test: **SKIPPED** because `GEMINI_API_KEY` is not configured in the local server environment.
- No bulk import, content commit, approval, or publication was performed.

## Runtime configuration

For this machine's local retrieval runtime, set:

```bash
export TNPSC_TESSDATA_DIR="$HOME/.local/share/tnpsc/tessdata"
```

For a deployed retrieval service, provision both `eng.traineddata` and `tam.traineddata` in a managed directory and set `TNPSC_TESSDATA_DIR` in that service's environment. Do not commit trained-data binaries or machine-specific paths.

## Remaining gate

Configure `GEMINI_API_KEY` as a server-side secret (local `.env.local` or Vercel encrypted environment variable), then run `npm run check:gemini`. Only after that succeeds should multi-page model classification be exercised. Full-document ingestion still requires page coverage checks, source-page fidelity, answer-key verification, topic mapping, and human approval before learner publication.
