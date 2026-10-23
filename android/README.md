# NOVA — Android Client

Native Kotlin + Jetpack Compose client for the NOVA adaptive-learning platform. The Android client uses the **same canonical Next.js backend and PostgreSQL state** as Web; it does not maintain a separate learning engine or mobile backend.

## Current integration

- Secure session-cookie authentication with persistent CookieJar.
- Shared backend base URL through `BuildConfig.API_BASE_URL`.
- Login/logout/session restore.
- Home → server-selected adaptive daily plan.
- Learn → live subjects/topics/mastery.
- Practice → server-selected questions, attempts, hints and learner-state updates.
- Revision and mistake review.
- Lessons and alternate explanations.
- Journey/progress.
- Quick Lab → server challenge generation and server grading.
- Tests → create, answer, submit and result.
- PYQs → real source-year metadata and statistics.
- Bookmarks, notifications, achievements, mistakes, search and progress.
- Weekly review and readiness from live analytics.
- Milestones/profile from live learner data.
- FCM registration hooks and notification permission handling.
- Platform API contracts for dashboard, analytics, readiness, study time, notes, onboarding preferences, interventions and curriculum completion.

## Backend contract

Development emulator URL:

```text
http://10.0.2.2:3001/
```

This must not be changed for local Android emulator development.

Production release builds require an explicit deployed HTTPS API URL:

```bash
./gradlew assembleRelease -PapiBaseUrl=https://YOUR_PRODUCTION_API/
```

No production build silently falls back to the emulator URL.

## Build

```bash
./gradlew assembleDebug
```

Release:

```bash
./gradlew assembleRelease -PapiBaseUrl=https://YOUR_PRODUCTION_API/
```

## Feature-parity rule

Web and Android are considered compatible only when both clients use the same backend contracts for:

`auth → onboarding → dashboard → curriculum → adaptive plan → lesson → practice → revision → Quick Lab → PYQ → tests → analytics/readiness → progress → notifications → profile`.

UI may be native to each platform, but learner state, scoring, adaptive decisions, ownership, PYQ provenance and content governance remain server-side canonical.
