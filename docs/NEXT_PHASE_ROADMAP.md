# YASH — Next Phase Roadmap

Date: 23 October 2026
Scope: frontend design/responsiveness, backend, production-readiness gaps, and
unused/dead code. Written after live-verifying login/register/dashboard on
production (`https://frontend-startup-c3cb19.vercel.app`) and auditing the
current codebase directly — every finding below was confirmed against real
code or a real running instance, not assumed.

---

## 1. Frontend — Design & Responsiveness

### 1.1 CRITICAL — the dashboard does not reflow below desktop width

The entire learner-facing dashboard (`src/app/page.js`) is a full-viewport
`<iframe src="/nova-ui/index.html">`. Verified live on production at three
breakpoints:

| Viewport | Result |
|---|---|
| 1280px (desktop) | Renders correctly |
| 768px (tablet) | Content renders at a fixed desktop-ish width and is clipped on the right; large blank margin |
| 375px (mobile) | Same — content occupies roughly the left 40% of the screen, rest is blank |

The nova-ui bundle (`.nova-zip-ui/`, a separate Vite/React app, Tailwind-based)
was built as a desktop mockup and never given a mobile-first pass. This is the
single biggest UX gap in the app today — most Indian exam-prep users are on
phones.

**Next phase work:**
- Add Tailwind responsive breakpoints (`sm:`/`md:`/`lg:`) to every nova-ui
  component — `Sidebar`, `Header`, `TopCards`, `CoursesView`, `TestsView`,
  `StructuredLessonPlayerModal`, etc. None currently branch on screen size.
- Decide whether the sidebar should collapse to a bottom nav or drawer below
  `md`. Right now it only has a hamburger toggle, and even collapsed, the
  main content area doesn't reflow to fill the freed width.
- Test every one of nova-ui's ~15 views (Today's Plan, Courses, Practice,
  Quick Lab, PYQs, Tests, Journey, Mistakes, Resources, Notifications,
  Profile, Bookmarks, Notes, Search) at 375px, 768px, 1024px, 1440px.
- The iframe wrapper itself (`src/app/page.js`) is fine — `width: 100%`,
  `height: 100vh` — the problem is entirely inside the nova-ui document.

### 1.2 Two frontends exist; the second is completely unreachable

There is a full, separate Next.js page-based UI under `src/app/` — `/courses`,
`/journey`, `/landing`, `/learn`, `/lesson/[topic]`, `/milestones`,
`/mistakes`, `/notifications`, `/onboarding`, `/placement`, `/practice`,
`/profile`, `/pyqs`, `/quick-lab`, `/revision`, `/search`, `/tests`,
`/weekly-review`, `/bookmarks` — roughly 19 routes, each a real page with its
own styling, each backend-wired.

Since `/` now renders only the nova-ui iframe, and nothing inside that iframe
links to any of these routes (nova-ui does its own in-memory view switching),
**these 19 pages are orphaned** — reachable only if someone types the exact
URL, never through normal navigation.

**Next phase decision needed (pick one, don't leave this ambiguous):**
- **(a) Delete them.** nova-ui is the real UI now; these are dead weight.
  Verify nothing (deep links in push notifications, emails, Android) points
  at them first.
- **(b) Keep them as the no-JS / low-bandwidth fallback** and actually link
  to them from somewhere (e.g. a "having trouble loading? use the simple
  version" link). This only makes sense if that's an intentional product
  decision, not an accident.
- **(c) Finish migrating their unique functionality into nova-ui** (if any
  exists there that nova-ui doesn't already cover) and then delete them.

Whichever is chosen, the current state — two complete frontends, only one of
which is reachable — should not persist into a "production complete" claim.

### 1.3 Dead frontend code found during this audit

- `.nova-zip-ui-original/` (6 MB) — a full duplicate snapshot of the nova-ui
  source tree, not imported or referenced by anything. Appears to be a
  before/after copy left over from whenever nova-ui was integrated. Safe to
  delete after confirming with whoever added it that nothing depends on it.
- `src/app/_components/dashboard/Dashboard.js` — a second, independent
  dashboard component (fetches `/api/dashboard` and `/api/plan/today`
  directly) that is not imported by any route. Likely an earlier dashboard
  implementation superseded by the nova-ui iframe. Delete or finish wiring
  it — not both existing silently.
- Section 1.2's 19 pages, if decision (a) above is taken.

### 1.4 Smaller frontend gaps (carried over from the earlier P0/P1 audit, still open)

- `/search` (the real Next.js page) is backend-wired and works, but nova-ui's
  own header search box only filters already-loaded course data client-side
  rather than calling `/api/search`.
- PYQ filters in nova-ui are a fixed year/subject list rather than driven by
  the real `/api/pyqs/years` / `/api/pyqs/topics` endpoints.
- Dark mode (`Light mode` toggle) has not been checked for contrast/legibility
  across all nova-ui views — only spot-checked incidentally during this
  session's testing.

---

## 2. Backend — What Exists (confirmed real, not audited as gaps)

For calibration: the backend is substantially ahead of the frontend. These
are real, working, verified-against-a-real-database systems, not claims:

- Auth: register/login/logout, server-side sessions (`app_user`/
  `user_session`), rate limiting, and (as of this session) real password
  reset with single-use expiring tokens.
- Adaptive engine: decision engine, daily plan selection, prerequisite graph,
  intervention tracking, mastery/retention modeling.
- Content: question bank (597 published questions across 44 topics),
  PYQ intelligence with real provenance (exam/year/paper/source page),
  admin content-ingestion pipeline (extract → classify → review → publish).
- Curriculum: a real day-by-day adaptive curriculum (`learning_phase` →
  `learning_week` → `learning_day` → `learning_unit`) with phase-gate
  milestones, now actually reachable from the frontend after this session's
  fixes (see §4).
- Analytics, exam readiness, test construction intelligence — all read real
  accumulated evidence, degrade honestly (never fabricate a number) when
  there's no evidence yet.
- Admin: user/role/permission management, subject-scoped RBAC, content
  review queue, support/report handling.
- Infra: health/readiness endpoints, rate-limit buckets, object storage
  abstraction (local dev / S3 production), distributed via Postgres.

---

## 3. NOT Production-Ready (confirmed gaps, prioritized)

### P0 — blocks a real production launch

1. **Object storage is not actually configured in production.** This
   session found and fixed a bug where *all* database routes were crashing
   because `env.mjs` eagerly required S3 credentials at import time — that's
   fixed (object storage failures are now scoped to only the features that
   use it), but **S3 itself still isn't configured**. Any feature that
   writes a real file — admin content-processing uploads, this session's
   new resource-download feature — will fail with "S3 object storage is not
   configured" until real `S3_BUCKET`/`S3_REGION`/`S3_ACCESS_KEY_ID`/
   `S3_SECRET_ACCESS_KEY` are set in Vercel. This needs a real decision:
   provision an S3 bucket (or R2/B2/other S3-compatible store) and add the
   credentials, or keep `OBJECT_STORAGE_MODE=local` and accept that uploaded
   files don't survive a serverless cold start/redeploy (not viable for
   real admin content uploads).
2. **Email is likely not configured.** `src/lib/email.mjs` requires
   `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`; without them, password-reset
   emails and engagement notifications silently fail to send (the
   forgot-password flow still works and creates a real token — the learner
   just never receives the email). Verify these are set in Vercel, or the
   whole password-reset feature this session built is unusable end-to-end.
3. **Frontend mobile responsiveness** (§1.1) — most real users will be on
   phones; the app is currently not usable there.
4. **The two-frontend situation** (§1.2) needs a decision before calling
   anything "complete" — an ambiguous, half-migrated frontend is itself a
   production-readiness risk (bugs could be fixed in the wrong one).

### P1 — should land before heavy real usage

5. **Test timing**: several in-app flows (noted in the original audit, and
   this session's own `StructuredLessonPlayerModal` rewrite fixed its two
   instances) send `timeTakenMs: 0` instead of real elapsed time. Worth a
   repo-wide grep for any remaining `timeTakenMs: 0` call sites.
6. **Content coverage**: only 4 of 23 syllabus units have been split into
   real topics; roughly 260 questions' worth of content still needs
   transcription into the real pipeline. The app is functionally complete
   but thin on content outside Aptitude/Polity.
7. **Android**: shared API contracts and major screens exist; authenticated
   multi-step E2E on a real emulator/device has not been completed per the
   Phase 13 docs.
8. **Browser E2E**: no automated Playwright/Cypress-style suite exists for
   the actual learner-facing click flows — this session's verification was
   manual (via browser automation), not a repeatable test suite. Worth
   building one now that the major P0 wiring gaps are closed, so regressions
   get caught automatically.
9. **No staging environment separate from production data.** Confirmed this
   session: Preview and Production Vercel environments share the exact same
   Neon database. Every PR preview deploy can read/write real production
   data. This should get its own database (or at minimum a branched Neon DB)
   before this becomes a team with more than one contributor.

### P2 — real but lower urgency

10. Phase 14's production-simulation script (`scripts/phase14-production-
    simulation.mjs`) needs deterministic env loading without manual
    `source .env` per its own docs — low risk, but worth fixing so CI/CD can
    run it unattended.
11. A few migration-numbering quirks remain cosmetic (gaps at V7-V9, V23-V24,
    V26, V43-V59 from this session's dedup work) — harmless, but worth a
    one-time "renumber everything to be contiguous" pass if it ever becomes
    confusing to a new contributor.

---

## 4. What This Session Actually Fixed (for context — not open items)

Recorded here so the next person doesn't re-discover these as "bugs":
dashboard blank-page (wrong asset paths), X-Frame-Options blocking the
app's own iframe, profile save/mistake-clear/forgot-password/resource-
download being local-only or fabricated, the lesson player's hardcoded
fake MCQ, `curriculum_subject` never being seeded (so Courses showed 0
subjects), and the production-wide 500 from eager S3 config validation.
All verified end-to-end against a real database, not just code-reviewed.

---

## 5. Suggested Order of Work

1. Decide and execute §1.2 (one frontend, not two) — this unblocks clean
   responsive work, since fixing responsiveness in a UI you're about to
   delete is wasted effort.
2. Mobile/tablet responsive pass on nova-ui (§1.1).
3. Configure real S3 + SMTP in production (§3.1, §3.2) — both are
   configuration, not code, and block real features that already exist.
4. Delete confirmed dead code (§1.3).
5. Build a real E2E suite (§3.8) before the content-coverage push (§3.6)
   widens the surface area further.
