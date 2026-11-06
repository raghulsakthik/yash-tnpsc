# OCR deployment setup

The retrieval classifier uses Tesseract plus Poppler (`pdftotext`, `pdftoppm`). It never treats OCR or partial extraction as publication-ready; the admin review gate remains mandatory.

## Language data

- English requires `eng.traineddata`.
- Tamil requires `tam.traineddata`.
- Do not use English OCR as a fallback for a document classified as Tamil.
- Set `TNPSC_TESSDATA_DIR` to a directory containing the trained data files required by the deployment. The extractor passes this directory explicitly to Tesseract.
- If no override is configured, Tesseract uses its normal system data directory.

For a Debian/Kali host with administrator approval, install the system packages `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-tam`, `poppler-utils`, then verify `tesseract --list-langs` lists both `eng` and `tam`. For containers, add the packages to the image build rather than installing them at runtime. Do not commit traineddata binaries or local absolute paths to the repository.

The current connected development host has `eng` and `osd` only. The Tamil package is available from its configured apt repository but has not been installed because this session does not have administrator privileges. Tamil scanned PDFs must therefore remain low-confidence and review-required.

## Gemini provider smoke test

The application reads `GEMINI_API_KEY` from the server process environment. Never put the key in source control, browser code, test fixtures, or logs. Configure it in the local server secret store or the deployment's encrypted environment-variable settings, then run:

```bash
npm run check:gemini
```

The script sends a minimal JSON-generation request, validates the response shape, and never prints the key. Exit code 2 means the key is missing; exit code 1 means the provider call or response validation failed.

The current connected environment has no `GEMINI_API_KEY` configured, so a real provider call has not been attempted.
