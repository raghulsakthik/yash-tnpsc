# Phase 36 — Structural MCQ Detection

## Objective

Detect MCQ resources from the document's actual question-and-option structure, not only from filename keywords. This is important for Tamil and English model-question PDFs whose titles say "revision" rather than "MCQ".

## Delivered

- Added a conservative structural detector using numbered question lines and A–D option lines.
- Requires at least five numbered question lines, ten option lines, and at least two options per detected question before classifying a document as MCQ.
- Explicit mock-test and question-paper classification still takes precedence.
- Explicit study-note content without option structure remains study material.
- Detection is a content-kind classification only. It does not infer correct answers, create question-bank rows, assign a topic, or bypass review.

## Live resource validation

- Resource 397, "Group2A Quick Revision General Tamil.pdf": previously detected as other/other; now detected as mcq/mcq from 100 numbered question lines and 216 option lines across the extracted 9-page document.
- Resource 398, "Group2A Quick Revision General English.pdf": remains study_material/study_notes; the extracted sample contains notes and question prompts but no A–D option-line structure.
- Resource 397 remains review-required and topic-unmapped. No answers were inferred and no content was committed or published.

## Validation

- Retrieval Python tests: **40 passed**.
- Existing tests cover all 353 canonical syllabus topics, current-affairs false-positive suppression, archive safety limits, and the new MCQ/non-MCQ structural cases.
- Live retrieval endpoint returned the expected classifications for both actual source documents.
