# Phase 13 — Web / Android Integration & Feature-Parity Matrix

## Canonical rule
The Web and Android clients are two renderers over one NOVA backend. The server owns authentication, learner identity, curriculum state, adaptive decisions, question correctness, scoring, interventions, PYQ provenance and content governance.

## Correction (2026-11-06)
Earlier versions of this doc described the Android client as a native Kotlin/Jetpack Compose app (Gradle/JDK build notes, a `MainActivity`/Compose render path). **That was never true of the code in this repository** — there is no `.kt` source anywhere in it. The real Android client is `.nova-zip-ui/src/android-app` (React/TypeScript), wrapped for the device via Capacitor (`.nova-zip-ui/android/`, whose only native file is a boilerplate `MainActivity.java` WebView loader). It shares its data layer (`src/hooks/useAppData.ts`, `src/api/novaApi.ts`) with the desktop/browser entry point (`src/App.tsx`) — same real backend calls, same write-paths — and renders its own Android-specific presentation (`AndroidAppShell` + phone chrome) on top.

This correction followed a full line-by-line audit (`docs/ANDROID_BACKEND_WIRING_AUDIT.md`) that traced every Android screen back to either a real `/api/*` call or component-local/hardcoded data, verified live against production. The matrix below reflects that audit's findings, not the pre-2026-11 assumptions.

| Capability | Web | Android | Canonical backend | Status |
|---|---|---|---|---|
| Authentication/session | ✅ | ✅ | `/api/auth/*` | Integrated |
| Onboarding preferences | ✅ | ✅ | `/api/onboarding/preferences` | Integrated — shared `OnboardingModal` component, real write on both platforms |
| Placement quiz | ✅ | ❌ | `/api/onboarding/placement-quiz` | Not implemented on Android — `OnboardingModal` only collects self-reported preferences; no diagnostic-quiz UI exists in `android-app/` and nothing calls this endpoint from there |
| Dashboard | ✅ | ✅ | `/api/dashboard` | Integrated |
| Curriculum | ✅ | Partial | `/api/curriculum*` | `curriculumTree`/`activeCurriculum`/`curriculumProgress` are fetched into state on Android but have no dedicated screen; the Journey tab surfaces phase/week derived from `/api/dashboard` instead (see Fixed section) |
| Daily adaptive plan | ✅ | ✅ | `/api/plan/today` | Integrated |
| Lesson | ✅ | Partial | `/api/lesson/*` | Lesson *content* for a topic (`novaApi.lesson`) is never called anywhere in `android-app/` — lesson progress is tracked (see Fixed section) but the raw lesson text/example view doesn't exist as an Android screen |
| AI alternate explanation | ✅ | ❌ | `/api/lesson/*/explain` | Not implemented on Android — no reference to this endpoint anywhere in the Android client |
| Practice | ✅ | ✅ | `/api/questions/next`, `/api/attempts` | **Fixed 2026-11** ([PR #42](https://github.com/raghulsakthik/yash-tnpsc/pull/42)) — was grading entirely client-side with no call to `/api/attempts` at all; now real, verified live |
| Revision | ✅ | ❌ | `/api/revision/next` | Not implemented on Android — no reference to this endpoint anywhere in the Android client |
| Mistakes/remediation | ✅ | ✅ | `/api/mistakes/next`, `/api/attempts` | **Fixed 2026-11** (PR #42) — same client-side-grading issue as Practice; the "Practice & Clear" resolve flow now re-fetches the mistake as a live question and only clears it on a real correct answer |
| Quick Lab | ✅ | ✅ | `/api/quick-lab/*` | **Fixed 2026-11** (PR #42) — was two hardcoded 4-question banks (math/polity) baked into the component; now loads the real admin-configured mode list and generates/grades every question server-side. Note: the backend only has math-style generators — there is no "polity" mode server-side, so that bank is gone, not ported |
| PYQs | ✅ | ✅ | `/api/pyqs/*`, `/api/attempts`, `/api/bookmarks` | **Fixed 2026-11** (PR #42) — grading and bookmark-toggling were both local-only; both now call the real backend |
| Tests | ✅ | ✅ | `/api/tests/*` | Integrated — full flow (fetch/answer/submit) plus proctoring consent and recording, confirmed already wired before this round of fixes |
| Analytics | ✅ | ✅ | `/api/learning/analytics` | Integrated — subject mastery and weak-areas cards are driven by real analytics data |
| Readiness/probability | ✅ | ❌ | `/api/learning/readiness` | Not implemented on Android — no weekly-review or readiness screen exists in `android-app/` |
| Progress/calendar | ✅ | ✅ | `/api/progress/*` | Integrated |
| Notes | ✅ | ✅ | `/api/notes*` | Integrated |
| Study-time logging | ✅ | ✅ | `/api/progress/study-time` | Integrated |
| Bookmarks | ✅ | ✅ | `/api/bookmarks*` | Integrated |
| Notifications | ✅ | ✅ | `/api/notifications` | Integrated |
| Achievements | ✅ | ✅ | `/api/achievements` | Integrated — confirmed live: a real attempt during verification triggered a real `First Step` achievement unlock |
| Search | ✅ | ✅ | `/api/search`, `/api/questions/next` | **Fixed 2026-11** ([PR #49](https://github.com/raghulsakthik/yash-tnpsc/pull/49)) — the top-bar search input existed but `searchQuery` was never read back anywhere; now a debounced real search renders as a results dropdown, and selecting a topic starts a focused Practice session on it |
| Profile | ✅ | ✅ | `/api/profile` | Integrated |
| Push registration | ✅ | ✅ | `/api/push/*` | Integrated — FCM wiring confirmed live-ready: `google-services.json` is present in the Capacitor Android project and `FIREBASE_SERVICE_ACCOUNT_JSON` is set in Vercel production, so delivery is not blocked on external setup the way an earlier code comment claimed |
| Lesson/module manual completion | — | ✅ | `/api/curriculum/complete-chapter`, `/api/curriculum/complete-topic` | **Fixed 2026-11** ([PR #46](https://github.com/raghulsakthik/yash-tnpsc/pull/46), [PR #47](https://github.com/raghulsakthik/yash-tnpsc/pull/47)) — "Complete Module" and the lesson-complete checkbox were dead/local-only. The real per-unit completion endpoint (`/api/curriculum/complete`) is strictly sequential (current adaptive day only), so these two new endpoints are deliberate bypasses — chapter- and topic-scoped respectively — for completing content a learner has browsed into outside their current adaptive sequence, without disturbing that sequence |
| Admin: learner account deletion | ✅ | — | `/api/admin/learners/:id` | **New 2026-11** ([PR #43](https://github.com/raghulsakthik/yash-tnpsc/pull/43), [PR #44](https://github.com/raghulsakthik/yash-tnpsc/pull/44)) — there was previously no way to delete a STUDENT-role account at all (only admin accounts). Supports exact-email and email-prefix lookup plus deletion, scoped to `role = 'STUDENT'` only |
| Admin/content ingestion | Web/admin | Not a learner feature | `/api/admin/content/*` | Correctly server/admin scoped |
| Admin RBAC | Web/admin | Not a learner feature | `/api/admin/*` | Correctly server/admin scoped |

## Render coverage
The Android entry point (`android-app/App.tsx`) renders `AndroidAppShell` — a bottom-nav shell with tabs for Home/Today (today's adaptive queue, continue-learning card, subject mastery, weak areas, activity heatmap), Courses (structured chapter/lesson browse view), Practice (Practice/PYQ/Quick Lab/Mistakes sub-tabs), Journey (phase roadmap + today's queue), and Profile, plus modals for auth, onboarding, course detail, and notifications. An admin session instead renders the full `AdminPortal` (shared with web). Tests run as their own full-screen flow with proctoring.

Android UI is the shared React/TypeScript component tree under `.nova-zip-ui/src`, Capacitor-wrapped for the device — it is not required to copy the desktop web layout (and doesn't: it has its own Android-specific shell), but it is required to use the same real backend and write-paths, which `useAppData`/`novaApi` guarantee by construction since both entry points call the same hook.

## Release checks
- Web unit/smoke suite: 72/72 currently passing (unchanged by this correction).
- Android build: `npm run build:android` inside `.nova-zip-ui` (Vite, outputs `dist-android/`) — confirmed compiling cleanly as of the 2026-11 fixes. There is no Gradle/Kotlin/JDK toolchain to validate; the only native-side build is Capacitor's own `android/` project, which just packages the built web bundle into a WebView shell.
- `tsc --noEmit` across `.nova-zip-ui` must stay clean — this is the actual type-safety gate for both the web and Android entry points, since they share all data/hook code.
- Android release build must be run with an explicit HTTPS `apiBaseUrl` (`VITE_API_BASE_URL`) before release — see the comment at the top of `novaApi.ts`.
- Health/readiness endpoints are intentionally public so infrastructure probes do not require learner cookies.

## Verification method going forward
Every "Integrated" row in this matrix should be traceable to an actual `fetch`/`novaApi.*` call reached from a real component, not inferred from a comment or an earlier version of this doc — see `docs/ANDROID_BACKEND_WIRING_AUDIT.md` for the methodology and evidence used in the 2026-11 correction. When adding or fixing a feature, verify any destructive/mutating change against a disposable local Postgres before touching production, then re-verify live against production with a disposable test-learner account afterward, deleting it via `/api/admin/learners/:id` when done.
