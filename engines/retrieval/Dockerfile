# Production image for the TNPSC retrieval engine. Needs a real Playwright
# Chromium (not just the Python package) and its system libs -- the
# official Playwright base image ships both, pinned to a known-good
# browser/driver pair instead of whatever "latest" resolves to at build time.
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

WORKDIR /app

# tesseract-ocr-tam is the real fix for TNPSC study material, which is
# routinely bilingual Tamil/English -- without it, document_text.py's OCR
# fallback (used whenever a PDF has no extractable native text layer, e.g.
# a scanned page) only ever had English language data available and fell
# back to an "OCR output requires human verification" + "Tamil OCR
# language data not installed" warning on every Tamil page instead of
# actually reading it.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-tam \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# BROWSER_EXECUTABLE is deliberately left unset here -- the engine falls
# back to Playwright's own managed Chromium (already installed by the base
# image) when it's unset. Setting TNPSC_BROWSER_HEADLESS=1 because a
# container has no display server for a headful browser.
ENV TNPSC_BROWSER_HEADLESS=1
ENV PYTHONUNBUFFERED=1

# Render's free web services provide no persistent disk -- this file and
# anything under data/ reset on every redeploy/restart. That's an accepted
# tradeoff for a free, admin-triggered status/discovery panel rather than
# an always-on worker; see docs/retrieval-engine-deploy.md for the
# upgrade path once persistence actually matters.
RUN mkdir -p data

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
