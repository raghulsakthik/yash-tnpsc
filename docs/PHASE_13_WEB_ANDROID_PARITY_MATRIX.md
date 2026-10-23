# Phase 13 — Web / Android Integration & Feature-Parity Matrix

## Canonical rule
The Web and Android clients are two renderers over one NOVA backend. The server owns authentication, learner identity, curriculum state, adaptive decisions, question correctness, scoring, interventions, PYQ provenance and content governance.

| Capability | Web | Android | Canonical backend | Status |
|---|---|---|---|---|
| Authentication/session | ✅ | ✅ | `/api/auth/*` | Integrated |
| Onboarding preferences | ✅ | API contract | `/api/onboarding/preferences` | Contract complete |
| Placement quiz | ✅ | API contract | `/api/onboarding/placement-quiz` | Contract complete |
| Dashboard | ✅ | ✅ | `/api/dashboard` | Integrated |
| Curriculum | ✅ | API contract | `/api/curriculum*` | Contract complete |
| Daily adaptive plan | ✅ | ✅ | `/api/plan/today` | Integrated |
| Lesson | ✅ | ✅ | `/api/lesson/*` | Integrated |
| AI alternate explanation | ✅ | ✅ | `/api/lesson/*/explain` | Integrated |
| Practice | ✅ | ✅ | `/api/questions/next`, `/api/attempts` | Integrated |
| Revision | ✅ | ✅ | `/api/revision/next` | Integrated |
| Mistakes/remediation | ✅ | ✅ | `/api/mistakes/next`, interventions | Integrated |
| Quick Lab | ✅ | ✅ | `/api/quick-lab/*` | Integrated |
| PYQs | ✅ | ✅ | `/api/pyqs/*` | Integrated |
| Tests | ✅ | ✅ | `/api/tests/*` | Integrated |
| Analytics | ✅ | API contract | `/api/learning/analytics` | Contract complete |
| Readiness/probability | ✅ | API contract + weekly review | `/api/learning/readiness` | Integrated |
| Progress/calendar | ✅ | ✅ | `/api/progress/*` | Integrated |
| Notes | ✅ | API contract | `/api/notes*` | Contract complete |
| Study-time logging | ✅ | API contract | `/api/progress/study-time` | Contract complete |
| Bookmarks | ✅ | ✅ | `/api/bookmarks*` | Integrated |
| Notifications | ✅ | ✅ | `/api/notifications` | Integrated |
| Achievements | ✅ | ✅ | `/api/achievements` | Integrated |
| Search | ✅ | ✅ | `/api/search` | Integrated |
| Profile | ✅ | ✅ | `/api/profile` | Integrated |
| Push registration | Web/mobile | Android FCM | `/api/push/*` | Android hook present |
| Admin/content ingestion | Web/admin | Not a learner feature | `/api/admin/content/*` | Correctly server/admin scoped |
| Admin RBAC | Web/admin | Not a learner feature | `/api/admin/*` | Correctly server/admin scoped |

## Render coverage
Android navigation currently exposes Home, Learn, Practice, Journey, Profile and More, with routes for lessons, Quick Lab, tests, PYQs, bookmarks, notifications, achievements, mistakes, search, progress, weekly review and milestones.

Android UI uses native Compose rendering while retaining NOVA's visual tokens. It is not required to copy Web DOM structure; it is required to preserve behavior, state semantics, scoring and user outcomes.

## Release checks
- Web unit/smoke suite: 72/72 currently passing.
- Android debug compilation: passing with JDK 21.
- Production Web build: previously passing after Phase 12 environment fix.
- Android release build must be run with an explicit HTTPS `apiBaseUrl` before release.
- Emulator development URL remains `http://10.0.2.2:3001/`.
- Health/readiness endpoints are intentionally public so infrastructure probes do not require learner cookies.

## Local Android build note
The repository's Android Gradle configuration targets Java 17. The installed machine also has JDK 25; Gradle 8.9/this Android toolchain is not compatible with that JDK in this environment. Phase 13 validation therefore uses the installed JDK 21, which successfully builds the debug APK. The app code itself targets Java/Kotlin 17.
