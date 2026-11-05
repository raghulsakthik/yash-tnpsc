# Android App — Backend Wiring Audit (2026-11-06)

Scope: the real Android client (`.nova-zip-ui`, Capacitor-wrapped React, built via
`npm run build:android` into the native shell under `.nova-zip-ui/android/`) —
every screen, button, slider and sub-view it renders, checked against whether
it actually calls the real backend (`/api/*`) or is still running on
component-local / hardcoded data.

Method: traced the real render tree from the entry point
([android-app/App.tsx](.nova-zip-ui/src/android-app/App.tsx)) through
[`useAppData()`](.nova-zip-ui/src/hooks/useAppData.ts) (the single data/handler
hook both the web and Android entry points share) and
[`novaApi`](.nova-zip-ui/src/api/novaApi.ts) (the real fetch layer, `credentials:
'include'`, hits `/api/*` on the real origin), then read every leaf component
under `android-app/components/` to see whether its data comes from props
traced back to a real API call, or is synthesized locally. No code was
assumed correct from comments alone — every "wired" verdict below traces to
an actual `fetch`/`novaApi.*` call or a prop that originates from one.

## Result summary

| Verdict | Count |
|---|---|
| ✅ Wired to real backend | 21 features |
| ⚠️ Partially wired (reads real data, write-path missing) | 3 features |
| ❌ Not wired — local/hardcoded only | 3 features |

## ✅ Wired to real backend (confirmed)

| Feature | Evidence |
|---|---|
| Login / Register | [AuthModal.tsx](.nova-zip-ui/src/android-app/components/AuthModal.tsx) calls `novaApi.login`/`novaApi.register` → `/api/auth/login`, `/api/auth/register` |
| Session / admin gate | `novaApi.me()` → `/api/auth/me`; drives `isAdminSession`, `AdminPortal` mount |
| Dashboard / profile | `novaApi.profile()`, `novaApi.dashboard()` → `/api/profile`, `/api/dashboard`, mapped via `mapProfile` |
| Today's adaptive plan | `novaApi.plan()` → `/api/plan/today`, mapped via `mapTodayUnits`; **completing** a unit calls `novaApi.completeCurriculumUnit` → `/api/curriculum/complete` |
| Launching a unit | `handleLaunchTodayUnit` calls `novaApi.startIntervention` → `/api/learning/interventions/start` |
| Courses / curriculum | `novaApi.courses()`, `curriculumTree()`, `activeCurriculum()`, `curriculumProgress()` — real `/api/courses`, `/api/curriculum/*` |
| Subject mastery / weak areas | `novaApi.analytics()` → `/api/learning/analytics`, mapped via `mapSubjects`/`mapWeakAreas` |
| Bookmarks | `BookmarksView` → `onToggleBookmark` → `novaApi.unbookmark`/local toggle → `/api/bookmarks` (DELETE/GET) |
| Notes | `NotesView` → `onAddNote`/`onDeleteNote` → `novaApi.addNote`/`deleteNote` → `/api/notes` |
| Notifications | `NotificationDrawer` → mark-read/clear → `novaApi.markNotificationRead` etc. → `/api/notifications/*` |
| Push registration (FCM) | [useFcmPush.ts](.nova-zip-ui/src/android-app/useFcmPush.ts) → `novaApi.registerFcmToken` → `/api/push/fcm/register`. **Verified live**: `google-services.json` is present in the Android project and `FIREBASE_SERVICE_ACCOUNT_JSON` is set in Vercel production — delivery is not blocked (an in-code comment claiming this needs "the project owner" is stale). |
| Supervised Tests | [TestsView.tsx](.nova-zip-ui/src/android-app/components/TestsView.tsx) fetches `/api/tests/:id`, posts answers to `/api/tests/:id/answers`, submits via `/api/tests/:id/submit` — real, end-to-end, including the proctoring consent/recording hook (`useProctoring`) |
| Resources / downloads | `novaApi.resources()` → `/api/resources`, download URL hits `/api/resources/:id/download` |
| Onboarding | `OnboardingModal` → `novaApi.saveOnboardingPreferences` → `/api/onboarding/preferences` |
| Profile edits | `ProfileModal` → `handleUpdateProfile` → `novaApi.updateProfile` → `PUT /api/profile` |
| Daily goal | `handleUpdateDailyGoal`/`handleLogGoalProgress` → `novaApi.saveOnboardingPreferences`/`logStudyTime` → real `/api/progress/study-time` |
| Activity heatmap | `dashboard.activity.heatmap` → `LearningActivityHeatmap` (real `/api/dashboard` data) |
| Admin Portal (all sections) | Separate audit already completed and shipped this session — Admins & Roles, Lessons CRUD, Review queue, Retrieval, Content processing all wired to real APIs (see prior PRs #36–#41 on `main`) |
| Logout | `novaApi.logout()` → `POST /api/auth/logout` |
| Calendar / progress | `novaApi.calendar()` → `/api/progress/calendar` |
| Achievements | `novaApi.achievements()` → `/api/achievements` |
| Tests list | `novaApi.tests()` → `/api/tests`, mapped via `mapTests` |

## ⚠️ Partially wired — reads are real, the write-path silently drops

| Feature | What's real | What's missing |
|---|---|---|
| **Lesson/module completion** (`CourseModal` → "mark lesson complete") | Lesson list comes from the real curriculum API (`buildCourseFromBackend`) | [`handleToggleLesson`](.nova-zip-ui/src/hooks/useAppData.ts:267) only mutates React state — it never calls any `/api/*` endpoint. Toggling a lesson "complete" in the UI is purely cosmetic and is lost on the next reload/relogin. |
| **XP** (`handleAddXp`, fired by every "+XP" toast across Practice/PYQ/Quick Lab/Mistakes) | — | Pure client-side counter; never persisted server-side. Reloading the app resets XP to whatever `/api/dashboard`'s `curriculum.progress.percentage` recomputes it to. |
| **Quick Lab stats** | `useAppData` already fetches `novaApi.quickLabStats()` into state | That state (`quickLabStats`) is never passed to `AndroidAppShell`/`QuickLabView` — see below, Quick Lab doesn't use it at all. |

## ❌ Not wired — confirmed local/hardcoded, no backend call anywhere in the path

### 1. Practice, PYQ, and Mistakes answer grading (`PracticeView`, `PYQView`, `MistakesView`)
The hook already has the correct real handlers —
[`handlePracticeAnswer`](.nova-zip-ui/src/hooks/useAppData.ts:395) and
[`handlePyqAnswer`](.nova-zip-ui/src/hooks/useAppData.ts:408), both correctly
POST to `/api/attempts` and return the server's correctness verdict — but
**`App.tsx` never passes them down**, and all three view components grade
answers themselves:
```ts
// PracticeView.tsx:28, PYQView.tsx:29/157 — identical pattern in all three
if (idx === currentQ.correctIndex) { ... }
```
Effect: every practice/PYQ/mistake attempt in the Android app is graded
entirely on-device from data already in memory. The server's `question`
table is never told the learner answered, so:
- the adaptive engine gets no signal (next question selection, spaced
  repetition, mastery recalculation never update),
- the `mistakes` list never actually resolves (nothing calls
  `/api/mistakes/next` again or updates the mistake row),
- streaks/accuracy shown on the dashboard on next load will look wrong
  because nothing was ever recorded.

This is the single highest-impact gap — it affects the three main learning
loops.

### 2. Quick Lab (`QuickLabView.tsx`)
Entirely self-contained: 4 hardcoded math questions + 4 hardcoded polity
questions live directly in the component
([lines 30–43](.nova-zip-ui/src/android-app/components/QuickLabView.tsx#L30-L43)),
never calls `novaApi.quickLabNext`/`quickLabModes`/`quickLabSubmit` even
though all three exist and work (confirmed via `novaApi.ts`). Every learner
sees the exact same 8 questions forever; nothing is submitted anywhere.

### 3. Journey tab (`JourneyView.tsx`)
`React.FC` with **no props at all** — a fully hardcoded 7-phase roadmap
(`Diagnostic Orientation` → ... ) with fabricated progress numbers (`100`,
`42`, `0`, ...) baked into the component. The real data this should render
(`curriculumProgress`, `activeCurriculum`, `dashboard.curriculum.phase`) is
already fetched by `useAppData` and sitting unused in state — it's simply
never passed to this view.

## Recommended fix order
1. **Practice/PYQ/Mistakes grading** — wire `onAnswer={handlePracticeAnswer}` /
   `handlePyqAnswer` through `AndroidAppShell` into the three views and use
   the server's verdict instead of local `correctIndex` comparison. Highest
   priority: this is the core adaptive-learning feedback loop.
2. **Quick Lab** — replace the hardcoded `mathDrill`/`polityDrill` arrays
   with `novaApi.quickLabNext(mode)` and submit via `novaApi.quickLabSubmit`.
3. **Journey tab** — pass `curriculumProgress`/`activeCurriculum`/`dashboard`
   into `JourneyView` and derive the phase list from real data instead of
   the hardcoded roadmap.
4. **Lesson completion / XP persistence** — decide the real backend contract
   (likely `/api/curriculum/complete` already covers "unit" completion; a
   lesson-level toggle may need its own endpoint or should be remapped onto
   existing curriculum units) and stop treating it as local-only state.
