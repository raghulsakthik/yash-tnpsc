# Topic-level content coverage matrix — 6 November 2026

## Summary
- Syllabus topics: **353**
- Topics with authored questions: **29/353 (8.2%)**
- Authored questions: **597**
- Retrieval inventory (separate from learner publication): `{"resources_total":474,"resources_completed":265,"extracted_questions":0,"resource_statuses":{"blocked":200,"complete":265,"duplicate":3,"failed":5,"quarantined":1},"resource_types":{"current_affairs":47,"mcq":3,"mock_test":7,"question_paper":26,"study_material":391}}`
- Database snapshot: **{"connected":true,"topics":353,"topics_with_published_questions":29,"topics_with_published_lessons":24,"topics_with_published_resources":0,"published_questions":597,"draft_questions":0,"published_lessons":24,"draft_lessons":0,"published_resources":0,"draft_resources":0}**.
- Database counts describe only the DATABASE_URL target; they are not production counts unless the production database was explicitly supplied.

## Interpretation
- Zero authored questions means the topic has no authored question-bank coverage in the YAML source.
- English and Tamil are counted independently.
- Syllabus chapter `transcribed` means topic nodes exist; it does not prove learner notes or lessons exist.
- A topic only counts as lesson/note-covered after database-backed learner visibility confirms approved, published content.

## Outputs
- `docs/topic-content-coverage-2026-11-06.csv` — spreadsheet-ready per-topic matrix.
- `docs/topic-content-coverage-2026-11-06.json` — machine-readable matrix and limitations.
