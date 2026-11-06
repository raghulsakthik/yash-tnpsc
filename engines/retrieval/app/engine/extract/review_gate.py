from __future__ import annotations


def enforce_extraction_review(classification: dict, extraction) -> dict:
    """Fail closed when classification is based on partial or degraded text.

    Only complete, warning-free native extraction can retain an automatic
    classification decision. OCR, low-confidence extraction, warnings, and
    page-limited samples always require an administrator to verify the label.
    This is a preview gate; it never publishes or persists a resource.
    """
    result = dict(classification)
    reasons = list(result.get("reasons") or [])
    must_review = False

    if extraction.method == "ocr":
        reasons.append("ocr-content-requires-human-verification")
        must_review = True
    elif extraction.method != "native_text":
        reasons.append("low-confidence-extraction-requires-human-verification")
        must_review = True

    if extraction.page_count is not None and extraction.pages_examined < extraction.page_count:
        reasons.append("partial-document-extraction-requires-human-verification")
        must_review = True

    for warning in extraction.warnings:
        reasons.append(f"extraction-warning:{warning}")
        must_review = True

    if must_review:
        result["review_required"] = True
        result["reasons"] = tuple(dict.fromkeys(reasons))
    return result
