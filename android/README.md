# NOVA — Android

Native Kotlin + Jetpack Compose client for NOVA, mirroring the web prototype
(`src/app/proto` in the repo root) screen-for-screen from the same design
tokens — Fraunces for headings and numbers, Inter for body/UI, the exact
NOVA color palette. Like the web prototype, this is a **visual prototype only**:
every screen is driven by hardcoded mock data in `data/MockData.kt`, nothing
calls a network or persists anything.

## What's here

- `ui/theme/` — the NOVA design tokens as a Compose `MaterialTheme`
  (`Color.kt`, `Type.kt`, `Shape.kt`, `Theme.kt`). Actual Fraunces/Inter
  `.ttf` files are bundled under `app/src/main/res/font/`.
- `ui/components/` — shared primitives (`NovaCard`, `StatusBadge`,
  `NovaProgressBar`, `OptionRow`, `NovaStat`) so screens compose from the
  same building blocks rather than each hand-rolling styles.
- `navigation/NovaNavGraph.kt` — bottom navigation (Home / Learn / Practice /
  Journey / Profile) + the `NavHost` graph.
- `ui/screens/` — Home, Learn, Subject, Practice, Journey, Profile. (A
  starting slice, not all 26 web screens — see "What's not here yet" below.)
- `data/MockData.kt` — static fixtures mirroring
  `src/app/proto/_data/mock.js` on the web.

## Building

```bash
cd android
./gradlew assembleDebug
```

The debug APK lands at `app/build/outputs/apk/debug/app-debug.apk`. Open the
`android/` folder directly in Android Studio to run it on an emulator or
device — `./gradlew installDebug` with a connected device/emulator also
works from the command line.

`local.properties` (holding `sdk.dir`) is machine-specific and gitignored —
Android Studio generates it automatically on first open; from the command
line, create it yourself:

```
sdk.dir=/path/to/your/Android/sdk
```

## What's not here yet

This mirrors the native-foundation + design-system + navigation phases of
the project (Android Phases 1–3 in the architecture brief), plus a few key
screens proven out end-to-end (Home, Learn → Subject, Practice with working
answer selection, Journey's orbit visualization, Profile). The remaining 20
screens from the web prototype (Lesson, Quick Lab gameplay, PYQs, Tests,
Milestones, Weekly Review, Notifications, onboarding/placement, etc.),
offline-first storage (Room), and the adaptive engine wiring are not built
yet — same "static prototype first" approach as the web side, just not
finished across every screen.
