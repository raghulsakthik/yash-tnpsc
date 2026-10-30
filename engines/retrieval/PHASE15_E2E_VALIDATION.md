# Phase 15 — End-to-End Portal Validation

**Date:** 2026-10-28
**Portal:** https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_home
**Scope:** TNPSC Group II / Group IIA discovery and classification

## Result

**PARTIAL PASS — public portal discovery works; authenticated VLE session is not currently active in the engine profile.**

## Validation matrix

| Check | Result | Details |
|---|---|---|
| Portal reachable | PASS | Real Tamil Nadu Career Services portal opened successfully |
| Browser persistent profile | PASS | Existing engine profile launched with system Chrome |
| Authenticated session | FAIL | Portal redirected to the public home page; no authenticated session markers were present |
| Public portal content | PASS | Home page exposed navigation, question papers, syllabus, mock-test and course links |
| Portal discovery | PASS | 137 relevant links discovered in bounded crawl |
| Group II / IIA discovery | PASS | 31 Group II / IIA resources identified |
| Official question-paper URLs | PASS | Direct official PDFs were exposed under `/asset/docs/question_papers/TNPSC_Group_II_and_IIA/` |
| Classification | PASS | Direct Group II/IIA PDFs classify as `question_paper` |
| Uncontrolled bulk download | NOT RUN | Blocked intentionally because disk has only ~5.5 GB free |

## Important discovery

The official portal publicly exposes a large set of Group II / IIA question papers, including years from 2011 onward and newer 2024/2025 material. The engine can now detect the underscore/hyphen URL naming used by the portal.

Examples discovered include:

- 2011 — Gk and General English
- 2011 — Gk with General Tamil
- 2012 — General English / General Knowledge / General Tamil
- 2013 — General Studies / General English / General Tamil
- 2015 — General Studies / General English / General Tamil / Mains
- 2016-IIA — General Studies / General English / General Tamil
- 2017-IIA — General Studies / General English / General Tamil
- 2022 — General Studies / General English / General Tamil
- 2023 — Paper I Tamil Eligibility Test / Paper II General Studies
- 2024 — TNPSC Group II Prelims
- 2025 — TNPSC Group IIA Mains

## Code fixes made during Phase 15

1. Portal discovery now normalizes `_`, `-`, and `/` before keyword scoring, allowing paths such as `TNPSC_Group_II_and_IIA` to be detected.
2. Authentication detection no longer treats `/Vle_candidate/vle_home` alone as proof of login. The engine now requires authenticated-page markers and correctly reports the current redirected public page as unauthenticated.
3. Resource classification now recognizes `question_paper`, `question_papers`, and `question-papers` URL/path forms, so official PDF question papers are classified correctly.

## Safety

No credentials were stored or handled. No CAPTCHA, DRM, access-control, or authentication bypass was attempted. No bulk download was performed during this validation.

## Next action

Before Phase 16 automatic startup and production hardening, the browser profile should be manually logged into the VLE portal once. The engine can then re-run the authenticated validation and inspect candidate-only courses, lessons, materials, MCQs, and mock-test resources available behind the login.
